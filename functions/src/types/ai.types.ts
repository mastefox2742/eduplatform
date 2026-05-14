// ============================================================
// TYPES COMPLETS DU SYSTEME IA
// ============================================================

export type ExerciseType = "MCQ" | "FREE_TEXT" | "MATH" | "CODE" | "FILL_BLANK";

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export type HintLevel = 1 | 2 | 3; // 1=vague, 2=directif, 3=quasi-reponse

// -----------------------------------------------------------
// SOLUTION DU PROFESSEUR (stockee dans Firebase)
// -----------------------------------------------------------
export interface TeacherSolution {
  id: string;
  exerciseId: string;
  courseId: string;
  subjectArea: string;    // ex: "mathematiques", "francais"
  gradeLevel: string;     // ex: "6eme", "terminale"
  exerciseType: ExerciseType;
  difficulty: DifficultyLevel;

  // Contenu de la solution
  correctAnswer: string | string[];        // Reponse(s) correcte(s)
  acceptedVariants?: string[];             // Variantes acceptees
  gradingRubric: GradingCriterion[];       // Criteres de notation detailles
  commonMistakes: CommonMistake[];         // Erreurs typiques + explications
  pedagogicalContext: string;             // Explication du concept sous-jacent
  hints: HintDefinition[];                // 3 niveaux d'indices predifinis

  // Metadonnees pour RAG
  embeddingVector?: number[];             // Vecteur d'embedding pour recherche
  keywords: string[];                     // Mots-cles pour recherche hybride
  createdAt: Date;
  updatedAt: Date;
  professorId: string;
}

export interface GradingCriterion {
  id: string;
  description: string;           // Ce qu'on evalue
  maxPoints: number;             // Points max pour ce critere
  keywords?: string[];           // Mots-cles attendus dans la reponse
  exactMatch?: boolean;          // Si true: correspondance exacte requise
  partialCreditAllowed: boolean; // Permet la note partielle
  evaluationGuide: string;       // Guide pour evaluer ce critere
}

export interface CommonMistake {
  pattern: string;               // Pattern de l'erreur typique
  explanation: string;           // Pourquoi c'est faux
  pedagogicalHint: string;       // Comment orienter l'eleve
  frequencyScore: number;        // 0-1, a quel point c'est frequent
}

export interface HintDefinition {
  level: HintLevel;
  content: string;               // Texte de l'indice
  revealedConcept: string;       // Concept revele par cet indice
  penaltyPercent: number;        // % de points perdus si utilise (ex: 10)
}

// -----------------------------------------------------------
// SOUMISSION DE L'ELEVE
// -----------------------------------------------------------
export interface StudentSubmission {
  id: string;
  studentId: string;
  exerciseId: string;
  courseId: string;
  exerciseType: ExerciseType;
  answer: StudentAnswer;
  hintsRequested: HintLevel[];   // Indices deja demandes
  attemptNumber: number;
  submittedAt: Date;
  timeSpentSeconds: number;
}

export interface StudentAnswer {
  raw: string;                   // Reponse brute de l'eleve
  selectedOptions?: string[];    // Pour QCM
  mathExpression?: string;       // Pour calcul (format LaTeX ou algebrique)
  normalizedAnswer?: string;     // Apres normalisation (lowercase, trim, etc.)
}

// -----------------------------------------------------------
// RESULTAT DE CORRECTION IA
// -----------------------------------------------------------
export interface AIGradingResult {
  submissionId: string;
  exerciseId: string;
  studentId: string;

  // Score
  totalScore: number;            // 0-100
  maxPossibleScore: number;
  earnedPoints: number;
  maxPoints: number;

  // Evaluation par critere
  criteriaEvaluations: CriterionEvaluation[];

  // Feedback pedagogique
  globalFeedback: string;        // Feedback general encourage
  strengths: string[];           // Ce que l'eleve a bien fait
  improvements: string[];        // Ce qu'il faut ameliorer
  nextSteps: string[];           // Prochaines etapes d'apprentissage

  // Analyse de l'erreur (si applicable)
  identifiedMistakes: IdentifiedMistake[];
  conceptsToReview: string[];    // Concepts a retravailler

  // Metadonnees de fiabilite
  confidenceScore: number;       // 0-1, confiance de l'IA dans sa correction
  groundedInSolution: boolean;   // true si base sur solution prof
  sourceReferences: string[];    // Parties de la solution utilisees
  hallucinationRisk: "LOW" | "MEDIUM" | "HIGH";

  generatedAt: Date;
  modelUsed: string;
  processingTimeMs: number;
}

export interface CriterionEvaluation {
  criterionId: string;
  description: string;
  pointsEarned: number;
  maxPoints: number;
  met: boolean;
  partialCredit: boolean;
  feedback: string;              // Explication specifique a ce critere
  evidenceFromAnswer: string;    // Ce dans la reponse qui justifie l'eval
  evidenceFromSolution: string;  // Ce dans la solution qui justifie l'eval
}

export interface IdentifiedMistake {
  description: string;
  severity: "MINOR" | "MAJOR" | "CRITICAL";
  explanation: string;
  correctionHint: string;        // Indice pour corriger SANS donner la reponse
}

// -----------------------------------------------------------
// HINT (INDICE) GENERE
// -----------------------------------------------------------
export interface GeneratedHint {
  level: HintLevel;
  content: string;
  conceptRevealed: string;
  penaltyPercent: number;
  remainingHints: number;        // Indices encore disponibles
  warningMessage?: string;       // "Attention: prochain indice = -20 points"
}

// -----------------------------------------------------------
// ANALYSE DE PROGRESSION
// -----------------------------------------------------------
export interface StudentProgressAnalysis {
  studentId: string;
  courseId: string;
  periodDays: number;

  // Metriques globales
  overallScore: number;          // Moyenne ponderee sur la periode
  scoreEvolution: ScorePoint[];  // Evolution dans le temps
  masteryLevel: number;          // 0-100, niveau de maitrise global

  // Par concept/competence
  conceptMastery: ConceptMastery[];
  strengthAreas: string[];
  weaknessAreas: string[];

  // Comportement d'apprentissage
  learningPatterns: LearningPattern;
  engagementScore: number;       // 0-100

  // Recommandations IA
  personalizedRecommendations: Recommendation[];
  nextExerciseSuggestions: ExerciseSuggestion[];
  estimatedTimeToMastery: number; // en heures

  generatedAt: Date;
  dataPointsAnalyzed: number;
}

export interface ScorePoint {
  date: Date;
  score: number;
  exerciseId: string;
  exerciseType: ExerciseType;
}

export interface ConceptMastery {
  concept: string;
  masteryPercent: number;         // 0-100
  exercisesAttempted: number;
  averageScore: number;
  trend: "IMPROVING" | "STABLE" | "DECLINING";
  lastPracticed: Date;
}

export interface LearningPattern {
  averageAttemptsBeforeSuccess: number;
  hintsUsageRate: number;        // % d'exercices avec indices
  preferredDifficulty: DifficultyLevel;
  consistencyScore: number;      // Regularite du travail
  peakPerformanceTime?: string;  // Ex: "matin", "apres-midi"
  commonErrorCategories: string[];
}

export interface Recommendation {
  priority: "HIGH" | "MEDIUM" | "LOW";
  type: "REVIEW" | "PRACTICE" | "CHALLENGE" | "CONSOLIDATE";
  title: string;
  description: string;
  estimatedTimeMinutes: number;
  targetConcepts: string[];
}

export interface ExerciseSuggestion {
  exerciseId?: string;
  type: ExerciseType;
  difficulty: DifficultyLevel;
  concept: string;
  reason: string;
}

// -----------------------------------------------------------
// CONTEXTE RAG
// -----------------------------------------------------------
export interface RAGContext {
  solutions: RetrievedSolution[];
  totalRelevanceScore: number;
  retrievalStrategy: string;
  contextTokenCount: number;
}

export interface RetrievedSolution {
  solutionId: string;
  relevanceScore: number;        // 0-1
  content: TeacherSolution;
  retrievedChunks: string[];     // Parties specifiques recuperees
}

// -----------------------------------------------------------
// CONFIGURATION DU SERVICE IA
// -----------------------------------------------------------
export interface AIServiceConfig {
  provider: "gemini" | "openai";
  model: string;                 // "gemini-1.5-pro" | "gpt-4-turbo"
  temperature: number;           // 0-0.3 pour correction (low hallucination)
  maxOutputTokens: number;
  topK?: number;                 // Nombre de solutions recuperees pour RAG
  minimumRelevanceScore: number; // Seuil minimum de pertinence RAG
  enableHallucinationGuard: boolean;
}
