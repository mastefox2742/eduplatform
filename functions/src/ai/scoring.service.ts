// ============================================================
// SERVICE DE SCORING - SYSTEME DE NOTATION PEDAGOGIQUE
// ============================================================
// Calcul de scores pre-IA pour les types d'exercices bien definis
// (complement au scoring IA pour les cas deterministes)

import {
  GradingCriterion,
  ExerciseType,
  StudentAnswer,
  TeacherSolution,
  CriterionEvaluation,
} from "../types/ai.types";
import { ExerciseNormalizer } from "../utils/exercise.normalizer";

// -----------------------------------------------------------
// INTERFACE DE RESULTAT DU SCORING LOCAL
// -----------------------------------------------------------
export interface LocalScoringResult {
  canScoreLocally: boolean;       // Si false: deleguer a l'IA
  totalScore: number;
  earnedPoints: number;
  maxPoints: number;
  criteriaEvaluations: CriterionEvaluation[];
  confidence: number;             // 0-100, certitude du scoring local
}

// -----------------------------------------------------------
// CLASSE DE SCORING LOCAL (sans IA, pour les cas deterministes)
// -----------------------------------------------------------
export class ScoringService {

  // Point d'entree principal
  scoreLocally(
    answer: StudentAnswer,
    solution: TeacherSolution
  ): LocalScoringResult {
    switch (solution.exerciseType) {
      case "MCQ":
        return this.scoreMCQ(answer, solution);
      case "MATH":
        return this.scoreMath(answer, solution);
      case "FILL_BLANK":
        return this.scoreFillBlank(answer, solution);
      default:
        // FREE_TEXT et CODE: toujours deleguer a l'IA
        return this.cannotScoreLocally(solution);
    }
  }

  // ---------------------------------------------------------
  // SCORING QCM (deterministe)
  // ---------------------------------------------------------
  private scoreMCQ(answer: StudentAnswer, solution: TeacherSolution): LocalScoringResult {
    const correctOptions = Array.isArray(solution.correctAnswer)
      ? solution.correctAnswer.map((o) => o.toLowerCase().trim())
      : [solution.correctAnswer.toLowerCase().trim()];

    const selectedOptions = (answer.selectedOptions || []).map((o) =>
      o.toLowerCase().trim()
    );

    const maxPoints = solution.gradingRubric.reduce((sum, r) => sum + r.maxPoints, 0);

    // Scoring via helper
    const scoreResult = ExerciseNormalizer.scoreMCQAnswer(
      selectedOptions,
      correctOptions,
      maxPoints,
      solution.gradingRubric.some((r) => r.partialCreditAllowed)
    );

    // Construire les evaluations par critere
    const criteriaEvaluations: CriterionEvaluation[] = solution.gradingRubric.map((criterion) => {
      // Chercher si ce critere correspond a une option specifique
      const criterionOption = criterion.keywords?.[0]?.toLowerCase();
      const criterionMet = criterionOption
        ? selectedOptions.includes(criterionOption)
        : scoreResult.percentage === 100;

      const pointsEarned = criterionMet
        ? criterion.maxPoints
        : criterion.partialCreditAllowed
        ? Math.round(scoreResult.percentage / 100 * criterion.maxPoints * 10) / 10
        : 0;

      return {
        criterionId: criterion.id,
        description: criterion.description,
        pointsEarned,
        maxPoints: criterion.maxPoints,
        met: criterionMet,
        partialCredit: !criterionMet && pointsEarned > 0,
        feedback: criterionMet
          ? `Correct: ${criterion.description}`
          : `Non satisfait: ${criterion.description}. ${this.getMCQFeedback(selectedOptions, correctOptions, criterion)}`,
        evidenceFromAnswer: `Options choisies: ${selectedOptions.join(", ")}`,
        evidenceFromSolution: `Reponse(s) correcte(s): ${correctOptions.join(", ")}`,
      };
    });

    return {
      canScoreLocally: true,
      totalScore: scoreResult.percentage,
      earnedPoints: scoreResult.points,
      maxPoints,
      criteriaEvaluations,
      confidence: 100, // QCM est deterministe
    };
  }

  // ---------------------------------------------------------
  // SCORING MATH (semi-deterministe)
  // ---------------------------------------------------------
  private scoreMath(answer: StudentAnswer, solution: TeacherSolution): LocalScoringResult {
    const studentAnswer = answer.normalizedAnswer || answer.raw;
    const correctAnswers = Array.isArray(solution.correctAnswer)
      ? solution.correctAnswer
      : [solution.correctAnswer];

    // Inclure les variantes acceptees
    const allAcceptedAnswers = [
      ...correctAnswers,
      ...(solution.acceptedVariants || []),
    ];

    const maxPoints = solution.gradingRubric.reduce((sum, r) => sum + r.maxPoints, 0);

    // Trouver le critere "resultat"
    const resultCriterion = solution.gradingRubric.find(
      (r) => r.keywords?.some((k) => allAcceptedAnswers.includes(k)) ||
             r.description.toLowerCase().includes("resultat") ||
             r.description.toLowerCase().includes("reponse")
    );

    // Verifier la correspondance du resultat
    const scoreResult = ExerciseNormalizer.scoreMathAnswer(
      studentAnswer,
      allAcceptedAnswers,
      resultCriterion?.maxPoints || maxPoints
    );

    if (!scoreResult.isCorrect) {
      // Resultat faux: on peut scorer partiellement si c'est un exercice simple
      // Pour les exercices avec demarche, deleguer a l'IA
      const hasDemarkeCriterion = solution.gradingRubric.some(
        (r) => r.description.toLowerCase().includes("demarche") ||
               r.description.toLowerCase().includes("etape")
      );

      if (hasDemarkeCriterion) {
        // L'IA peut donner du credit partiel pour la demarche
        return {
          ...this.cannotScoreLocally(solution),
          canScoreLocally: false,
          confidence: 0,
        };
      }
    }

    // Construire les evaluations
    const criteriaEvaluations: CriterionEvaluation[] = solution.gradingRubric.map(
      (criterion) => {
        const isResultCriterion =
          criterion.id === resultCriterion?.id ||
          criterion.keywords?.some((k) => allAcceptedAnswers.includes(k));

        if (isResultCriterion) {
          return {
            criterionId: criterion.id,
            description: criterion.description,
            pointsEarned: scoreResult.points,
            maxPoints: criterion.maxPoints,
            met: scoreResult.isCorrect,
            partialCredit: false,
            feedback: scoreResult.isCorrect
              ? `Excellent ! La reponse ${studentAnswer} est correcte.`
              : `La reponse ${studentAnswer} est incorrecte. La reponse attendue est ${correctAnswers[0]}.`,
            evidenceFromAnswer: `Reponse donnee: ${studentAnswer}`,
            evidenceFromSolution: `Reponse correcte: ${correctAnswers.join(" ou ")}`,
          };
        }

        // Autres criteres (demarche, etc.): scorer a 0 si pas visible dans raw
        return {
          criterionId: criterion.id,
          description: criterion.description,
          pointsEarned: 0,
          maxPoints: criterion.maxPoints,
          met: false,
          partialCredit: false,
          feedback: "Non evalue automatiquement: verification manuelle recommandee",
          evidenceFromAnswer: "",
          evidenceFromSolution: criterion.evaluationGuide,
        };
      }
    );

    const earnedPoints = criteriaEvaluations.reduce((sum, c) => sum + c.pointsEarned, 0);
    const totalScore = Math.round((earnedPoints / maxPoints) * 100);

    return {
      canScoreLocally: true,
      totalScore,
      earnedPoints,
      maxPoints,
      criteriaEvaluations,
      confidence: scoreResult.isCorrect ? 95 : 80,
    };
  }

  // ---------------------------------------------------------
  // SCORING FILL_BLANK (deterministe par trou)
  // ---------------------------------------------------------
  private scoreFillBlank(answer: StudentAnswer, solution: TeacherSolution): LocalScoringResult {
    // Separer les reponses par trou
    const studentAnswers = (answer.normalizedAnswer || answer.raw)
      .split("|")
      .map((a) => a.trim().toLowerCase());

    const correctAnswers = Array.isArray(solution.correctAnswer)
      ? solution.correctAnswer.map((a) => a.toLowerCase().trim())
      : [solution.correctAnswer.toLowerCase().trim()];

    const maxPoints = solution.gradingRubric.reduce((sum, r) => sum + r.maxPoints, 0);
    let earnedPoints = 0;

    const criteriaEvaluations: CriterionEvaluation[] = solution.gradingRubric.map(
      (criterion, index) => {
        const studentAns = studentAnswers[index] || "";
        const expectedAns = correctAnswers[index] || "";
        const variants = solution.acceptedVariants?.filter(
          (v) => v.startsWith(`${index}:`)
        ).map((v) => v.replace(`${index}:`, "").trim()) || [];

        const allAccepted = [expectedAns, ...variants];
        const isCorrect = allAccepted.some(
          (accepted) => studentAns === accepted.toLowerCase()
        );

        const pointsForThisBlank = isCorrect ? criterion.maxPoints : 0;
        earnedPoints += pointsForThisBlank;

        return {
          criterionId: criterion.id,
          description: criterion.description,
          pointsEarned: pointsForThisBlank,
          maxPoints: criterion.maxPoints,
          met: isCorrect,
          partialCredit: false,
          feedback: isCorrect
            ? `Correct pour le trou ${index + 1}.`
            : `Incorrect pour le trou ${index + 1}. Vous avez ecrit "${studentAns}".`,
          evidenceFromAnswer: `Trou ${index + 1}: "${studentAns}"`,
          evidenceFromSolution: `Attendu: "${expectedAns}"`,
        };
      }
    );

    const totalScore = Math.round((earnedPoints / maxPoints) * 100);

    return {
      canScoreLocally: true,
      totalScore,
      earnedPoints,
      maxPoints,
      criteriaEvaluations,
      confidence: 95,
    };
  }

  // ---------------------------------------------------------
  // FALLBACK: Deleguer a l'IA
  // ---------------------------------------------------------
  private cannotScoreLocally(solution: TeacherSolution): LocalScoringResult {
    const maxPoints = solution.gradingRubric.reduce((sum, r) => sum + r.maxPoints, 0);
    return {
      canScoreLocally: false,
      totalScore: 0,
      earnedPoints: 0,
      maxPoints,
      criteriaEvaluations: [],
      confidence: 0,
    };
  }

  // ---------------------------------------------------------
  // HELPER: Feedback pour QCM
  // ---------------------------------------------------------
  private getMCQFeedback(
    selected: string[],
    correct: string[],
    criterion: GradingCriterion
  ): string {
    const wronglySelected = selected.filter((s) => !correct.includes(s));
    const missedOptions = correct.filter((c) => !selected.includes(c));

    const parts: string[] = [];
    if (missedOptions.length > 0) {
      parts.push(`Option(s) manquante(s): ${missedOptions.join(", ")}`);
    }
    if (wronglySelected.length > 0) {
      parts.push(`Option(s) incorrecte(s) choisie(s): ${wronglySelected.join(", ")}`);
    }

    return parts.join(". ");
  }

  // ---------------------------------------------------------
  // GENERATEUR DE FEEDBACK PEDAGOGIQUE (scoring local)
  // ---------------------------------------------------------
  static generatePedagogicalFeedback(
    exerciseType: ExerciseType,
    totalScore: number,
    identifiedMistakePattern?: string,
    solution?: TeacherSolution
  ): {
    globalFeedback: string;
    strengths: string[];
    improvements: string[];
  } {
    // Feedback de base selon le score
    let globalFeedback: string;
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (totalScore === 100) {
      globalFeedback = "Excellent travail ! Vous avez parfaitement repondu a cet exercice. Continuez sur cette lancee !";
      strengths.push("Reponse entierement correcte");
      strengths.push("Bonne maitrise du concept");
    } else if (totalScore >= 80) {
      globalFeedback = "Tres bien ! Vous avez presque tout bon. Quelques petits points a affiner.";
      strengths.push("Bonne comprehension generale");
      improvements.push("Verifier les details manques");
    } else if (totalScore >= 60) {
      globalFeedback = "Bien ! Vous etes sur la bonne voie. Quelques elements importants necessitent de la revision.";
      strengths.push("Comprehension partielle du concept");
      improvements.push("Revoir les elements manquants");
      improvements.push("Relire le cours sur ce chapitre");
    } else if (totalScore >= 40) {
      globalFeedback = "Vous avez tente l'exercice, c'est bien ! Mais des lacunes importantes sont a combler. Ne vous decouragez pas !";
      improvements.push("Reprendre le cours depuis le debut");
      improvements.push("Faire des exercices supplementaires");
    } else {
      globalFeedback = "Cet exercice vous a pose des difficultes. C'est normal ! Revoyez le cours et n'hesitez pas a demander de l'aide a votre professeur.";
      improvements.push("Consulter le cours en detail");
      improvements.push("Demander une explication au professeur");
    }

    // Feedback specifique a l'erreur detectee
    if (identifiedMistakePattern && solution) {
      const mistake = solution.commonMistakes.find((m) =>
        identifiedMistakePattern.includes(m.pattern)
      );
      if (mistake) {
        improvements.push(mistake.pedagogicalHint);
      }
    }

    return { globalFeedback, strengths, improvements };
  }
}
