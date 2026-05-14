// ============================================================
// FIREBASE CLOUD FUNCTIONS - POINTS D'ENTREE IA
// ============================================================

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { AIService } from "./ai.service";
import { SolutionRepository } from "../firebase/solution.repository";
import {
  StudentSubmission,
  TeacherSolution,
  HintLevel,
} from "../types/ai.types";

// Instance du service IA (singleton reutilise entre appels)
const aiService = new AIService({
  provider: (process.env.AI_PROVIDER as "gemini" | "openai") || "gemini",
  model: process.env.AI_MODEL || "gemini-1.5-pro",
  temperature: 0.1,
  maxOutputTokens: 4096,
  topK: 3,
  minimumRelevanceScore: 0.65,
  enableHallucinationGuard: true,
});

const solutionRepo = new SolutionRepository();

// -----------------------------------------------------------
// FUNCTION 1: CORRIGER UN EXERCICE
// -----------------------------------------------------------
export const gradeExercise = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentification requise");
    }

    const { submission } = data as { submission: StudentSubmission };
    if (!submission?.exerciseId || !submission?.answer) {
      throw new functions.https.HttpsError("invalid-argument", "Données de soumission invalides");
    }

    // Securite: l'eleve ne peut corriger que ses propres exercices
    const requesterId = context.auth.uid;
    const requesterDoc = await admin.firestore().collection("users").doc(requesterId).get();
    const role = requesterDoc.data()?.role || "student";

    if (role === "student" && submission.studentId !== requesterId) {
      throw new functions.https.HttpsError("permission-denied", "Accès refusé");
    }

    try {
      const result = await aiService.gradeExercise(submission);

      // Enregistrer dans l'historique
      await admin.firestore().collection("studentHistory").add({
        studentId: submission.studentId,
        courseId: submission.courseId,
        exerciseId: submission.exerciseId,
        exerciseType: submission.exerciseType,
        totalScore: result.totalScore,
        hintsRequested: submission.hintsRequested,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        attemptNumber: submission.attemptNumber,
      });

      return { success: true, result };
    } catch (error: any) {
      console.error("[gradeExercise]", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

// -----------------------------------------------------------
// FUNCTION 2: GENERER UN INDICE PROGRESSIF
// -----------------------------------------------------------
export const generateHint = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentification requise");
    }

    const { submission, hintLevel } = data as {
      submission: StudentSubmission;
      hintLevel: HintLevel;
    };

    if (!submission || ![1, 2, 3].includes(hintLevel)) {
      throw new functions.https.HttpsError("invalid-argument", "Niveau d'indice invalide (1-3)");
    }

    // Verifier si cet indice a deja ete genere (eviter duplicates)
    const existing = await admin.firestore()
      .collection("hintUsage")
      .where("studentId", "==", submission.studentId)
      .where("exerciseId", "==", submission.exerciseId)
      .where("hintLevel", "==", hintLevel)
      .limit(1)
      .get();

    if (!existing.empty) {
      const cached = existing.docs[0].data();
      return {
        success: true,
        hint: {
          level: cached.hintLevel,
          content: cached.content,
          conceptRevealed: cached.conceptRevealed,
          penaltyPercent: cached.penaltyPercent,
          remainingHints: 3 - hintLevel,
        },
        cached: true,
      };
    }

    try {
      const hint = await aiService.generateHint(submission, hintLevel);
      return { success: true, hint, cached: false };
    } catch (error: any) {
      console.error("[generateHint]", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

// -----------------------------------------------------------
// FUNCTION 3: ANALYSER LA PROGRESSION D'UN ELEVE
// -----------------------------------------------------------
export const analyzeStudentProgress = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentification requise");
    }

    const { studentId, courseId, periodDays = 30 } = data as {
      studentId: string;
      courseId: string;
      periodDays?: number;
    };

    const requesterId = context.auth.uid;
    const requesterDoc = await admin.firestore().collection("users").doc(requesterId).get();
    const role = requesterDoc.data()?.role || "student";

    if (role === "student" && studentId !== requesterId) {
      throw new functions.https.HttpsError("permission-denied", "Accès refusé");
    }

    try {
      const analysis = await aiService.analyzeStudentProgress(studentId, courseId, periodDays);
      return { success: true, analysis };
    } catch (error: any) {
      console.error("[analyzeStudentProgress]", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

// -----------------------------------------------------------
// FUNCTION 4: AJOUTER UNE SOLUTION DE PROFESSEUR
// -----------------------------------------------------------
export const addTeacherSolution = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentification requise");
    }

    const professorId = context.auth.uid;
    const professorDoc = await admin.firestore().collection("users").doc(professorId).get();
    const role = professorDoc.data()?.role;

    if (role !== "teacher" && role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Seuls les professeurs peuvent ajouter des solutions"
      );
    }

    const { solution } = data as { solution: TeacherSolution };
    if (!solution?.exerciseId || !solution?.correctAnswer) {
      throw new functions.https.HttpsError("invalid-argument", "Solution invalide");
    }

    try {
      solution.professorId = professorId;
      solution.createdAt = new Date();
      solution.updatedAt = new Date();

      const solutionId = await solutionRepo.saveSolution(solution);
      return { success: true, solutionId };
    } catch (error: any) {
      console.error("[addTeacherSolution]", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

// -----------------------------------------------------------
// FUNCTION 5: TRIGGER - Correction automatique a la soumission
// -----------------------------------------------------------
export const onSubmissionCreated = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .firestore.document("submissions/{submissionId}")
  .onCreate(async (snap, context) => {
    const submission = snap.data() as StudentSubmission;
    const submissionId = context.params.submissionId;

    console.log(`[onSubmissionCreated] Soumission: ${submissionId}`);

    try {
      await snap.ref.update({
        status: "GRADING",
        gradingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const result = await aiService.gradeExercise({ ...submission, id: submissionId });

      await snap.ref.update({
        status: "GRADED",
        gradingResult: result,
        gradedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mettre a jour l'historique de l'eleve
      await admin.firestore().collection("studentHistory").add({
        studentId: submission.studentId,
        courseId: submission.courseId,
        exerciseId: submission.exerciseId,
        exerciseType: submission.exerciseType,
        totalScore: result.totalScore,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[onSubmissionCreated] ${submissionId} corrige: ${result.totalScore}/100`);
    } catch (error: any) {
      console.error(`[onSubmissionCreated] Erreur ${submissionId}:`, error);
      await snap.ref.update({
        status: "GRADING_ERROR",
        gradingError: error.message,
        errorAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
