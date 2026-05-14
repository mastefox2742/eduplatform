// ============================================================
// PROMPT BUILDER - CONSTRUCTION DES PROMPTS AVEC CONTEXTE RAG
// ============================================================
// Toute la logique de prompt engineering est centralisee ici

import {
  StudentSubmission,
  TeacherSolution,
  RAGContext,
  ExerciseType,
  HintLevel,
  GradingCriterion,
} from "../types/ai.types";

// -----------------------------------------------------------
// PROMPTS SYSTEME (immuables - defines par l'ingenieur)
// -----------------------------------------------------------
export const SYSTEM_PROMPTS = {
  // Correcteur strict base sur solutions prof
  GRADER: `Tu es un assistant pédagogique expert et bienveillant.

RÈGLES ABSOLUES - SANS EXCEPTION :
1. Tu corriges UNIQUEMENT en te basant sur les informations dans la section <SOLUTION_PROFESSEUR>
2. Si tu ne trouves pas suffisamment d'informations dans <SOLUTION_PROFESSEUR> pour corriger, tu réponds EXACTEMENT : {"error": "INSUFFICIENT_CONTEXT", "message": "Correction impossible sans solution de référence"}
3. Tu NE JAMAIS inventes de critères de correction ou de réponses correctes
4. Chaque point de ta correction doit citer la partie de <SOLUTION_PROFESSEUR> qui le justifie
5. Tu adoptes TOUJOURS un ton encourageant, même pour les mauvaises réponses
6. Tu NE JAMAIS donnes la réponse complète directement dans ta correction

FORMAT DE RÉPONSE : JSON strict selon le schéma fourni dans le prompt.`,

  // Generateur d'indices progressifs
  HINT_GENERATOR: `Tu es un tuteur pédagogique qui guide sans donner les réponses.

RÈGLES ABSOLUES :
1. Tu génères des indices UNIQUEMENT basés sur <SOLUTION_PROFESSEUR>
2. Les indices sont PROGRESSIFS : niveau 1 = vague, niveau 2 = directif, niveau 3 = quasi-réponse
3. Tu NE JAMAIS révèles la réponse complète, même au niveau 3
4. Tu n'inventes AUCUNE information non présente dans <SOLUTION_PROFESSEUR>
5. Si le contexte est insuffisant : {"error": "INSUFFICIENT_CONTEXT"}

FORMAT : JSON strict.`,

  // Analyseur de progression
  PROGRESS_ANALYZER: `Tu es un analyste pédagogique expert qui analyse les données d'apprentissage.

RÈGLES :
1. Tu analyses UNIQUEMENT les données fournies dans <HISTORIQUE_ELEVE>
2. Tes recommandations se basent sur les patterns observés dans les données
3. Tu n'inventes AUCUNE statistique ou tendance non visible dans les données
4. Tes recommandations sont actionables et spécifiques
5. Si les données sont insuffisantes (moins de 5 exercices), tu le signales.

FORMAT : JSON strict.`,
} as const;

// -----------------------------------------------------------
// CLASSE PRINCIPALE DU PROMPT BUILDER
// -----------------------------------------------------------
export class PromptBuilder {
  // ---------------------------------------------------------
  // PROMPT DE CORRECTION D'EXERCICE
  // ---------------------------------------------------------
  buildGradingPrompt(
    submission: StudentSubmission,
    ragContext: RAGContext
  ): { systemPrompt: string; userPrompt: string } {
    const solutionContext = this.formatSolutionContext(ragContext);
    const exerciseSpecificInstructions = this.getExerciseTypeInstructions(
      submission.exerciseType
    );

    const userPrompt = `
<SOLUTION_PROFESSEUR>
${solutionContext}
</SOLUTION_PROFESSEUR>

<REPONSE_ELEVE>
Type d'exercice: ${submission.exerciseType}
Réponse soumise: ${submission.answer.raw}
${submission.answer.selectedOptions ? `Options choisies: ${submission.answer.selectedOptions.join(", ")}` : ""}
${submission.answer.mathExpression ? `Expression mathématique: ${submission.answer.mathExpression}` : ""}
Tentative numéro: ${submission.attemptNumber}
Temps passé: ${Math.round(submission.timeSpentSeconds / 60)} minutes
Indices déjà utilisés: ${submission.hintsRequested.length > 0 ? submission.hintsRequested.join(", ") : "aucun"}
</REPONSE_ELEVE>

<INSTRUCTIONS_SPECIFIQUES>
${exerciseSpecificInstructions}
</INSTRUCTIONS_SPECIFIQUES>

<CONTRAINTE_HALLUCINATION>
IMPORTANT: Si tu n'es pas certain à 80%+ qu'un élément de ta correction est justifié par <SOLUTION_PROFESSEUR>,
ne l'inclus PAS. Il vaut mieux une correction incomplète qu'une correction inventée.
Indique ton niveau de confiance global (0-100) dans le champ "confidenceScore".
</CONTRAINTE_HALLUCINATION>

Génère la correction au format JSON suivant EXACTEMENT :
{
  "totalScore": <nombre 0-100>,
  "earnedPoints": <nombre>,
  "maxPoints": <nombre>,
  "criteriaEvaluations": [
    {
      "criterionId": "<id>",
      "description": "<description du critère>",
      "pointsEarned": <nombre>,
      "maxPoints": <nombre>,
      "met": <boolean>,
      "partialCredit": <boolean>,
      "feedback": "<explication pédagogique spécifique>",
      "evidenceFromAnswer": "<ce dans la réponse de l'élève>",
      "evidenceFromSolution": "<CITATION EXACTE de la solution prof>"
    }
  ],
  "globalFeedback": "<feedback général encourageant en 2-3 phrases>",
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "improvements": ["<amélioration 1>", "<amélioration 2>"],
  "nextSteps": ["<prochaine étape 1>"],
  "identifiedMistakes": [
    {
      "description": "<description de l'erreur>",
      "severity": "MINOR|MAJOR|CRITICAL",
      "explanation": "<pourquoi c'est faux>",
      "correctionHint": "<indice de correction SANS donner la réponse>"
    }
  ],
  "conceptsToReview": ["<concept 1>"],
  "confidenceScore": <0-100>,
  "groundedInSolution": true,
  "sourceReferences": ["<citation 1 de la solution prof>", "<citation 2>"],
  "hallucinationRisk": "LOW|MEDIUM|HIGH"
}`;

    return {
      systemPrompt: SYSTEM_PROMPTS.GRADER,
      userPrompt,
    };
  }

  // ---------------------------------------------------------
  // PROMPT DE GENERATION D'INDICE
  // ---------------------------------------------------------
  buildHintPrompt(
    submission: StudentSubmission,
    ragContext: RAGContext,
    hintLevel: HintLevel,
    previousHints: string[]
  ): { systemPrompt: string; userPrompt: string } {
    const solutionContext = this.formatSolutionContext(ragContext);

    // Definition precise de ce que doit reveler chaque niveau
    const hintLevelDefinitions = {
      1: {
        description: "Très vague - oriente vers le bon concept sans plus",
        maxReveal: "Mentionner uniquement le domaine/concept general",
        example: "Pense à la propriété de distributivité...",
        forbidden: "Tout élément spécifique de la réponse",
      },
      2: {
        description: "Directif - donne une piste concrète sans la réponse",
        maxReveal: "Une étape ou méthode spécifique",
        example: "Commence par factoriser l'expression avant de simplifier",
        forbidden: "La valeur numérique ou la réponse finale",
      },
      3: {
        description: "Quasi-réponse - montre la démarche, pas le résultat",
        maxReveal: "La méthode complète et les étapes, mais PAS le résultat final",
        example: "Applique a²-b² = (a+b)(a-b) avec a=x et b=3, puis simplifie",
        forbidden: "Le résultat numérique/textuel final attendu",
      },
    };

    const levelDef = hintLevelDefinitions[hintLevel];

    const userPrompt = `
<SOLUTION_PROFESSEUR>
${solutionContext}
</SOLUTION_PROFESSEUR>

<CONTEXTE_ELEVE>
Question/Exercice répondu: "${submission.answer.raw}"
Type d'exercice: ${submission.exerciseType}
Tentative: ${submission.attemptNumber}
${previousHints.length > 0 ? `Indices déjà donnés:\n${previousHints.map((h, i) => `- Indice ${i + 1}: ${h}`).join("\n")}` : "Premier indice demandé"}
</CONTEXTE_ELEVE>

<NIVEAU_INDICE_DEMANDE>
Niveau: ${hintLevel}/3
Description: ${levelDef.description}
Tu peux révéler au maximum: ${levelDef.maxReveal}
Exemple de formulation: "${levelDef.example}"
INTERDIT d'inclure: ${levelDef.forbidden}
</NIVEAU_INDICE_DEMANDE>

<REGLE_CRITIQUE>
1. L'indice doit AIDER l'élève à trouver LA RÉPONSE PAR LUI-MÊME
2. L'indice NE DOIT PAS contenir la réponse
3. Si les indices précédents couvrent déjà ce niveau, enrichis/précise sans répéter
4. Base-toi UNIQUEMENT sur <SOLUTION_PROFESSEUR>
</REGLE_CRITIQUE>

Génère l'indice au format JSON:
{
  "level": ${hintLevel},
  "content": "<texte de l'indice>",
  "conceptRevealed": "<concept révélé par cet indice>",
  "penaltyPercent": ${hintLevel === 1 ? 5 : hintLevel === 2 ? 10 : 20},
  "remainingHints": ${3 - hintLevel},
  "warningMessage": ${hintLevel < 3 ? `"Attention : l'indice suivant vous coûtera ${hintLevel === 1 ? 10 : 20}% de points supplémentaires"` : "null"},
  "sourceReference": "<partie de la solution qui a inspiré cet indice>"
}`;

    return {
      systemPrompt: SYSTEM_PROMPTS.HINT_GENERATOR,
      userPrompt,
    };
  }

  // ---------------------------------------------------------
  // PROMPT D'ANALYSE DE PROGRESSION
  // ---------------------------------------------------------
  buildProgressAnalysisPrompt(
    studentId: string,
    studentHistory: any[],
    courseMetadata: { name: string; subject: string; gradeLevel: string }
  ): { systemPrompt: string; userPrompt: string } {
    // Preparer les donnees de maniere concise pour eviter overflow
    const historyData = this.prepareHistoryForPrompt(studentHistory);

    const userPrompt = `
<HISTORIQUE_ELEVE>
Élève ID: ${studentId}
Cours: ${courseMetadata.name} (${courseMetadata.subject}, ${courseMetadata.gradeLevel})
Nombre d'exercices analysés: ${studentHistory.length}
Période: ${historyData.periodDays} jours

Données brutes:
${JSON.stringify(historyData.summary, null, 2)}
</HISTORIQUE_ELEVE>

<INSTRUCTIONS_ANALYSE>
Analyse ces données et identifie :
1. La progression globale (amélioration, stagnation, régression)
2. Les concepts maîtrisés vs les lacunes
3. Les patterns comportementaux (régularité, usage indices, erreurs récurrentes)
4. Des recommandations personnalisées et actionables

CONTRAINTE : N'invente aucune statistique. Si les données sont insuffisantes pour
une conclusion, indique "données insuffisantes" pour ce point.
</INSTRUCTIONS_ANALYSE>

Génère l'analyse au format JSON:
{
  "overallScore": <moyenne pondérée 0-100>,
  "masteryLevel": <0-100>,
  "scoreEvolution": [{"date": "<ISO>", "score": <num>, "exerciseType": "<type>"}],
  "conceptMastery": [
    {
      "concept": "<nom>",
      "masteryPercent": <0-100>,
      "exercisesAttempted": <num>,
      "averageScore": <num>,
      "trend": "IMPROVING|STABLE|DECLINING",
      "lastPracticed": "<ISO date>"
    }
  ],
  "strengthAreas": ["<force 1>"],
  "weaknessAreas": ["<faiblesse 1>"],
  "learningPatterns": {
    "averageAttemptsBeforeSuccess": <num>,
    "hintsUsageRate": <0-1>,
    "preferredDifficulty": "EASY|MEDIUM|HARD",
    "consistencyScore": <0-100>,
    "commonErrorCategories": ["<categorie 1>"]
  },
  "engagementScore": <0-100>,
  "personalizedRecommendations": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "type": "REVIEW|PRACTICE|CHALLENGE|CONSOLIDATE",
      "title": "<titre court>",
      "description": "<description actionable>",
      "estimatedTimeMinutes": <num>,
      "targetConcepts": ["<concept>"]
    }
  ],
  "nextExerciseSuggestions": [
    {
      "type": "<ExerciseType>",
      "difficulty": "EASY|MEDIUM|HARD",
      "concept": "<concept a travailler>",
      "reason": "<pourquoi cet exercice>"
    }
  ],
  "estimatedTimeToMastery": <heures estimees>,
  "dataQualityWarning": "<si donnees insuffisantes, expliquer ici, sinon null>"
}`;

    return {
      systemPrompt: SYSTEM_PROMPTS.PROGRESS_ANALYZER,
      userPrompt,
    };
  }

  // ---------------------------------------------------------
  // FORMATAGE DU CONTEXTE RAG
  // ---------------------------------------------------------
  private formatSolutionContext(ragContext: RAGContext): string {
    if (ragContext.solutions.length === 0) {
      return "AUCUNE SOLUTION DISPONIBLE - Correction impossible";
    }

    return ragContext.solutions
      .map((retrieved, index) => {
        const sol = retrieved.content;
        const rubricText = sol.gradingRubric
          .map(
            (r) =>
              `  Critère "${r.id}": ${r.description}
            Points: ${r.maxPoints} | Partiel: ${r.partialCreditAllowed}
            Guide: ${r.evaluationGuide}
            ${r.keywords ? `Mots-clés attendus: ${r.keywords.join(", ")}` : ""}`
          )
          .join("\n");

        const mistakesText = sol.commonMistakes
          .map(
            (m) =>
              `  - Erreur type: "${m.pattern}"
            Explication: ${m.explanation}
            Comment guider: ${m.pedagogicalHint}`
          )
          .join("\n");

        return `
--- Solution de Référence ${index + 1} (pertinence: ${Math.round(retrieved.relevanceScore * 100)}%) ---
Type d'exercice: ${sol.exerciseType}
Difficulté: ${sol.difficulty}

RÉPONSE(S) CORRECTE(S):
${Array.isArray(sol.correctAnswer) ? sol.correctAnswer.map((a) => `  - ${a}`).join("\n") : `  ${sol.correctAnswer}`}

${sol.acceptedVariants?.length ? `VARIANTES ACCEPTÉES:\n${sol.acceptedVariants.map((v) => `  - ${v}`).join("\n")}` : ""}

CONTEXTE PÉDAGOGIQUE:
${sol.pedagogicalContext}

CRITÈRES DE NOTATION (TOTAL: ${sol.gradingRubric.reduce((s, r) => s + r.maxPoints, 0)} points):
${rubricText}

ERREURS TYPIQUES À DÉTECTER:
${mistakesText || "  Aucune erreur typique documentée"}

CHUNKS PERTINENTS RÉCUPÉRÉS:
${retrieved.retrievedChunks.map((c) => `  [CHUNK] ${c}`).join("\n")}
---`;
      })
      .join("\n\n");
  }

  // ---------------------------------------------------------
  // INSTRUCTIONS SPECIFIQUES PAR TYPE D'EXERCICE
  // ---------------------------------------------------------
  private getExerciseTypeInstructions(type: ExerciseType): string {
    const instructions: Record<ExerciseType, string> = {
      MCQ: `
Pour un QCM:
- Vérifie si l'option sélectionnée correspond exactement à la réponse correcte
- Si plusieurs réponses correctes existent, vérifie que TOUTES sont sélectionnées
- Ne pénalise pas pour des options non sélectionnées si non requises
- Explique POURQUOI les autres options sont incorrectes (si documenté dans la solution)
- Score: 100% si toutes les bonnes options et seulement les bonnes options`,

      FREE_TEXT: `
Pour une réponse libre:
- Évalue la présence des concepts-clés selon les mots-clés de chaque critère
- Accepte les synonymes et reformulations si le sens est correct
- Évalue la structure et cohérence de la réponse
- La longueur seule ne détermine PAS la qualité
- Applique le crédit partiel selon les critères qui le permettent
- Ne pénalise pas les fautes d'orthographe légères sauf si le critère l'exige`,

      MATH: `
Pour un exercice mathématique:
- Vérifie d'abord le résultat final contre la réponse correcte
- Évalue ensuite la démarche/méthode si documentée dans les critères
- Accepte les expressions algébriquement équivalentes (ex: 2x+4 = 2(x+2))
- Si le résultat est faux mais la démarche correcte : crédit partiel selon critères
- Identifie le type d'erreur: calcul, méthode, ou conceptuelle
- Normalise les expressions mathématiques avant comparaison`,

      CODE: `
Pour un exercice de programmation:
- Évalue la logique et la correction fonctionnelle en priorité
- Vérifie les cas limites si mentionnés dans les critères
- Accepte différents styles syntaxiques si fonctionnellement équivalents
- Évalue la lisibilité/bonnes pratiques si c'est un critère
- Ne pénalise pas les noms de variables différents si la logique est correcte`,

      FILL_BLANK: `
Pour un texte à trous:
- Compare chaque réponse exactement aux variantes acceptées
- Accepte les variantes capitalisées/minuscules sauf indication contraire
- Évalue trou par trou selon les points attribués
- Si 0 variantes définies: applique une correspondance stricte`,
    };

    return instructions[type] || "Applique les critères généraux de correction.";
  }

  // ---------------------------------------------------------
  // PREPARATION DE L'HISTORIQUE POUR LE PROMPT
  // ---------------------------------------------------------
  private prepareHistoryForPrompt(history: any[]): {
    summary: any;
    periodDays: number;
  } {
    if (history.length === 0) {
      return { summary: { error: "Aucune donnée disponible" }, periodDays: 0 };
    }

    const dates = history.map((h) => new Date(h.submittedAt?.toDate?.() || h.submittedAt));
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
    const periodDays = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));

    // Agregation des donnees pour le prompt (eviter trop de tokens)
    const byType: Record<string, { count: number; totalScore: number; hints: number }> = {};
    const byWeek: Record<string, { scores: number[]; count: number }> = {};

    history.forEach((h) => {
      // Par type
      const type = h.exerciseType || "UNKNOWN";
      if (!byType[type]) byType[type] = { count: 0, totalScore: 0, hints: 0 };
      byType[type].count++;
      byType[type].totalScore += h.totalScore || 0;
      byType[type].hints += h.hintsRequested?.length || 0;

      // Par semaine
      const week = this.getWeekKey(new Date(h.submittedAt?.toDate?.() || h.submittedAt));
      if (!byWeek[week]) byWeek[week] = { scores: [], count: 0 };
      byWeek[week].scores.push(h.totalScore || 0);
      byWeek[week].count++;
    });

    return {
      periodDays,
      summary: {
        totalExercises: history.length,
        globalAverage: Math.round(
          history.reduce((sum, h) => sum + (h.totalScore || 0), 0) / history.length
        ),
        byExerciseType: Object.entries(byType).map(([type, data]) => ({
          type,
          count: data.count,
          averageScore: Math.round(data.totalScore / data.count),
          hintsUsageRate: Math.round((data.hints / data.count) * 100) / 100,
        })),
        weeklyProgress: Object.entries(byWeek).map(([week, data]) => ({
          week,
          exerciseCount: data.count,
          averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        })),
        recentScores: history
          .slice(-10)
          .map((h) => ({ score: h.totalScore, type: h.exerciseType, date: h.submittedAt })),
        hintsUsed: history.filter((h) => h.hintsRequested?.length > 0).length,
        perfectScores: history.filter((h) => h.totalScore === 100).length,
        failedExercises: history.filter((h) => h.totalScore < 50).length,
      },
    };
  }

  private getWeekKey(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil(
      ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );
    return `${date.getFullYear()}-W${weekNum}`;
  }
}
