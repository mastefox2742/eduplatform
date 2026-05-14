// ============================================================
// REPOSITORY FIREBASE - GESTION DES SOLUTIONS + RAG
// ============================================================
// Strategie de stockage et indexation pour la recherche vectorielle

import * as admin from "firebase-admin";
import {
  TeacherSolution,
  RAGContext,
  RetrievedSolution,
  ExerciseType,
  StudentSubmission,
} from "../types/ai.types";

// Firestore collections
const COLLECTIONS = {
  SOLUTIONS: "teacherSolutions",
  SOLUTION_CHUNKS: "solutionChunks",    // Chunks pour RAG granulaire
  EMBEDDINGS_INDEX: "embeddingsIndex",  // Index de vecteurs
  STUDENT_HISTORY: "studentHistory",
  EXERCISE_METADATA: "exercises",
} as const;

// -----------------------------------------------------------
// SCHEMA FIRESTORE - STRUCTURE DE STOCKAGE
// -----------------------------------------------------------
/*
  teacherSolutions/{solutionId}
    - id, exerciseId, courseId, subjectArea, gradeLevel
    - exerciseType, difficulty
    - correctAnswer, acceptedVariants[]
    - gradingRubric[] (sous-collection ou tableau)
    - commonMistakes[]
    - pedagogicalContext
    - hints[]: [{level:1, content, penalty}, {level:2...}, {level:3...}]
    - keywords[]
    - embeddingVector[]  <-- VECTEUR 768 dims (Gemini text-embedding-004)
    - createdAt, updatedAt, professorId

  solutionChunks/{chunkId}
    - solutionId (ref vers teacherSolutions)
    - chunkType: "rubric" | "context" | "mistakes" | "answer"
    - content: string (le texte du chunk)
    - embeddingVector[]
    - metadata: { exerciseId, courseId, subjectArea }

  Pourquoi chunks ?
  - Les vecteurs de chunks granulaires donnent une meilleure precision
  - On peut retrouver juste le critere pertinent, pas toute la solution
  - Permet la citation precise dans les corrections
*/

// -----------------------------------------------------------
// CLASSE PRINCIPALE DU REPOSITORY
// -----------------------------------------------------------
export class SolutionRepository {
  private db: FirebaseFirestore.Firestore;
  private embeddingService: EmbeddingService;

  constructor() {
    this.db = admin.firestore();
    this.embeddingService = new EmbeddingService();
  }

  // ---------------------------------------------------------
  // SAUVEGARDE D'UNE SOLUTION (avec indexation automatique)
  // ---------------------------------------------------------
  async saveSolution(solution: TeacherSolution): Promise<string> {
    const batch = this.db.batch();

    // 1. Generer l'embedding de la solution complete
    const solutionText = this.buildSolutionText(solution);
    const embedding = await this.embeddingService.generateEmbedding(solutionText);

    // 2. Sauvegarder la solution avec son vecteur
    const solutionRef = this.db.collection(COLLECTIONS.SOLUTIONS).doc(solution.id);
    batch.set(solutionRef, {
      ...solution,
      embeddingVector: embedding,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Creer les chunks granulaires et leurs embeddings
    const chunks = this.createChunks(solution);
    for (const chunk of chunks) {
      const chunkEmbedding = await this.embeddingService.generateEmbedding(chunk.content);
      const chunkRef = this.db.collection(COLLECTIONS.SOLUTION_CHUNKS).doc();
      batch.set(chunkRef, {
        ...chunk,
        embeddingVector: chunkEmbedding,
        solutionId: solution.id,
        exerciseId: solution.exerciseId,
        courseId: solution.courseId,
        subjectArea: solution.subjectArea,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`[SolutionRepository] Solution ${solution.id} indexee avec ${chunks.length} chunks`);
    return solution.id;
  }

  // ---------------------------------------------------------
  // RAG : RECUPERATION DES SOLUTIONS PERTINENTES
  // ---------------------------------------------------------
  async retrieveRelevantSolutions(
    submission: StudentSubmission,
    topK: number = 3,
    minimumScore: number = 0.7
  ): Promise<RAGContext> {
    const startTime = Date.now();

    // 1. Generer l'embedding de la question/reponse de l'eleve
    const queryText = `${submission.answer.raw} exercice type: ${submission.exerciseType}`;
    const queryEmbedding = await this.embeddingService.generateEmbedding(queryText);

    // 2. STRATEGIE HYBRIDE : Vector Search + Filtres Metadata
    // Etape A: Filtres stricts par metadata (exerciceId en priorite)
    const exactMatch = await this.getExactExerciseSolution(submission.exerciseId);
    if (exactMatch) {
      // Solution exacte trouvee : utiliser UNIQUEMENT celle-ci
      return this.buildExactMatchContext(exactMatch, queryEmbedding);
    }

    // Etape B: Si pas de correspondance exacte, recherche par similarite
    // (dans le meme cours et niveau)
    const candidates = await this.vectorSearch(
      queryEmbedding,
      submission.exerciseId,
      topK * 2 // On recupere plus pour filtrer ensuite
    );

    // 3. Filtrer par score de pertinence
    const relevant = candidates
      .filter((c) => c.relevanceScore >= minimumScore)
      .slice(0, topK);

    const contextTokenCount = this.estimateTokenCount(relevant);

    return {
      solutions: relevant,
      totalRelevanceScore: relevant.reduce((sum, r) => sum + r.relevanceScore, 0) / relevant.length,
      retrievalStrategy: exactMatch ? "EXACT_MATCH" : "VECTOR_SIMILARITY",
      contextTokenCount,
    };
  }

  // ---------------------------------------------------------
  // RECHERCHE EXACTE PAR ID D'EXERCICE
  // ---------------------------------------------------------
  private async getExactExerciseSolution(
    exerciseId: string
  ): Promise<TeacherSolution | null> {
    const snapshot = await this.db
      .collection(COLLECTIONS.SOLUTIONS)
      .where("exerciseId", "==", exerciseId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as TeacherSolution;
  }

  // ---------------------------------------------------------
  // RECHERCHE VECTORIELLE (Firebase avec extension ou manual)
  // ---------------------------------------------------------
  private async vectorSearch(
    queryEmbedding: number[],
    exerciseId: string,
    limit: number
  ): Promise<RetrievedSolution[]> {
    /*
      OPTION A : Firebase Vector Search Extension (recommande)
      Disponible via "firestore-vector-search" extension Firebase

      const results = await this.db
        .collection(COLLECTIONS.SOLUTION_CHUNKS)
        .findNearest("embeddingVector", queryEmbedding, {
          limit,
          distanceMeasure: "COSINE",
          distanceResultField: "vectorDistance",
        })
        .get();
    */

    // OPTION B : Calcul manuel de similarite cosinus (fallback)
    // En production : utiliser Vertex AI Vector Search ou Pinecone
    const allChunks = await this.db
      .collection(COLLECTIONS.SOLUTION_CHUNKS)
      .limit(500) // Limite pratique - en prod: utiliser index vectoriel
      .get();

    const scored: Array<{ solutionId: string; score: number; chunk: any }> = [];

    allChunks.docs.forEach((doc) => {
      const data = doc.data();
      if (data.embeddingVector) {
        const similarity = this.cosineSimilarity(queryEmbedding, data.embeddingVector);
        scored.push({
          solutionId: data.solutionId,
          score: similarity,
          chunk: data,
        });
      }
    });

    // Trier et grouper par solution
    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, limit);

    // Recuperer les solutions completes pour les chunks pertinents
    const solutionIds = [...new Set(topChunks.map((c) => c.solutionId))];
    const solutions = await Promise.all(
      solutionIds.map((id) =>
        this.db.collection(COLLECTIONS.SOLUTIONS).doc(id).get()
      )
    );

    return solutions
      .filter((s) => s.exists)
      .map((s) => {
        const solution = s.data() as TeacherSolution;
        const relevantChunks = topChunks
          .filter((c) => c.solutionId === s.id)
          .map((c) => c.chunk.content);
        const maxScore = Math.max(
          ...topChunks.filter((c) => c.solutionId === s.id).map((c) => c.score)
        );

        return {
          solutionId: s.id,
          relevanceScore: maxScore,
          content: solution,
          retrievedChunks: relevantChunks,
        } as RetrievedSolution;
      });
  }

  // ---------------------------------------------------------
  // CONSTRUCTION DU CONTEXTE POUR CORRESPONDANCE EXACTE
  // ---------------------------------------------------------
  private buildExactMatchContext(
    solution: TeacherSolution,
    queryEmbedding: number[]
  ): RAGContext {
    const solutionText = this.buildSolutionText(solution);

    return {
      solutions: [
        {
          solutionId: solution.id,
          relevanceScore: 1.0, // Correspondance parfaite
          content: solution,
          retrievedChunks: [solutionText],
        },
      ],
      totalRelevanceScore: 1.0,
      retrievalStrategy: "EXACT_MATCH",
      contextTokenCount: this.estimateTokenCount([]),
    };
  }

  // ---------------------------------------------------------
  // CREATION DES CHUNKS GRANULAIRES
  // ---------------------------------------------------------
  private createChunks(solution: TeacherSolution): Array<{
    chunkType: string;
    content: string;
  }> {
    const chunks: Array<{ chunkType: string; content: string }> = [];

    // Chunk 1: Reponse correcte + variantes
    chunks.push({
      chunkType: "answer",
      content: `Reponse correcte: ${
        Array.isArray(solution.correctAnswer)
          ? solution.correctAnswer.join(" | ")
          : solution.correctAnswer
      }
      Variantes acceptees: ${solution.acceptedVariants?.join(" | ") || "aucune"}`,
    });

    // Chunk 2: Contexte pedagogique
    chunks.push({
      chunkType: "context",
      content: `Contexte pedagogique: ${solution.pedagogicalContext}`,
    });

    // Chunk 3+: Un chunk par critere de notation
    solution.gradingRubric.forEach((criterion, index) => {
      chunks.push({
        chunkType: "rubric",
        content: `Critere ${index + 1}: ${criterion.description}
        Points: ${criterion.maxPoints}
        Guide d'evaluation: ${criterion.evaluationGuide}
        Mots-cles attendus: ${criterion.keywords?.join(", ") || ""}`,
      });
    });

    // Chunk 4: Erreurs communes (cle pour la correction pedagogique)
    if (solution.commonMistakes.length > 0) {
      chunks.push({
        chunkType: "mistakes",
        content: `Erreurs typiques:
        ${solution.commonMistakes
          .map(
            (m) =>
              `- Erreur: ${m.pattern} | Explication: ${m.explanation} | Comment orienter: ${m.pedagogicalHint}`
          )
          .join("\n")}`,
      });
    }

    return chunks;
  }

  // ---------------------------------------------------------
  // CONSTRUCTION DU TEXTE DE SOLUTION POUR EMBEDDING
  // ---------------------------------------------------------
  private buildSolutionText(solution: TeacherSolution): string {
    return `
      Matiere: ${solution.subjectArea} | Niveau: ${solution.gradeLevel}
      Type: ${solution.exerciseType} | Difficulte: ${solution.difficulty}
      Reponse: ${Array.isArray(solution.correctAnswer) ? solution.correctAnswer.join(", ") : solution.correctAnswer}
      Contexte: ${solution.pedagogicalContext}
      Criteres: ${solution.gradingRubric.map((r) => r.description).join(", ")}
      Mots-cles: ${solution.keywords.join(", ")}
    `.trim();
  }

  // ---------------------------------------------------------
  // SIMILARITE COSINUS (calcul vectoriel)
  // ---------------------------------------------------------
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private estimateTokenCount(solutions: RetrievedSolution[]): number {
    const text = solutions.map((s) => s.retrievedChunks.join(" ")).join(" ");
    return Math.ceil(text.length / 4); // ~4 chars per token
  }

  // ---------------------------------------------------------
  // RECUPERER L'HISTORIQUE D'UN ELEVE (pour analyse progression)
  // ---------------------------------------------------------
  async getStudentHistory(
    studentId: string,
    courseId: string,
    periodDays: number = 30
  ): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    const snapshot = await this.db
      .collection(COLLECTIONS.STUDENT_HISTORY)
      .where("studentId", "==", studentId)
      .where("courseId", "==", courseId)
      .where("submittedAt", ">=", cutoffDate)
      .orderBy("submittedAt", "asc")
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }
}

// -----------------------------------------------------------
// SERVICE D'EMBEDDING
// -----------------------------------------------------------
export class EmbeddingService {
  private apiKey: string;
  private provider: "gemini" | "openai";

  constructor() {
    this.apiKey = process.env.AI_API_KEY || "";
    this.provider = (process.env.AI_PROVIDER as "gemini" | "openai") || "gemini";
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (this.provider === "gemini") {
      return this.generateGeminiEmbedding(text);
    }
    return this.generateOpenAIEmbedding(text);
  }

  private async generateGeminiEmbedding(text: string): Promise<number[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_DOCUMENT",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.embedding.values as number[];
  }

  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small", // 1536 dims, rapide et economique
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI Embedding error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.data[0].embedding as number[];
  }
}
