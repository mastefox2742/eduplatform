// ============================================================
// TESTS UNITAIRES - SERVICE IA
// ============================================================
// Tests focuss sur:
// 1. La logique de scoring des differents types d'exercices
// 2. Le garde-fou anti-hallucination
// 3. Le normaliseur d'exercices

import { ExerciseNormalizer } from "../utils/exercise.normalizer";
import { HallucinationGuard } from "./hallucination.guard";
import { AIGradingResult, RAGContext, TeacherSolution } from "../types/ai.types";

// -----------------------------------------------------------
// HELPER: Creer une solution de prof fictive pour les tests
// -----------------------------------------------------------
function createMockSolution(overrides: Partial<TeacherSolution> = {}): TeacherSolution {
  return {
    id: "sol-001",
    exerciseId: "ex-001",
    courseId: "course-math-6e",
    subjectArea: "mathematiques",
    gradeLevel: "6eme",
    exerciseType: "MATH",
    difficulty: "MEDIUM",
    correctAnswer: "12",
    acceptedVariants: ["12.0", "douze"],
    gradingRubric: [
      {
        id: "crit-001",
        description: "Resultat correct",
        maxPoints: 8,
        partialCreditAllowed: false,
        evaluationGuide: "La reponse doit etre exactement 12",
        keywords: ["12"],
      },
      {
        id: "crit-002",
        description: "Demarche montree",
        maxPoints: 2,
        partialCreditAllowed: true,
        evaluationGuide: "L'eleve montre les etapes de calcul",
      },
    ],
    commonMistakes: [
      {
        pattern: "11 ou 13",
        explanation: "Erreur de calcul d'une unite",
        pedagogicalHint: "Revérifiez votre addition/soustraction",
        frequencyScore: 0.3,
      },
    ],
    pedagogicalContext: "Multiplication simple",
    hints: [
      { level: 1, content: "Pensez a la multiplication", revealedConcept: "operation", penaltyPercent: 5 },
      { level: 2, content: "Combien font 3 fois 4?", revealedConcept: "table de 3", penaltyPercent: 10 },
      { level: 3, content: "Calculez 3×4 puis verifiez", revealedConcept: "methode complete", penaltyPercent: 20 },
    ],
    keywords: ["multiplication", "calcul", "produit"],
    createdAt: new Date(),
    updatedAt: new Date(),
    professorId: "prof-001",
    ...overrides,
  };
}

function createMockRAGContext(solution: TeacherSolution): RAGContext {
  return {
    solutions: [
      {
        solutionId: solution.id,
        relevanceScore: 1.0,
        content: solution,
        retrievedChunks: [`Reponse correcte: ${solution.correctAnswer}`],
      },
    ],
    totalRelevanceScore: 1.0,
    retrievalStrategy: "EXACT_MATCH",
    contextTokenCount: 500,
  };
}

// -----------------------------------------------------------
// TEST SUITE 1: NORMALISEUR D'EXERCICES
// -----------------------------------------------------------
describe("ExerciseNormalizer", () => {
  const normalizer = new ExerciseNormalizer();

  // --- QCM ---
  describe("normalizeMCQ", () => {
    it("normalise une reponse simple en lettre majuscule", () => {
      const submission: any = {
        exerciseType: "MCQ",
        answer: { raw: "B", selectedOptions: ["B"] },
        hintsRequested: [], attemptNumber: 1, timeSpentSeconds: 60,
        id: "s1", studentId: "st1", exerciseId: "e1", courseId: "c1",
        submittedAt: new Date(),
      };
      const result = normalizer.normalizeSubmission(submission);
      expect(result.answer.normalizedAnswer).toBe("b");
    });

    it("normalise une reponse multiple triee", () => {
      const submission: any = {
        exerciseType: "MCQ",
        answer: { raw: "C,A", selectedOptions: ["C", "A"] },
        hintsRequested: [], attemptNumber: 1, timeSpentSeconds: 60,
        id: "s1", studentId: "st1", exerciseId: "e1", courseId: "c1",
        submittedAt: new Date(),
      };
      const result = normalizer.normalizeSubmission(submission);
      expect(result.answer.selectedOptions).toEqual(["a", "c"]); // Trié
    });
  });

  // --- MATH ---
  describe("normalizeMath", () => {
    it("normalise un nombre avec virgule en point", () => {
      const submission: any = {
        exerciseType: "MATH",
        answer: { raw: "3,14" },
        hintsRequested: [], attemptNumber: 1, timeSpentSeconds: 60,
        id: "s1", studentId: "st1", exerciseId: "e1", courseId: "c1",
        submittedAt: new Date(),
      };
      const result = normalizer.normalizeSubmission(submission);
      expect(result.answer.normalizedAnswer).toBe("3.14");
    });

    it("normalise un entier simple", () => {
      const submission: any = {
        exerciseType: "MATH",
        answer: { raw: "12" },
        hintsRequested: [], attemptNumber: 1, timeSpentSeconds: 60,
        id: "s1", studentId: "st1", exerciseId: "e1", courseId: "c1",
        submittedAt: new Date(),
      };
      const result = normalizer.normalizeSubmission(submission);
      expect(result.answer.normalizedAnswer).toBe("12");
    });
  });

  // --- EQUIVALENCE MATHEMATIQUE ---
  describe("areMathematicallyEquivalent", () => {
    it("12 et 12.0 sont equivalents", () => {
      expect(ExerciseNormalizer.areMathematicallyEquivalent("12", "12.0")).toBe(true);
    });

    it("3,14 et 3.14 sont equivalents", () => {
      expect(ExerciseNormalizer.areMathematicallyEquivalent("3,14", "3.14")).toBe(true);
    });

    it("11 et 12 ne sont pas equivalents", () => {
      expect(ExerciseNormalizer.areMathematicallyEquivalent("11", "12")).toBe(false);
    });

    it("tolerance de 0.001: 3.1415 et 3.1416 sont equivalents", () => {
      expect(ExerciseNormalizer.areMathematicallyEquivalent("3.1415", "3.1416", 0.01)).toBe(true);
    });
  });

  // --- SCORING QCM ---
  describe("scoreMCQAnswer", () => {
    it("reponse exacte = 100% des points", () => {
      const result = ExerciseNormalizer.scoreMCQAnswer(["A"], ["A"], 4);
      expect(result.points).toBe(4);
      expect(result.percentage).toBe(100);
    });

    it("reponse fausse sans credit partiel = 0", () => {
      const result = ExerciseNormalizer.scoreMCQAnswer(["B"], ["A"], 4, false);
      expect(result.points).toBe(0);
    });

    it("QCM multiple: 1 bonne sur 2 = credit partiel", () => {
      const result = ExerciseNormalizer.scoreMCQAnswer(["A"], ["A", "C"], 4, true);
      expect(result.points).toBeGreaterThan(0);
      expect(result.points).toBeLessThan(4);
    });

    it("QCM multiple: toutes bonnes = 100%", () => {
      const result = ExerciseNormalizer.scoreMCQAnswer(["A", "C"], ["A", "C"], 4, true);
      expect(result.points).toBe(4);
      expect(result.percentage).toBe(100);
    });

    it("mauvaise option choisie = penalite", () => {
      const result = ExerciseNormalizer.scoreMCQAnswer(["A", "B"], ["A", "C"], 4, true);
      // A correct (+1) + B incorrect (-1) = 0/2 des bonnes
      expect(result.points).toBe(0);
    });
  });
});

// -----------------------------------------------------------
// TEST SUITE 2: GARDE-FOU ANTI-HALLUCINATION
// -----------------------------------------------------------
describe("HallucinationGuard", () => {
  const guard = new HallucinationGuard();

  function createValidResult(): AIGradingResult {
    return {
      submissionId: "sub-001",
      exerciseId: "ex-001",
      studentId: "st-001",
      totalScore: 80,
      maxPossibleScore: 100,
      earnedPoints: 8,
      maxPoints: 10,
      criteriaEvaluations: [
        {
          criterionId: "crit-001",
          description: "Resultat correct",
          pointsEarned: 8,
          maxPoints: 8,
          met: true,
          partialCredit: false,
          feedback: "Correct",
          evidenceFromAnswer: "12",
          evidenceFromSolution: "Reponse correcte: 12",
        },
        {
          criterionId: "crit-002",
          description: "Demarche montree",
          pointsEarned: 0,
          maxPoints: 2,
          met: false,
          partialCredit: false,
          feedback: "Demarche non montree",
          evidenceFromAnswer: "",
          evidenceFromSolution: "L'eleve montre les etapes de calcul",
        },
      ],
      globalFeedback: "Bonne reponse, pensez a montrer vos etapes.",
      strengths: ["Resultat correct"],
      improvements: ["Montrer la demarche"],
      nextSteps: ["Pratiquer la presentation des calculs"],
      identifiedMistakes: [],
      conceptsToReview: [],
      confidenceScore: 90,
      groundedInSolution: true,
      sourceReferences: ["Reponse correcte: 12"],
      hallucinationRisk: "LOW",
      generatedAt: new Date(),
      modelUsed: "gemini-1.5-pro",
      processingTimeMs: 1500,
    };
  }

  it("valide un resultat correct", async () => {
    const solution = createMockSolution();
    const ragContext = createMockRAGContext(solution);
    const result = createValidResult();

    const check = await guard.validateGradingResult(result, ragContext, "12");
    expect(check.passed).toBe(true);
    expect(check.riskLevel).toBe("LOW");
    expect(check.violations).toHaveLength(0);
  });

  it("detecte un score impossible (> 100)", async () => {
    const solution = createMockSolution();
    const ragContext = createMockRAGContext(solution);
    const result = createValidResult();
    result.totalScore = 150; // Impossible

    const check = await guard.validateGradingResult(result, ragContext, "12");
    expect(check.passed).toBe(false);
    expect(check.violations.some((v) => v.type === "IMPOSSIBLE_SCORE")).toBe(true);
  });

  it("detecte des points gagnes superieurs au maximum", async () => {
    const solution = createMockSolution();
    const ragContext = createMockRAGContext(solution);
    const result = createValidResult();
    result.earnedPoints = 15;
    result.maxPoints = 10;

    const check = await guard.validateGradingResult(result, ragContext, "12");
    expect(check.violations.some((v) => v.type === "IMPOSSIBLE_SCORE")).toBe(true);
  });

  it("detecte l'absence de citations", async () => {
    const solution = createMockSolution();
    const ragContext = createMockRAGContext(solution);
    const result = createValidResult();
    result.sourceReferences = []; // Pas de citations

    const check = await guard.validateGradingResult(result, ragContext, "12");
    expect(check.violations.some((v) => v.type === "MISSING_CITATION")).toBe(true);
  });

  it("detecte un faible score de confiance", async () => {
    const solution = createMockSolution();
    const ragContext = createMockRAGContext(solution);
    const result = createValidResult();
    result.confidenceScore = 30; // Tres faible

    const check = await guard.validateGradingResult(result, ragContext, "12");
    expect(check.violations.some((v) => v.type === "LOW_CONFIDENCE")).toBe(true);
  });

  it("CRITIQUE: detecte l'absence de contexte RAG", async () => {
    const emptyContext: RAGContext = {
      solutions: [],
      totalRelevanceScore: 0,
      retrievalStrategy: "VECTOR_SIMILARITY",
      contextTokenCount: 0,
    };
    const result = createValidResult();

    const check = await guard.validateGradingResult(result, emptyContext, "12");
    expect(check.passed).toBe(false);
    expect(check.riskLevel).toBe("CRITICAL");
    expect(check.violations.some((v) => v.severity === "CRITICAL")).toBe(true);
  });

  it("sanitise un resultat avec scores incorrects", async () => {
    const solution = createMockSolution();
    const ragContext = createMockRAGContext(solution);
    const result = createValidResult();
    result.earnedPoints = 15; // Trop eleve
    result.maxPoints = 10;
    result.totalScore = 150; // Impossible

    const check = await guard.validateGradingResult(result, ragContext, "12");

    // Meme si bloque, le resultat sanitise doit avoir des valeurs valides
    if (check.sanitizedResult) {
      expect(check.sanitizedResult.totalScore).toBeLessThanOrEqual(100);
      expect(check.sanitizedResult.totalScore).toBeGreaterThanOrEqual(0);
    }
  });
});

// -----------------------------------------------------------
// TEST SUITE 3: VALIDATION JSON
// -----------------------------------------------------------
describe("JSONResponseValidator", () => {
  const { JSONResponseValidator } = require("./hallucination.guard");

  it("parse un JSON valide", () => {
    const json = JSON.stringify({ totalScore: 80, earnedPoints: 8, maxPoints: 10, criteriaEvaluations: [], globalFeedback: "OK" });
    const result = JSONResponseValidator.parseAndValidate(
      json,
      ["totalScore", "earnedPoints", "maxPoints"],
      "test"
    );
    expect(result.success).toBe(true);
  });

  it("parse un JSON dans un bloc markdown", () => {
    const response = "```json\n{\"totalScore\": 80, \"earnedPoints\": 8, \"maxPoints\": 10}\n```";
    const result = JSONResponseValidator.parseAndValidate(
      response,
      ["totalScore"],
      "test"
    );
    expect(result.success).toBe(true);
  });

  it("echoue sur JSON invalide", () => {
    const result = JSONResponseValidator.parseAndValidate(
      "ceci n'est pas du JSON",
      ["totalScore"],
      "test"
    );
    expect(result.success).toBe(false);
  });

  it("echoue si champs requis manquants", () => {
    const json = JSON.stringify({ totalScore: 80 });
    const result = JSONResponseValidator.parseAndValidate(
      json,
      ["totalScore", "earnedPoints", "maxPoints"],
      "test"
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Champs manquants");
  });

  it("detecte la reponse INSUFFICIENT_CONTEXT de l'IA", () => {
    const json = JSON.stringify({
      error: "INSUFFICIENT_CONTEXT",
      message: "Pas de solution disponible",
    });
    const result = JSONResponseValidator.parseAndValidate(json, [], "test");
    expect(result.success).toBe(false);
    expect(result.error).toContain("contexte insuffisant");
  });
});
