// ============================================================
// EXEMPLES CONCRETS D'UTILISATION DU SYSTEME IA
// ============================================================
// Ce fichier montre comment utiliser le systeme avec des cas reels

import { TeacherSolution, StudentSubmission } from "../types/ai.types";

// ===========================================================
// EXEMPLE 1: SOLUTION PROF - MATHEMATIQUES (Calcul)
// ===========================================================
export const EXAMPLE_MATH_SOLUTION: TeacherSolution = {
  id: "sol-math-3x4",
  exerciseId: "ex-6e-math-001",
  courseId: "math-6eme-2024",
  subjectArea: "mathematiques",
  gradeLevel: "6eme",
  exerciseType: "MATH",
  difficulty: "EASY",

  correctAnswer: "12",
  acceptedVariants: ["12.0", "douze", "= 12", "+12"],

  gradingRubric: [
    {
      id: "r1",
      description: "Resultat numerique correct: 12",
      maxPoints: 6,
      partialCreditAllowed: false,
      evaluationGuide: "La reponse finale doit etre exactement 12 (ou 12.0)",
      keywords: ["12"],
      exactMatch: false,
    },
    {
      id: "r2",
      description: "Demarche visible (ex: 3×4 ou 4×3)",
      maxPoints: 3,
      partialCreditAllowed: true,
      evaluationGuide: "L'eleve montre au moins une etape intermediaire",
      keywords: ["3×4", "4×3", "3*4", "4*3", "trois fois quatre"],
    },
    {
      id: "r3",
      description: "Unite ou contexte mentionne si demande",
      maxPoints: 1,
      partialCreditAllowed: false,
      evaluationGuide: "Si l'enonce demande une unite, elle doit apparaitre",
    },
  ],

  commonMistakes: [
    {
      pattern: "7",
      explanation: "Confusion addition/multiplication: 3+4=7 au lieu de 3×4=12",
      pedagogicalHint: "Rappeler la difference entre + (additionner) et × (multiplier)",
      frequencyScore: 0.4,
    },
    {
      pattern: "11 ou 13",
      explanation: "Erreur de calcul d'une unite",
      pedagogicalHint: "Verifier le calcul en utilisant la table de multiplication",
      frequencyScore: 0.2,
    },
    {
      pattern: "34",
      explanation: "Juxtaposition des chiffres au lieu de les multiplier",
      pedagogicalHint: "Le symbole × signifie repeter l'addition: 3×4 = 4+4+4",
      frequencyScore: 0.15,
    },
  ],

  pedagogicalContext:
    "Cet exercice verifie la maitrise des tables de multiplication. " +
    "La table de 3: 3×1=3, 3×2=6, 3×3=9, 3×4=12, 3×5=15. " +
    "La multiplication peut aussi etre vue comme une addition repetee: 3×4 = 4+4+4 = 12.",

  hints: [
    {
      level: 1,
      content: "Pensez aux tables de multiplication que vous avez appris.",
      revealedConcept: "tables de multiplication",
      penaltyPercent: 5,
    },
    {
      level: 2,
      content: "Quel est le resultat de la table de 3 pour le chiffre 4? (ou la table de 4 pour 3?)",
      revealedConcept: "table de 3, ligne 4",
      penaltyPercent: 10,
    },
    {
      level: 3,
      content:
        "Calculez: 4+4+4 (ajouter 4 trois fois) = ? C'est equivalent a 3×4.",
      revealedConcept: "addition repetee = multiplication",
      penaltyPercent: 20,
    },
  ],

  keywords: ["multiplication", "table", "produit", "trois", "quatre", "12"],
  createdAt: new Date("2024-09-01"),
  updatedAt: new Date("2024-09-01"),
  professorId: "prof-dupont-001",
};

// ===========================================================
// EXEMPLE 2: SOLUTION PROF - FRANCAIS (Texte Libre)
// ===========================================================
export const EXAMPLE_FRENCH_SOLUTION: TeacherSolution = {
  id: "sol-fr-def-metaphore",
  exerciseId: "ex-3e-fr-002",
  courseId: "francais-3eme-2024",
  subjectArea: "francais",
  gradeLevel: "3eme",
  exerciseType: "FREE_TEXT",
  difficulty: "MEDIUM",

  correctAnswer:
    "Une métaphore est une figure de style qui consiste à désigner une chose ou une réalité par un autre terme, sans utiliser un mot comparatif comme 'comme' ou 'tel que'.",

  acceptedVariants: [
    "figure de style sans outil de comparaison",
    "comparaison implicite sans comme ni tel que",
  ],

  gradingRubric: [
    {
      id: "r1",
      description: "Mention de 'figure de style' ou terme equivalent",
      maxPoints: 4,
      partialCreditAllowed: false,
      evaluationGuide: "L'eleve doit identifier la metaphore comme une figure de style ou figure rhethorique",
      keywords: ["figure de style", "figure rhethorique", "procede stylistique", "figure"],
    },
    {
      id: "r2",
      description: "Explication de l'absence d'outil comparatif",
      maxPoints: 4,
      partialCreditAllowed: true,
      evaluationGuide:
        "L'eleve doit mentionner que la metaphore ne contient pas 'comme', 'tel que', 'ainsi que', etc.",
      keywords: ["sans comme", "sans outil", "pas de comme", "implicite", "directe"],
    },
    {
      id: "r3",
      description: "Exemple donne ou illustration",
      maxPoints: 2,
      partialCreditAllowed: true,
      evaluationGuide: "Un exemple valide de metaphore est donne (bonus si pertinent)",
    },
  ],

  commonMistakes: [
    {
      pattern: "comparaison avec comme",
      explanation:
        "L'eleve confond metaphore et comparaison. La comparaison utilise 'comme' (ex: fort COMME un lion), la metaphore est directe (ex: c'est un lion)",
      pedagogicalHint: "Demander: y a-t-il un mot de comparaison comme 'comme' ou 'tel que'?",
      frequencyScore: 0.55,
    },
    {
      pattern: "definition trop vague",
      explanation: "L'eleve dit 'c'est quand on compare' sans preciser l'absence d'outil comparatif",
      pedagogicalHint: "Inviter a preciser: comment la metaphore compare-t-elle? Avec ou sans mot comparatif?",
      frequencyScore: 0.3,
    },
  ],

  pedagogicalContext:
    "La metaphore (du grec metaphora = transfert) est une figure de style fondamentale. " +
    "Difference cle: Comparaison = 'Pierre est fort COMME un lion' / Metaphore = 'Pierre est un lion'. " +
    "La metaphore etablit une identite directe, sans outil comparatif.",

  hints: [
    {
      level: 1,
      content: "Pensez aux figures de style que vous avez etudiees. Comment cette figure se distingue-t-elle de la comparaison?",
      revealedConcept: "figure de style, distinction avec comparaison",
      penaltyPercent: 5,
    },
    {
      level: 2,
      content: "La comparaison utilise 'comme' ou 'tel que'. Est-ce que la metaphore utilise ces mots?",
      revealedConcept: "absence d'outil comparatif",
      penaltyPercent: 10,
    },
    {
      level: 3,
      content:
        "Completez: 'Une metaphore est une figure de style qui compare deux choses de maniere _____ (directe/indirecte?), sans utiliser de mot _____ (comparatif comme 'comme').'",
      revealedConcept: "definition quasi-complete",
      penaltyPercent: 20,
    },
  ],

  keywords: ["metaphore", "figure de style", "comparaison", "comme", "implicite"],
  createdAt: new Date("2024-09-01"),
  updatedAt: new Date("2024-09-01"),
  professorId: "prof-martin-002",
};

// ===========================================================
// EXEMPLE 3: SOLUTION PROF - QCM (Sciences)
// ===========================================================
export const EXAMPLE_MCQ_SOLUTION: TeacherSolution = {
  id: "sol-svt-photosynthese",
  exerciseId: "ex-5e-svt-003",
  courseId: "svt-5eme-2024",
  subjectArea: "svt",
  gradeLevel: "5eme",
  exerciseType: "MCQ",
  difficulty: "MEDIUM",

  // Options correctes (QCM a choix multiple)
  correctAnswer: ["B", "D"],
  acceptedVariants: ["b", "d", "B et D", "D et B"],

  gradingRubric: [
    {
      id: "r1",
      description: "Option B selectionnee (CO2 est un reactif)",
      maxPoints: 5,
      partialCreditAllowed: false,
      evaluationGuide: "La photosynthese consomme du CO2 (dioxyde de carbone)",
      keywords: ["B", "CO2"],
      exactMatch: true,
    },
    {
      id: "r2",
      description: "Option D selectionnee (lumiere est necessaire)",
      maxPoints: 5,
      partialCreditAllowed: false,
      evaluationGuide: "La lumiere est indispensable comme source d'energie pour la photosynthese",
      keywords: ["D", "lumiere"],
      exactMatch: true,
    },
  ],

  commonMistakes: [
    {
      pattern: "A (O2 est consomme)",
      explanation:
        "L'O2 est PRODUIT par la photosynthese (produit), pas consomme (reactif). C'est la respiration qui consomme O2.",
      pedagogicalHint: "Distinguer les reactifs (ce qu'on consomme) des produits (ce qu'on fabrique)",
      frequencyScore: 0.45,
    },
    {
      pattern: "C (eau n'est pas impliquee)",
      explanation:
        "L'eau (H2O) est bien un reactif de la photosynthese: 6H2O + 6CO2 + lumiere → C6H12O6 + 6O2",
      pedagogicalHint: "Revoir l'equation de la photosynthese",
      frequencyScore: 0.25,
    },
  ],

  pedagogicalContext:
    "Equation de la photosynthese: 6CO2 + 6H2O + energie lumineuse → C6H12O6 (glucose) + 6O2. " +
    "REACTIFS (ce qu'on consomme): CO2, H2O, lumiere. " +
    "PRODUITS (ce qu'on fabrique): glucose, O2. " +
    "Lieu: chloroplastes (grace a la chlorophylle).",

  hints: [
    {
      level: 1,
      content: "Pensez a ce dont une plante a besoin pour fabriquer sa nourriture.",
      revealedConcept: "notion de reactifs necessaires",
      penaltyPercent: 5,
    },
    {
      level: 2,
      content: "La photosynthese est une reaction chimique. Quelles substances la plante 'consomme'-t-elle? (reactifs)",
      revealedConcept: "distinction reactifs/produits",
      penaltyPercent: 10,
    },
    {
      level: 3,
      content:
        "L'equation de la photosynthese a deux reactifs principaux: un gaz atmospherique (CO2) et une source d'energie que les plantes captent via leurs feuilles. Lesquelles parmi les options correspondent?",
      revealedConcept: "CO2 et lumiere comme reactifs",
      penaltyPercent: 20,
    },
  ],

  keywords: ["photosynthese", "reactifs", "CO2", "lumiere", "chlorophylle", "plante"],
  createdAt: new Date("2024-09-01"),
  updatedAt: new Date("2024-09-01"),
  professorId: "prof-leblanc-003",
};

// ===========================================================
// EXEMPLES DE SOUMISSIONS D'ELEVES
// ===========================================================
export const EXAMPLE_SUBMISSIONS: StudentSubmission[] = [
  // --- Soumission correcte MATH ---
  {
    id: "sub-001",
    studentId: "eleve-alice-001",
    exerciseId: "ex-6e-math-001",
    courseId: "math-6eme-2024",
    exerciseType: "MATH",
    answer: {
      raw: "12",
      mathExpression: "3×4=12",
    },
    hintsRequested: [],
    attemptNumber: 1,
    submittedAt: new Date(),
    timeSpentSeconds: 45,
  },

  // --- Soumission avec erreur classique MATH ---
  {
    id: "sub-002",
    studentId: "eleve-bob-002",
    exerciseId: "ex-6e-math-001",
    courseId: "math-6eme-2024",
    exerciseType: "MATH",
    answer: {
      raw: "7",
      mathExpression: "3+4=7",
    },
    hintsRequested: [1], // A deja utilise le 1er indice
    attemptNumber: 2,
    submittedAt: new Date(),
    timeSpentSeconds: 180,
  },

  // --- Soumission texte libre FRANCAIS (partielle) ---
  {
    id: "sub-003",
    studentId: "eleve-claire-003",
    exerciseId: "ex-3e-fr-002",
    courseId: "francais-3eme-2024",
    exerciseType: "FREE_TEXT",
    answer: {
      raw: "Une métaphore c'est quand on compare deux choses mais sans dire 'comme'.",
    },
    hintsRequested: [],
    attemptNumber: 1,
    submittedAt: new Date(),
    timeSpentSeconds: 120,
  },

  // --- Soumission QCM correcte ---
  {
    id: "sub-004",
    studentId: "eleve-david-004",
    exerciseId: "ex-5e-svt-003",
    courseId: "svt-5eme-2024",
    exerciseType: "MCQ",
    answer: {
      raw: "B,D",
      selectedOptions: ["B", "D"],
    },
    hintsRequested: [],
    attemptNumber: 1,
    submittedAt: new Date(),
    timeSpentSeconds: 30,
  },
];

// ===========================================================
// RESULTATS ATTENDUS (pour validation des tests)
// ===========================================================
export const EXPECTED_RESULTS = {
  // Alice: reponse correcte, score max
  "sub-001": {
    totalScore: 100,
    earnedPoints: 10,
    maxPoints: 10,
    hallucinationRisk: "LOW",
    shouldPassGuard: true,
  },

  // Bob: erreur classique (7 au lieu de 12), score partiel possible si demarche ok
  "sub-002": {
    totalScore: 0, // Resultat faux
    earnedPoints: 0,
    maxPoints: 10,
    shouldPassGuard: true,
    identifiedMistakePattern: "7", // Doit reconnaitre l'erreur addition/multiplication
  },

  // Claire: definition partiellement correcte
  "sub-003": {
    totalScoreMin: 40, // Doit avoir au moins 40% (mentionne l'absence de "comme")
    totalScoreMax: 70, // Pas les 100% (pas de mention "figure de style" explicite)
    shouldPassGuard: true,
  },

  // David: QCM parfait
  "sub-004": {
    totalScore: 100,
    earnedPoints: 10,
    maxPoints: 10,
    shouldPassGuard: true,
  },
};
