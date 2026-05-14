// ============================================================
// GARDE-FOUS ANTI-HALLUCINATION
// ============================================================
// Systeme de validation multi-couches pour detecter et bloquer
// les reponses inventees par l'IA

import { AIGradingResult, RAGContext, TeacherSolution } from "../types/ai.types";

// -----------------------------------------------------------
// TYPES DU GARDE-FOU
// -----------------------------------------------------------
export interface HallucinationCheckResult {
  passed: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  violations: HallucinationViolation[];
  sanitizedResult?: AIGradingResult;
  blockedReason?: string;
}

export interface HallucinationViolation {
  type: ViolationType;
  severity: "WARNING" | "ERROR" | "CRITICAL";
  description: string;
  affectedField: string;
  suggestedFix: string;
}

type ViolationType =
  | "UNGROUNDED_CLAIM"      // Affirmation sans base dans la solution prof
  | "FABRICATED_CRITERION"  // Critere invente
  | "SCORE_MISMATCH"        // Score incohérent avec les criteres
  | "MISSING_CITATION"      // Pas de citation de la solution source
  | "LOW_CONFIDENCE"        // IA elle-meme incertaine
  | "CONTEXT_ABSENT"        // Correction sans contexte RAG
  | "IMPOSSIBLE_SCORE"      // Score > maxPoints ou negatif
  | "INVENTED_ANSWER";      // IA a invente une reponse correcte

// -----------------------------------------------------------
// CLASSE PRINCIPALE DU GARDE-FOU
// -----------------------------------------------------------
export class HallucinationGuard {

  // ---------------------------------------------------------
  // VALIDATION COMPLETE D'UN RESULTAT DE CORRECTION
  // ---------------------------------------------------------
  async validateGradingResult(
    result: AIGradingResult,
    ragContext: RAGContext,
    submissionAnswer: string
  ): Promise<HallucinationCheckResult> {
    const violations: HallucinationViolation[] = [];

    // VERIFICATION 1: Contexte RAG present
    this.checkContextPresence(ragContext, violations);

    // VERIFICATION 2: Score dans les bornes
    this.checkScoreBounds(result, ragContext, violations);

    // VERIFICATION 3: Citations presentes
    this.checkCitationsPresence(result, violations);

    // VERIFICATION 4: Criteres valides par rapport a la solution
    this.checkCriteriaGrounding(result, ragContext, violations);

    // VERIFICATION 5: Confiance de l'IA
    this.checkConfidenceScore(result, violations);

    // VERIFICATION 6: Coherence interne
    this.checkInternalConsistency(result, violations);

    // VERIFICATION 7: Feedback ne contient pas la reponse complete
    this.checkFeedbackDoesNotRevealAnswer(result, ragContext, violations);

    // Determiner le niveau de risque global
    const riskLevel = this.computeRiskLevel(violations);
    const passed = riskLevel !== "CRITICAL" && !violations.some((v) => v.severity === "CRITICAL");

    // Si risque eleve : sanitiser le resultat
    let sanitizedResult: AIGradingResult | undefined;
    if (!passed || riskLevel === "HIGH") {
      sanitizedResult = this.sanitizeResult(result, violations, ragContext);
    }

    return {
      passed,
      riskLevel,
      violations,
      sanitizedResult,
      blockedReason: passed ? undefined : this.buildBlockedReason(violations),
    };
  }

  // ---------------------------------------------------------
  // VERIFICATION 1: Contexte RAG
  // ---------------------------------------------------------
  private checkContextPresence(
    ragContext: RAGContext,
    violations: HallucinationViolation[]
  ): void {
    if (!ragContext || ragContext.solutions.length === 0) {
      violations.push({
        type: "CONTEXT_ABSENT",
        severity: "CRITICAL",
        description: "Aucune solution professeur dans le contexte RAG",
        affectedField: "ragContext",
        suggestedFix: "Impossible de corriger sans solution de référence",
      });
      return;
    }

    if (ragContext.totalRelevanceScore < 0.5) {
      violations.push({
        type: "CONTEXT_ABSENT",
        severity: "ERROR",
        description: `Score de pertinence RAG trop bas: ${ragContext.totalRelevanceScore.toFixed(2)} (minimum: 0.5)`,
        affectedField: "ragContext.totalRelevanceScore",
        suggestedFix: "Utiliser une solution plus pertinente ou demander au prof d'en fournir une",
      });
    }
  }

  // ---------------------------------------------------------
  // VERIFICATION 2: Bornes des scores
  // ---------------------------------------------------------
  private checkScoreBounds(
    result: AIGradingResult,
    ragContext: RAGContext,
    violations: HallucinationViolation[]
  ): void {
    // Score total hors bornes
    if (result.totalScore < 0 || result.totalScore > 100) {
      violations.push({
        type: "IMPOSSIBLE_SCORE",
        severity: "CRITICAL",
        description: `Score total impossible: ${result.totalScore} (doit être 0-100)`,
        affectedField: "totalScore",
        suggestedFix: "Clamp le score entre 0 et 100",
      });
    }

    // Points gagnes coherents
    if (result.earnedPoints > result.maxPoints) {
      violations.push({
        type: "IMPOSSIBLE_SCORE",
        severity: "CRITICAL",
        description: `Points gagnés (${result.earnedPoints}) > points max (${result.maxPoints})`,
        affectedField: "earnedPoints",
        suggestedFix: "Recalculer les points",
      });
    }

    // Verification que maxPoints correspond a la solution
    if (ragContext.solutions.length > 0) {
      const expectedMax = ragContext.solutions[0].content.gradingRubric.reduce(
        (sum, r) => sum + r.maxPoints,
        0
      );
      if (expectedMax > 0 && Math.abs(result.maxPoints - expectedMax) > 1) {
        violations.push({
          type: "SCORE_MISMATCH",
          severity: "ERROR",
          description: `Points max incorrect: IA dit ${result.maxPoints}, solution prof dit ${expectedMax}`,
          affectedField: "maxPoints",
          suggestedFix: `Utiliser ${expectedMax} comme maxPoints`,
        });
      }
    }

    // Verification criteres individuels
    result.criteriaEvaluations.forEach((criterion, index) => {
      if (criterion.pointsEarned > criterion.maxPoints) {
        violations.push({
          type: "IMPOSSIBLE_SCORE",
          severity: "ERROR",
          description: `Critère ${index + 1}: points gagnés (${criterion.pointsEarned}) > max (${criterion.maxPoints})`,
          affectedField: `criteriaEvaluations[${index}].pointsEarned`,
          suggestedFix: `Limiter à ${criterion.maxPoints}`,
        });
      }
    });
  }

  // ---------------------------------------------------------
  // VERIFICATION 3: Citations presentes
  // ---------------------------------------------------------
  private checkCitationsPresence(
    result: AIGradingResult,
    violations: HallucinationViolation[]
  ): void {
    if (!result.sourceReferences || result.sourceReferences.length === 0) {
      violations.push({
        type: "MISSING_CITATION",
        severity: "ERROR",
        description: "Aucune citation de la solution professeur dans la correction",
        affectedField: "sourceReferences",
        suggestedFix: "Ajouter des citations de la solution source",
      });
    }

    // Verifier que chaque critere a une evidence de la solution
    result.criteriaEvaluations.forEach((criterion, index) => {
      if (
        !criterion.evidenceFromSolution ||
        criterion.evidenceFromSolution.trim().length < 10
      ) {
        violations.push({
          type: "MISSING_CITATION",
          severity: "WARNING",
          description: `Critère ${index + 1} sans citation de la solution prof`,
          affectedField: `criteriaEvaluations[${index}].evidenceFromSolution`,
          suggestedFix: "Ajouter une citation de la solution prof pour ce critère",
        });
      }
    });
  }

  // ---------------------------------------------------------
  // VERIFICATION 4: Criteres ancres dans la solution
  // ---------------------------------------------------------
  private checkCriteriaGrounding(
    result: AIGradingResult,
    ragContext: RAGContext,
    violations: HallucinationViolation[]
  ): void {
    if (ragContext.solutions.length === 0) return;

    const solution = ragContext.solutions[0].content;
    const validCriterionIds = new Set(solution.gradingRubric.map((r) => r.id));

    result.criteriaEvaluations.forEach((evaluation, index) => {
      // Si le critere a un ID qui n'existe pas dans la solution
      if (evaluation.criterionId && !validCriterionIds.has(evaluation.criterionId)) {
        violations.push({
          type: "FABRICATED_CRITERION",
          severity: "ERROR",
          description: `Critère "${evaluation.criterionId}" n'existe pas dans la solution professeur`,
          affectedField: `criteriaEvaluations[${index}].criterionId`,
          suggestedFix: `IDs valides: ${[...validCriterionIds].join(", ")}`,
        });
      }
    });
  }

  // ---------------------------------------------------------
  // VERIFICATION 5: Score de confiance
  // ---------------------------------------------------------
  private checkConfidenceScore(
    result: AIGradingResult,
    violations: HallucinationViolation[]
  ): void {
    if (result.confidenceScore < 60) {
      violations.push({
        type: "LOW_CONFIDENCE",
        severity: result.confidenceScore < 40 ? "ERROR" : "WARNING",
        description: `Score de confiance trop bas: ${result.confidenceScore}/100`,
        affectedField: "confidenceScore",
        suggestedFix: "Demander une correction manuelle par le professeur",
      });
    }

    // Si l'IA signale elle-meme un risque d'hallucination eleve
    if (result.hallucinationRisk === "HIGH") {
      violations.push({
        type: "UNGROUNDED_CLAIM",
        severity: "ERROR",
        description: "L'IA elle-même signale un risque d'hallucination élevé",
        affectedField: "hallucinationRisk",
        suggestedFix: "Validation manuelle requise",
      });
    }
  }

  // ---------------------------------------------------------
  // VERIFICATION 6: Coherence interne
  // ---------------------------------------------------------
  private checkInternalConsistency(
    result: AIGradingResult,
    violations: HallucinationViolation[]
  ): void {
    // Score total = somme des criteres ?
    const computedScore = result.criteriaEvaluations.reduce(
      (sum, c) => sum + c.pointsEarned,
      0
    );

    if (Math.abs(computedScore - result.earnedPoints) > 1) {
      violations.push({
        type: "SCORE_MISMATCH",
        severity: "ERROR",
        description: `Incohérence: somme critères (${computedScore}) ≠ earnedPoints (${result.earnedPoints})`,
        affectedField: "earnedPoints",
        suggestedFix: `Corriger earnedPoints à ${computedScore}`,
      });
    }

    // totalScore coherent avec earnedPoints/maxPoints
    if (result.maxPoints > 0) {
      const expectedPercent = Math.round((result.earnedPoints / result.maxPoints) * 100);
      if (Math.abs(expectedPercent - result.totalScore) > 2) {
        violations.push({
          type: "SCORE_MISMATCH",
          severity: "WARNING",
          description: `totalScore (${result.totalScore}%) incohérent avec ${result.earnedPoints}/${result.maxPoints} pts (=${expectedPercent}%)`,
          affectedField: "totalScore",
          suggestedFix: `Corriger totalScore à ${expectedPercent}`,
        });
      }
    }
  }

  // ---------------------------------------------------------
  // VERIFICATION 7: Feedback ne revele pas la reponse
  // ---------------------------------------------------------
  private checkFeedbackDoesNotRevealAnswer(
    result: AIGradingResult,
    ragContext: RAGContext,
    violations: HallucinationViolation[]
  ): void {
    if (ragContext.solutions.length === 0) return;

    const solution = ragContext.solutions[0].content;
    const correctAnswer = Array.isArray(solution.correctAnswer)
      ? solution.correctAnswer.join(" ")
      : solution.correctAnswer;

    // Verifier que le feedback ne contient pas la reponse exacte
    // (sauf si l'exercice est entierement corrige avec 100%)
    if (result.totalScore < 100) {
      const feedbackText = [
        result.globalFeedback,
        ...result.improvements,
        ...result.identifiedMistakes.map((m) => m.correctionHint),
      ]
        .join(" ")
        .toLowerCase();

      const answerLower = correctAnswer.toLowerCase();

      // Verifier la presence de la reponse exacte dans le feedback
      // pour les reponses courtes (< 50 chars)
      if (answerLower.length < 50 && feedbackText.includes(answerLower)) {
        violations.push({
          type: "INVENTED_ANSWER",
          severity: "WARNING",
          description: "Le feedback semble contenir la réponse complète alors que l'élève n'a pas 100%",
          affectedField: "globalFeedback / improvements",
          suggestedFix: "Reformuler le feedback sans donner la réponse directement",
        });
      }
    }
  }

  // ---------------------------------------------------------
  // CALCUL DU NIVEAU DE RISQUE GLOBAL
  // ---------------------------------------------------------
  private computeRiskLevel(
    violations: HallucinationViolation[]
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (violations.some((v) => v.severity === "CRITICAL")) return "CRITICAL";
    if (violations.filter((v) => v.severity === "ERROR").length >= 2) return "HIGH";
    if (violations.some((v) => v.severity === "ERROR")) return "MEDIUM";
    if (violations.length > 0) return "LOW";
    return "LOW";
  }

  // ---------------------------------------------------------
  // SANITISATION DU RESULTAT
  // ---------------------------------------------------------
  private sanitizeResult(
    result: AIGradingResult,
    violations: HallucinationViolation[],
    ragContext: RAGContext
  ): AIGradingResult {
    const sanitized = { ...result };

    // Corriger les scores impossibles
    sanitized.totalScore = Math.max(0, Math.min(100, result.totalScore));
    sanitized.earnedPoints = Math.min(result.earnedPoints, result.maxPoints);
    sanitized.earnedPoints = Math.max(0, sanitized.earnedPoints);

    // Corriger maxPoints si solution disponible
    if (ragContext.solutions.length > 0) {
      const expectedMax = ragContext.solutions[0].content.gradingRubric.reduce(
        (sum, r) => sum + r.maxPoints,
        0
      );
      if (expectedMax > 0) {
        sanitized.maxPoints = expectedMax;
        sanitized.totalScore = Math.round(
          (sanitized.earnedPoints / sanitized.maxPoints) * 100
        );
      }
    }

    // Recalculer earnedPoints depuis les criteres
    const computedPoints = result.criteriaEvaluations.reduce(
      (sum, c) => sum + Math.min(c.pointsEarned, c.maxPoints),
      0
    );
    sanitized.earnedPoints = computedPoints;

    // Ajouter note de sanitisation
    sanitized.globalFeedback =
      `[Note: Cette correction a été ajustée automatiquement suite à la détection d'inconsistances. Une validation manuelle est recommandée.]\n\n` +
      result.globalFeedback;

    // Marquer le risque
    sanitized.hallucinationRisk = "HIGH";

    return sanitized;
  }

  // ---------------------------------------------------------
  // CONSTRUCTION DU MESSAGE DE BLOCAGE
  // ---------------------------------------------------------
  private buildBlockedReason(violations: HallucinationViolation[]): string {
    const criticalViolations = violations.filter((v) => v.severity === "CRITICAL");
    return (
      `Correction bloquée: ${criticalViolations.map((v) => v.description).join("; ")}. ` +
      `Une correction manuelle par le professeur est requise.`
    );
  }
}

// -----------------------------------------------------------
// VALIDATEUR DE REPONSE JSON (post-parsing)
// -----------------------------------------------------------
export class JSONResponseValidator {

  // Valide et parse la reponse JSON de l'IA avec fallback
  static parseAndValidate<T>(
    rawResponse: string,
    requiredFields: string[],
    context: string
  ): { success: true; data: T } | { success: false; error: string; rawResponse: string } {
    // Nettoyer la reponse (enlever markdown code blocks si present)
    let cleanedResponse = rawResponse.trim();

    // Pattern 1: ```json ... ```
    const jsonBlockMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      cleanedResponse = jsonBlockMatch[1];
    }

    // Pattern 2: ``` ... ```
    const codeBlockMatch = cleanedResponse.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && !jsonBlockMatch) {
      cleanedResponse = codeBlockMatch[1];
    }

    // Tentative de parsing
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // Tentative de recuperation: chercher le JSON dans la reponse
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return {
            success: false,
            error: `JSON invalide dans la réponse IA (contexte: ${context})`,
            rawResponse,
          };
        }
      } else {
        return {
          success: false,
          error: `Aucun JSON trouvé dans la réponse IA (contexte: ${context})`,
          rawResponse,
        };
      }
    }

    // Verifier les champs requis
    const missingFields = requiredFields.filter(
      (field) => parsed[field] === undefined || parsed[field] === null
    );

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Champs manquants: ${missingFields.join(", ")} (contexte: ${context})`,
        rawResponse,
      };
    }

    // Verifier l'erreur explicite de l'IA (manque de contexte)
    if (parsed.error === "INSUFFICIENT_CONTEXT") {
      return {
        success: false,
        error: `IA: contexte insuffisant - ${parsed.message}`,
        rawResponse,
      };
    }

    return { success: true, data: parsed as T };
  }
}
