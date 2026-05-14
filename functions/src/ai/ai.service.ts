// ============================================================
// SERVICE IA PRINCIPAL - ORCHESTRATEUR COMPLET
// ============================================================
// Centralise toutes les interactions avec l'IA (Gemini / GPT-4)
// Inclut correction, hints, analyse de progression

import * as admin from "firebase-admin";
import {
  AIGradingResult,
  AIServiceConfig,
  GeneratedHint,
  HintLevel,
  StudentProgressAnalysis,
  StudentSubmission,
  TeacherSolution,
} from "../types/ai.types";
import { SolutionRepository } from "../firebase/solution.repository";
import { PromptBuilder } from "./prompt.builder";
import { HallucinationGuard, JSONResponseValidator } from "./hallucination.guard";
import { ExerciseNormalizer } from "../utils/exercise.normalizer";

// -----------------------------------------------------------
// CONFIGURATION PAR DEFAUT
// -----------------------------------------------------------
const DEFAULT_CONFIG: AIServiceConfig = {
  provider: "gemini",
  model: "gemini-1.5-pro",
  temperature: 0.1,          // Tres bas pour minimiser hallucinations
  maxOutputTokens: 4096,
  topK: 3,                   // Recuperer 3 solutions RAG max
  minimumRelevanceScore: 0.65,
  enableHallucinationGuard: true,
};

// -----------------------------------------------------------
// CLIENTS API IA
// -----------------------------------------------------------
interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// -----------------------------------------------------------
// CLASSE PRINCIPALE DU SERVICE IA
// -----------------------------------------------------------
export class AIService {
  private config: AIServiceConfig;
  private solutionRepo: SolutionRepository;
  private promptBuilder: PromptBuilder;
  private hallucinationGuard: HallucinationGuard;
  private normalizer: ExerciseNormalizer;
  private db: FirebaseFirestore.Firestore;

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.solutionRepo = new SolutionRepository();
    this.promptBuilder = new PromptBuilder();
    this.hallucinationGuard = new HallucinationGuard();
    this.normalizer = new ExerciseNormalizer();
    this.db = admin.firestore();
  }

  // ===========================================================
  // FONCTION 1: CORRECTION D'EXERCICE
  // ===========================================================
  async gradeExercise(submission: StudentSubmission): Promise<AIGradingResult> {
    const startTime = Date.now();
    console.log(`[AIService] Debut correction exercice ${submission.exerciseId} pour eleve ${submission.studentId}`);

    // ETAPE 1: Normaliser la reponse selon le type d'exercice
    const normalizedSubmission = this.normalizer.normalizeSubmission(submission);

    // ETAPE 2: Recuperer les solutions pertinentes (RAG)
    const ragContext = await this.solutionRepo.retrieveRelevantSolutions(
      normalizedSubmission,
      this.config.topK,
      this.config.minimumRelevanceScore
    );

    // ETAPE 3: Verifier qu'on a un contexte suffisant (anti-hallucination)
    if (ragContext.solutions.length === 0 || ragContext.totalRelevanceScore < 0.5) {
      return this.buildInsufficientContextResult(submission, startTime);
    }

    // ETAPE 4: Construire le prompt avec contexte RAG
    const { systemPrompt, userPrompt } = this.promptBuilder.buildGradingPrompt(
      normalizedSubmission,
      ragContext
    );

    // ETAPE 5: Appeler l'IA
    const rawResponse = await this.callAI(systemPrompt, userPrompt);

    // ETAPE 6: Parser et valider la reponse JSON
    const parseResult = JSONResponseValidator.parseAndValidate<AIGradingResult>(
      rawResponse,
      ["totalScore", "earnedPoints", "maxPoints", "criteriaEvaluations", "globalFeedback"],
      "gradeExercise"
    );

    if (!parseResult.success) {
      console.error(`[AIService] Erreur parsing reponse: ${parseResult.error}`);
      return this.buildParseErrorResult(submission, parseResult.error, startTime);
    }

    // ETAPE 7: Construire le resultat complet
    const gradingResult: AIGradingResult = {
      ...parseResult.data,
      submissionId: submission.id,
      exerciseId: submission.exerciseId,
      studentId: submission.studentId,
      groundedInSolution: true,
      generatedAt: new Date(),
      modelUsed: this.config.model,
      processingTimeMs: Date.now() - startTime,
    };

    // ETAPE 8: Validation anti-hallucination
    if (this.config.enableHallucinationGuard) {
      const guardResult = await this.hallucinationGuard.validateGradingResult(
        gradingResult,
        ragContext,
        submission.answer.raw
      );

      if (!guardResult.passed) {
        console.warn(`[AIService] Hallucination detectee: ${guardResult.blockedReason}`);

        // Utiliser le resultat sanitise si disponible
        if (guardResult.sanitizedResult) {
          return {
            ...guardResult.sanitizedResult,
            processingTimeMs: Date.now() - startTime,
          };
        }

        return this.buildHallucinationBlockedResult(submission, guardResult.blockedReason!, startTime);
      }

      // Meme si passe, utiliser le sanitise si disponible (corrections mineures)
      if (guardResult.sanitizedResult) {
        return {
          ...guardResult.sanitizedResult,
          processingTimeMs: Date.now() - startTime,
        };
      }
    }

    // ETAPE 9: Sauvegarder le resultat dans Firebase
    await this.saveGradingResult(gradingResult);

    console.log(`[AIService] Correction terminee en ${Date.now() - startTime}ms, score: ${gradingResult.totalScore}`);
    return gradingResult;
  }

  // ===========================================================
  // FONCTION 2: GENERATION D'INDICE PROGRESSIF
  // ===========================================================
  async generateHint(
    submission: StudentSubmission,
    hintLevel: HintLevel
  ): Promise<GeneratedHint> {
    const startTime = Date.now();
    console.log(`[AIService] Generation indice niveau ${hintLevel} pour exercice ${submission.exerciseId}`);

    // Verifier que le niveau demande est valide
    const maxHintLevel = 3;
    if (hintLevel > maxHintLevel) {
      throw new Error(`Niveau d'indice maximum est ${maxHintLevel}`);
    }

    // Recuperer les solutions pertinentes (RAG)
    const ragContext = await this.solutionRepo.retrieveRelevantSolutions(
      submission,
      1, // 1 seule solution pour les indices (plus precis)
      this.config.minimumRelevanceScore
    );

    // Verifier disponibilite du contexte
    if (ragContext.solutions.length === 0) {
      throw new Error("Impossible de générer un indice sans solution de référence");
    }

    // Verifier si des indices pre-definis existent dans la solution
    const solution = ragContext.solutions[0].content;
    const predefinedHint = solution.hints?.find((h) => h.level === hintLevel);

    if (predefinedHint && ragContext.totalRelevanceScore >= 0.9) {
      // Solution exacte trouvee + indice pre-defini : utiliser directement
      console.log(`[AIService] Indice pre-defini utilise pour niveau ${hintLevel}`);
      return {
        level: hintLevel,
        content: predefinedHint.content,
        conceptRevealed: predefinedHint.revealedConcept,
        penaltyPercent: predefinedHint.penaltyPercent,
        remainingHints: maxHintLevel - hintLevel,
        warningMessage:
          hintLevel < maxHintLevel
            ? `Attention : l'indice suivant vous coûtera ${predefinedHint.penaltyPercent * 2}% de points supplémentaires`
            : undefined,
      };
    }

    // Sinon : generer dynamiquement avec l'IA
    const previousHints = await this.getPreviousHints(
      submission.studentId,
      submission.exerciseId
    );

    const { systemPrompt, userPrompt } = this.promptBuilder.buildHintPrompt(
      submission,
      ragContext,
      hintLevel,
      previousHints
    );

    const rawResponse = await this.callAI(systemPrompt, userPrompt);

    const parseResult = JSONResponseValidator.parseAndValidate<GeneratedHint>(
      rawResponse,
      ["level", "content", "conceptRevealed", "penaltyPercent"],
      "generateHint"
    );

    if (!parseResult.success) {
      throw new Error(`Erreur generation indice: ${parseResult.error}`);
    }

    const hint: GeneratedHint = {
      ...parseResult.data,
      remainingHints: maxHintLevel - hintLevel,
    };

    // Sauvegarder l'indice utilise
    await this.saveHintUsage(submission.studentId, submission.exerciseId, hint);

    console.log(`[AIService] Indice genere en ${Date.now() - startTime}ms`);
    return hint;
  }

  // ===========================================================
  // FONCTION 3: ANALYSE DE PROGRESSION DE L'ELEVE
  // ===========================================================
  async analyzeStudentProgress(
    studentId: string,
    courseId: string,
    periodDays: number = 30
  ): Promise<StudentProgressAnalysis> {
    const startTime = Date.now();
    console.log(`[AIService] Analyse progression eleve ${studentId} sur ${periodDays} jours`);

    // Recuperer l'historique de l'eleve
    const history = await this.solutionRepo.getStudentHistory(
      studentId,
      courseId,
      periodDays
    );

    if (history.length < 3) {
      return this.buildInsufficientDataAnalysis(studentId, courseId, periodDays, history.length);
    }

    // Recuperer les metadonnees du cours
    const courseMetadata = await this.getCourseMetadata(courseId);

    // Construire le prompt d'analyse
    const { systemPrompt, userPrompt } = this.promptBuilder.buildProgressAnalysisPrompt(
      studentId,
      history,
      courseMetadata
    );

    // Appeler l'IA (temperature un peu plus haute pour l'analyse)
    const rawResponse = await this.callAI(systemPrompt, userPrompt, 0.3);

    const parseResult = JSONResponseValidator.parseAndValidate<StudentProgressAnalysis>(
      rawResponse,
      [
        "overallScore",
        "masteryLevel",
        "conceptMastery",
        "strengthAreas",
        "weaknessAreas",
        "personalizedRecommendations",
      ],
      "analyzeProgress"
    );

    if (!parseResult.success) {
      throw new Error(`Erreur analyse progression: ${parseResult.error}`);
    }

    const analysis: StudentProgressAnalysis = {
      ...parseResult.data,
      studentId,
      courseId,
      periodDays,
      generatedAt: new Date(),
      dataPointsAnalyzed: history.length,
    };

    // Sauvegarder l'analyse
    await this.saveProgressAnalysis(analysis);

    console.log(`[AIService] Analyse terminee en ${Date.now() - startTime}ms`);
    return analysis;
  }

  // ===========================================================
  // APPEL AI UNIFIE (Gemini ou OpenAI)
  // ===========================================================
  private async callAI(
    systemPrompt: string,
    userPrompt: string,
    temperatureOverride?: number
  ): Promise<string> {
    const temperature = temperatureOverride ?? this.config.temperature;

    if (this.config.provider === "gemini") {
      return this.callGemini(systemPrompt, userPrompt, temperature);
    } else {
      return this.callOpenAI(systemPrompt, userPrompt, temperature);
    }
  }

  // ---------------------------------------------------------
  // APPEL GEMINI 1.5 PRO
  // ---------------------------------------------------------
  private async callGemini(
    systemPrompt: string,
    userPrompt: string,
    temperature: number
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY manquante");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${apiKey}`;

    // Gemini: system instruction + user message
    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        responseMimeType: "application/json", // Force JSON output
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();

    // Verifier les candidates
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("Gemini: aucun candidat dans la reponse");
    }

    const candidate = data.candidates[0];

    // Verifier le finish reason
    if (candidate.finishReason === "SAFETY") {
      throw new Error("Gemini: reponse bloquee par les filtres de securite");
    }

    if (candidate.finishReason === "MAX_TOKENS") {
      console.warn("[AIService] Gemini: reponse tronquee (MAX_TOKENS)");
    }

    return candidate.content?.parts?.[0]?.text || "";
  }

  // ---------------------------------------------------------
  // APPEL OPENAI GPT-4
  // ---------------------------------------------------------
  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    temperature: number
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY manquante");

    const messages: OpenAIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const requestBody = {
      model: this.config.model, // "gpt-4-turbo" ou "gpt-4o"
      messages,
      temperature,
      max_tokens: this.config.maxOutputTokens,
      response_format: { type: "json_object" }, // Force JSON mode
      top_p: 0.95,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData: any = await response.json();
      throw new Error(`OpenAI API error ${response.status}: ${errorData.error?.message}`);
    }

    const data: any = await response.json();

    // Verifier usage et finish reason
    if (data.choices[0]?.finish_reason === "length") {
      console.warn("[AIService] OpenAI: reponse tronquee (length)");
    }

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI: contenu vide dans la reponse");
    }

    // Log usage pour monitoring des couts
    if (data.usage) {
      console.log(`[AIService] Tokens utilises: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
    }

    return content;
  }

  // ===========================================================
  // HELPERS - CONSTRUCTION DES RESULTATS D'ERREUR
  // ===========================================================
  private buildInsufficientContextResult(
    submission: StudentSubmission,
    startTime: number
  ): AIGradingResult {
    return {
      submissionId: submission.id,
      exerciseId: submission.exerciseId,
      studentId: submission.studentId,
      totalScore: 0,
      maxPossibleScore: 100,
      earnedPoints: 0,
      maxPoints: 0,
      criteriaEvaluations: [],
      globalFeedback:
        "La correction automatique n'est pas disponible pour cet exercice car aucune solution de référence n'a été fournie par votre professeur. Veuillez contacter votre professeur.",
      strengths: [],
      improvements: [],
      nextSteps: ["Attendre la correction manuelle du professeur"],
      identifiedMistakes: [],
      conceptsToReview: [],
      confidenceScore: 0,
      groundedInSolution: false,
      sourceReferences: [],
      hallucinationRisk: "HIGH",
      generatedAt: new Date(),
      modelUsed: this.config.model,
      processingTimeMs: Date.now() - startTime,
    };
  }

  private buildParseErrorResult(
    submission: StudentSubmission,
    error: string,
    startTime: number
  ): AIGradingResult {
    return {
      ...this.buildInsufficientContextResult(submission, startTime),
      globalFeedback:
        "Une erreur technique s'est produite lors de la correction. Votre professeur sera notifié pour corriger manuellement.",
      hallucinationRisk: "HIGH",
    };
  }

  private buildHallucinationBlockedResult(
    submission: StudentSubmission,
    reason: string,
    startTime: number
  ): AIGradingResult {
    return {
      ...this.buildInsufficientContextResult(submission, startTime),
      globalFeedback:
        "La correction automatique a détecté des incohérences et a été bloquée par sécurité. Votre professeur sera notifié pour valider manuellement.",
    };
  }

  private buildInsufficientDataAnalysis(
    studentId: string,
    courseId: string,
    periodDays: number,
    dataCount: number
  ): StudentProgressAnalysis {
    return {
      studentId,
      courseId,
      periodDays,
      overallScore: 0,
      scoreEvolution: [],
      masteryLevel: 0,
      conceptMastery: [],
      strengthAreas: [],
      weaknessAreas: [],
      learningPatterns: {
        averageAttemptsBeforeSuccess: 0,
        hintsUsageRate: 0,
        preferredDifficulty: "MEDIUM",
        consistencyScore: 0,
        commonErrorCategories: [],
      },
      engagementScore: 0,
      personalizedRecommendations: [
        {
          priority: "HIGH",
          type: "PRACTICE",
          title: "Commencez à pratiquer",
          description: `Vous avez seulement ${dataCount} exercice(s) réalisé(s). Complétez au moins 5 exercices pour obtenir une analyse personnalisée.`,
          estimatedTimeMinutes: 30,
          targetConcepts: [],
        },
      ],
      nextExerciseSuggestions: [],
      estimatedTimeToMastery: 0,
      generatedAt: new Date(),
      dataPointsAnalyzed: dataCount,
    };
  }

  // ===========================================================
  // HELPERS - FIREBASE
  // ===========================================================
  private async saveGradingResult(result: AIGradingResult): Promise<void> {
    await this.db.collection("gradingResults").doc(result.submissionId).set({
      ...result,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  private async saveHintUsage(
    studentId: string,
    exerciseId: string,
    hint: GeneratedHint
  ): Promise<void> {
    await this.db.collection("hintUsage").add({
      studentId,
      exerciseId,
      hintLevel: hint.level,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  private async saveProgressAnalysis(analysis: StudentProgressAnalysis): Promise<void> {
    const docId = `${analysis.studentId}_${analysis.courseId}_${Date.now()}`;
    await this.db.collection("progressAnalyses").doc(docId).set({
      ...analysis,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  private async getPreviousHints(
    studentId: string,
    exerciseId: string
  ): Promise<string[]> {
    const snapshot = await this.db
      .collection("hintUsage")
      .where("studentId", "==", studentId)
      .where("exerciseId", "==", exerciseId)
      .orderBy("usedAt", "asc")
      .get();

    return snapshot.docs.map((doc) => doc.data().content || "");
  }

  private async getCourseMetadata(courseId: string): Promise<{
    name: string;
    subject: string;
    gradeLevel: string;
  }> {
    const doc = await this.db.collection("courses").doc(courseId).get();
    if (!doc.exists) {
      return { name: "Cours inconnu", subject: "Non spécifié", gradeLevel: "Non spécifié" };
    }
    const data = doc.data()!;
    return {
      name: data.name || "Cours",
      subject: data.subject || "Non spécifié",
      gradeLevel: data.gradeLevel || "Non spécifié",
    };
  }
}
