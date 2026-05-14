// ============================================================
// CLOUD FUNCTIONS - ANALYSE DE PROGRESSION
// Agrégation des statistiques élèves avec IA
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {
  AnalyzeProgressRequest,
  ProgressAnalysisResult,
  StudentProgress,
  SubjectSummary,
  CustomClaims,
} from "../types";
import { writeAuditLog } from "../utils/audit";

const db = admin.firestore();

// ---------------------------------------------------------------
// CALLABLE FUNCTION : analyzeStudentProgress
// Agrège les statistiques de progression d'un élève
// Accessible par : direction, professeur (de l'élève), l'élève lui-même
// ---------------------------------------------------------------
export const analyzeStudentProgress = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (
    request: functions.https.CallableRequest<AnalyzeProgressRequest>
  ): Promise<ProgressAnalysisResult> => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const callerUid = request.auth.uid;
    const claims = request.auth.token as CustomClaims;
    const { studentUid, courseId, periodDays = 30 } = request.data;

    // Vérification des autorisations d'accès à la progression
    await verifyProgressAccess(callerUid, claims, studentUid);

    // Fenêtre temporelle d'analyse
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - periodDays);
    const fromTimestamp = admin.firestore.Timestamp.fromDate(fromDate);

    // Récupérer le profil de l'élève
    const studentDoc = await db.collection("students").doc(studentUid).get();
    if (!studentDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Student not found");
    }

    const student = studentDoc.data()!;

    // Récupérer toutes les progressions de la période
    let progressQuery = db
      .collection("progress")
      .doc(studentUid)
      .collection("courses")
      .where("lastAccessedAt", ">=", fromTimestamp);

    if (courseId) {
      progressQuery = progressQuery.where(
        admin.firestore.FieldPath.documentId(),
        "==",
        courseId
      );
    }

    const progressSnapshot = await progressQuery.get();
    const progressDocs = progressSnapshot.docs.map(
      (doc) => doc.data() as StudentProgress
    );

    // Agréger les statistiques
    const bySubject: SubjectSummary[] = [];
    let totalScore = 0;
    let scoreCount = 0;
    let totalTime = 0;
    let totalLessons = 0;
    let completedLessons = 0;

    for (const progress of progressDocs) {
      // Récupérer les infos du cours pour la matière
      const courseDoc = await db.collection("courses").doc(progress.courseId).get();
      const course = courseDoc.data();

      if (!course) continue;

      // Calculer la moyenne par cours
      const quizScores = progress.quizResults.map((q) => q.score);
      const avgScore =
        quizScores.length > 0
          ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length
          : 0;

      const courseTime = progress.quizResults.reduce(
        (sum, q) => sum + q.timeSpentSeconds,
        0
      );

      // Récupérer le nombre total de leçons du cours
      const lessonsSnapshot = await db
        .collection("courses")
        .doc(progress.courseId)
        .collection("lessons")
        .count()
        .get();

      const courseTotalLessons = lessonsSnapshot.data().count;
      const courseCompletedLessons = progress.lessonsCompleted.length;

      bySubject.push({
        subject: course.subject ?? "Inconnu",
        courseId: progress.courseId,
        completionPercentage:
          courseTotalLessons > 0
            ? Math.round((courseCompletedLessons / courseTotalLessons) * 100)
            : 0,
        averageScore: Math.round(avgScore),
        lastActivityAt: progress.lastAccessedAt.toDate().toISOString(),
      });

      totalScore += quizScores.reduce((a, b) => a + b, 0);
      scoreCount += quizScores.length;
      totalTime += courseTime;
      totalLessons += courseTotalLessons;
      completedLessons += courseCompletedLessons;
    }

    const averageScore =
      scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    // Déterminer la tendance (comparer première et deuxième moitié de la période)
    const progressTrend = calculateProgressTrend(progressDocs);

    // Générer des recommandations basiques (la version IA est dans callAI)
    const recommendations = generateBasicRecommendations(
      averageScore,
      completedLessons,
      totalLessons,
      bySubject
    );

    const result: ProgressAnalysisResult = {
      studentUid,
      schoolId: student.schoolId,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      summary: {
        totalLessons,
        completedLessons,
        averageScore,
        timeSpentMinutes: Math.round(totalTime / 60),
        progressTrend,
      },
      bySubject,
      recommendations,
    };

    await writeAuditLog({
      schoolId: student.schoolId,
      actorUid: callerUid,
      actorRole: claims.role,
      action: "progress.analyzed",
      targetId: studentUid,
      targetType: "student",
      metadata: {
        courseId: courseId ?? "all",
        periodDays,
        coursesAnalyzed: bySubject.length,
      },
    });

    return result;
  }
);

// ---------------------------------------------------------------
// TRIGGER : onProgressUpdate (aggregation temps réel)
// Mis à jour des stats globales quand une progression change
// ---------------------------------------------------------------
export const onProgressUpdate = functions.firestore.onDocumentWritten(
  {
    document: "progress/{studentUid}/courses/{courseId}",
    region: "europe-west1",
  },
  async (event) => {
    const { studentUid } = event.params;
    const after = event.data?.after;

    if (!after?.exists) return;

    const progress = after.data() as StudentProgress;

    // Recalculer les stats globales de l'élève
    const allProgressSnapshot = await db
      .collection("progress")
      .doc(studentUid)
      .collection("courses")
      .get();

    let totalCompleted = 0;
    let totalQuizzes = 0;
    let totalScore = 0;

    for (const doc of allProgressSnapshot.docs) {
      const p = doc.data() as StudentProgress;
      totalCompleted += p.lessonsCompleted.length;
      totalQuizzes += p.quizResults.length;
      totalScore += p.quizResults.reduce((sum, q) => sum + q.score, 0);
    }

    const avgScore = totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) : 0;

    // Mettre à jour les stats globales dans le profil élève
    await db.collection("students").doc(studentUid).update({
      "progressStats.totalLessonsCompleted": totalCompleted,
      "progressStats.totalQuizzesCompleted": totalQuizzes,
      "progressStats.averageScore": avgScore,
      "progressStats.lastActivityAt": progress.lastAccessedAt,
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }
);

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

async function verifyProgressAccess(
  callerUid: string,
  claims: CustomClaims,
  studentUid: string
): Promise<void> {
  // L'élève peut voir sa propre progression
  if (claims.role === "eleve" && callerUid === studentUid) return;

  // La direction peut tout voir dans son établissement
  if (claims.role === "direction") {
    const studentDoc = await db.collection("students").doc(studentUid).get();
    if (studentDoc.data()?.schoolId === claims.schoolId) return;
  }

  // Le professeur peut voir les élèves de ses classes
  if (claims.role === "professeur") {
    const studentDoc = await db.collection("students").doc(studentUid).get();
    const student = studentDoc.data();

    if (student?.schoolId !== claims.schoolId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Access denied: student not in your school"
      );
    }

    // Vérifier que le professeur enseigne à la classe de l'élève
    const courseSnapshot = await db
      .collection("courses")
      .where("teacherId", "==", callerUid)
      .where("classeIds", "array-contains", student.classeId)
      .limit(1)
      .get();

    if (!courseSnapshot.empty) return;
  }

  throw new functions.https.HttpsError(
    "permission-denied",
    "Access denied: insufficient permissions"
  );
}

function calculateProgressTrend(
  progressDocs: StudentProgress[]
): "improving" | "stable" | "declining" {
  if (progressDocs.length < 2) return "stable";

  // Comparer les scores de la première moitié vs deuxième moitié
  const sorted = progressDocs.sort(
    (a, b) =>
      a.lastAccessedAt.toMillis() - b.lastAccessedAt.toMillis()
  );

  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avgFirst =
    firstHalf
      .flatMap((p) => p.quizResults.map((q) => q.score))
      .reduce((a, b) => a + b, 0) /
    Math.max(firstHalf.flatMap((p) => p.quizResults).length, 1);

  const avgSecond =
    secondHalf
      .flatMap((p) => p.quizResults.map((q) => q.score))
      .reduce((a, b) => a + b, 0) /
    Math.max(secondHalf.flatMap((p) => p.quizResults).length, 1);

  const diff = avgSecond - avgFirst;
  if (diff > 5) return "improving";
  if (diff < -5) return "declining";
  return "stable";
}

function generateBasicRecommendations(
  averageScore: number,
  completedLessons: number,
  totalLessons: number,
  bySubject: SubjectSummary[]
): string[] {
  const recommendations: string[] = [];

  if (averageScore < 50) {
    recommendations.push(
      "Score moyen insuffisant. Revoir les leçons fondamentales avant de continuer."
    );
  } else if (averageScore < 70) {
    recommendations.push(
      "Des progrès sont visibles. Continuer les exercices de consolidation."
    );
  }

  const completionRate =
    totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  if (completionRate < 50) {
    recommendations.push(
      "Moins de 50% des leçons complétées. Augmenter la régularité du travail."
    );
  }

  // Identifier la matière la plus faible
  const weakSubject = bySubject.sort((a, b) => a.averageScore - b.averageScore)[0];
  if (weakSubject && weakSubject.averageScore < 60) {
    recommendations.push(
      `Focus recommandé sur : ${weakSubject.subject} (score moyen: ${weakSubject.averageScore}/100)`
    );
  }

  return recommendations;
}
