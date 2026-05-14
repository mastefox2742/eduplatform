// ============================================================
// NORMALISEUR D'EXERCICES
// ============================================================
// Normalise les reponses selon le type d'exercice avant correction
// Gere: QCM, texte libre, calcul mathematique

import { StudentSubmission, ExerciseType } from "../types/ai.types";

export class ExerciseNormalizer {

  // Point d'entree principal
  normalizeSubmission(submission: StudentSubmission): StudentSubmission {
    const normalized = { ...submission };
    normalized.answer = { ...submission.answer };

    switch (submission.exerciseType) {
      case "MCQ":
        normalized.answer = this.normalizeMCQ(submission.answer);
        break;
      case "FREE_TEXT":
        normalized.answer = this.normalizeFreeText(submission.answer);
        break;
      case "MATH":
        normalized.answer = this.normalizeMath(submission.answer);
        break;
      case "CODE":
        normalized.answer = this.normalizeCode(submission.answer);
        break;
      case "FILL_BLANK":
        normalized.answer = this.normalizeFillBlank(submission.answer);
        break;
    }

    return normalized;
  }

  // ---------------------------------------------------------
  // NORMALISATION QCM
  // ---------------------------------------------------------
  private normalizeMCQ(answer: any): any {
    const normalized = { ...answer };

    // Normaliser les options selectionnees
    if (answer.selectedOptions) {
      normalized.selectedOptions = answer.selectedOptions
        .map((opt: string) => opt.trim().toLowerCase())
        .sort(); // Trier pour comparaison independante de l'ordre
    }

    // Si la reponse brute est une lettre (A, B, C, D)
    if (answer.raw && /^[a-dA-D]$/.test(answer.raw.trim())) {
      normalized.raw = answer.raw.trim().toLowerCase();
      if (!normalized.selectedOptions) {
        normalized.selectedOptions = [normalized.raw];
      }
    }

    // Reponse multiple separee par virgule (ex: "A,C" ou "1,3")
    if (answer.raw && answer.raw.includes(",") && !normalized.selectedOptions) {
      normalized.selectedOptions = answer.raw
        .split(",")
        .map((opt: string) => opt.trim().toLowerCase())
        .sort();
    }

    normalized.normalizedAnswer = normalized.selectedOptions?.join("|") || normalized.raw?.toLowerCase();
    return normalized;
  }

  // ---------------------------------------------------------
  // NORMALISATION TEXTE LIBRE
  // ---------------------------------------------------------
  private normalizeFreeText(answer: any): any {
    const normalized = { ...answer };

    if (!answer.raw) return normalized;

    let text = answer.raw;

    // Normalisation de base
    text = text.trim();

    // Normaliser les espaces multiples
    text = text.replace(/\s+/g, " ");

    // Supprimer la ponctuation en fin de phrase pour comparaison
    // (mais garder le texte original dans raw)
    const cleanText = text
      .toLowerCase()
      .replace(/[.,;:!?]+$/, "") // Ponctuation finale
      .trim();

    normalized.normalizedAnswer = cleanText;
    return normalized;
  }

  // ---------------------------------------------------------
  // NORMALISATION MATHEMATIQUE
  // ---------------------------------------------------------
  private normalizeMath(answer: any): any {
    const normalized = { ...answer };

    if (!answer.raw) return normalized;

    let mathText = answer.raw.trim();

    // Detecter et normaliser les expressions mathematiques courantes
    // 1. Supprimer les espaces autour des operateurs
    mathText = mathText.replace(/\s*([\+\-\*\/\=\^])\s*/g, "$1");

    // 2. Normaliser la notation decimale (virgule -> point)
    mathText = mathText.replace(/(\d),(\d)/g, "$1.$2");

    // 3. Normaliser les fractions ecrites en texte (1/2 reste 1/2)
    // 4. Extraire juste le nombre si c'est une reponse numerique pure
    const numericMatch = mathText.match(/^-?\d+([.,]\d+)?$/);
    if (numericMatch) {
      const numValue = parseFloat(mathText.replace(",", "."));
      normalized.normalizedAnswer = String(numValue);
      normalized.mathExpression = normalized.normalizedAnswer;
    } else {
      // Expression algebrique: normaliser et stocker
      normalized.normalizedAnswer = mathText.toLowerCase();
      normalized.mathExpression = mathText;
    }

    return normalized;
  }

  // ---------------------------------------------------------
  // NORMALISATION CODE
  // ---------------------------------------------------------
  private normalizeCode(answer: any): any {
    const normalized = { ...answer };

    if (!answer.raw) return normalized;

    let code = answer.raw;

    // Supprimer les blocs de code markdown si presents
    code = code.replace(/```[\w]*\n?([\s\S]*?)```/g, "$1");

    // Normaliser les fins de ligne
    code = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Supprimer les commentaires pour la comparaison
    // (mais garder le code original dans raw)
    const codeWithoutComments = code
      .replace(/\/\*[\s\S]*?\*\//g, "") // Commentaires multi-lignes
      .replace(/\/\/.*/g, "")           // Commentaires une ligne
      .replace(/#.*/g, "")              // Commentaires Python/Ruby
      .trim();

    normalized.normalizedAnswer = codeWithoutComments;
    return normalized;
  }

  // ---------------------------------------------------------
  // NORMALISATION TEXTE A TROUS
  // ---------------------------------------------------------
  private normalizeFillBlank(answer: any): any {
    const normalized = { ...answer };

    if (!answer.raw) return normalized;

    // Si les reponses sont separees par des separateurs
    const separators = ["|", ";", "//", "---"];
    let answers: string[] = [answer.raw];

    for (const sep of separators) {
      if (answer.raw.includes(sep)) {
        answers = answer.raw.split(sep).map((a: string) => a.trim());
        break;
      }
    }

    // Normaliser chaque reponse individuelle
    const normalizedAnswers = answers.map((a) =>
      a.trim().toLowerCase().replace(/\s+/g, " ")
    );

    normalized.normalizedAnswer = normalizedAnswers.join("|");
    return normalized;
  }

  // ---------------------------------------------------------
  // COMPARAISON MATHEMATIQUE EXACTE
  // ---------------------------------------------------------
  static areMathematicallyEquivalent(
    studentAnswer: string,
    correctAnswer: string,
    tolerance: number = 0.001
  ): boolean {
    // Essai 1: Comparaison numerique directe
    const studentNum = parseFloat(studentAnswer.replace(",", "."));
    const correctNum = parseFloat(correctAnswer.replace(",", "."));

    if (!isNaN(studentNum) && !isNaN(correctNum)) {
      return Math.abs(studentNum - correctNum) <= tolerance;
    }

    // Essai 2: Comparaison textuelle normalisee
    const normalize = (s: string) =>
      s.toLowerCase().replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/");

    return normalize(studentAnswer) === normalize(correctAnswer);
  }

  // ---------------------------------------------------------
  // SCORING POUR EXERCICES MATH (exact + tolerance)
  // ---------------------------------------------------------
  static scoreMathAnswer(
    studentAnswer: string,
    correctAnswer: string | string[],
    maxPoints: number
  ): { points: number; isCorrect: boolean; matchedVariant?: string } {
    const answers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

    for (const answer of answers) {
      if (this.areMathematicallyEquivalent(studentAnswer, answer)) {
        return { points: maxPoints, isCorrect: true, matchedVariant: answer };
      }
    }

    return { points: 0, isCorrect: false };
  }

  // ---------------------------------------------------------
  // SCORING POUR QCM
  // ---------------------------------------------------------
  static scoreMCQAnswer(
    selectedOptions: string[],
    correctOptions: string[],
    maxPoints: number,
    partialCredit: boolean = true
  ): { points: number; percentage: number } {
    const normalizedSelected = new Set(selectedOptions.map((o) => o.toLowerCase().trim()));
    const normalizedCorrect = new Set(correctOptions.map((o) => o.toLowerCase().trim()));

    // Correspondance exacte (toutes les bonnes et seulement les bonnes)
    const isExactMatch =
      normalizedSelected.size === normalizedCorrect.size &&
      [...normalizedCorrect].every((opt) => normalizedSelected.has(opt));

    if (isExactMatch) {
      return { points: maxPoints, percentage: 100 };
    }

    if (!partialCredit) {
      return { points: 0, percentage: 0 };
    }

    // Credit partiel: points pour les bonnes options, penalite pour les mauvaises
    let correctSelected = 0;
    let incorrectSelected = 0;

    normalizedSelected.forEach((opt) => {
      if (normalizedCorrect.has(opt)) {
        correctSelected++;
      } else {
        incorrectSelected++;
      }
    });

    // Score partiel: (bonnes - mauvaises) / total_bonnes
    const partialScore = Math.max(
      0,
      (correctSelected - incorrectSelected) / normalizedCorrect.size
    );

    return {
      points: Math.round(maxPoints * partialScore * 10) / 10,
      percentage: Math.round(partialScore * 100),
    };
  }
}
