// ============================================================
// CLOUD FUNCTIONS - MONITORING, ALERTES ET QUOTAS
// Surveillance de la santé du système et détection d'anomalies
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { writeAuditLog } from "../utils/audit";

const db = admin.firestore();

// ---------------------------------------------------------------
// SCHEDULED FUNCTION : systemHealthCheck
// Vérifie les métriques clés et envoie des alertes si nécessaire
// Exécuté toutes les heures
// ---------------------------------------------------------------
export const systemHealthCheck = functions.scheduler.onSchedule(
  {
    schedule: "0 * * * *",
    region: "europe-west1",
    timeZone: "Europe/Paris",
    memory: "256MiB",
  },
  async () => {
    const alerts: string[] = [];
    const metrics: Record<string, number> = {};

    // 1. Vérifier la file de suppression RGPD (délai de traitement)
    const pendingDeletions = await db
      .collection("_deletionQueue")
      .where("status", "==", "pending")
      .count()
      .get();

    metrics.pendingDeletions = pendingDeletions.data().count;
    if (metrics.pendingDeletions > 100) {
      alerts.push(
        `ALERTE: ${metrics.pendingDeletions} suppressions RGPD en attente (seuil: 100)`
      );
    }

    // 2. Vérifier les suppressions échouées
    const failedDeletions = await db
      .collection("_deletionQueue")
      .where("status", "==", "failed")
      .count()
      .get();

    metrics.failedDeletions = failedDeletions.data().count;
    if (metrics.failedDeletions > 0) {
      alerts.push(
        `CRITIQUE: ${metrics.failedDeletions} suppressions RGPD échouées - intervention requise`
      );
    }

    // 3. Vérifier l'utilisation des tokens IA (dépassement de quota)
    const today = new Date().toISOString().split("T")[0];
    const aiUsageSnapshot = await db
      .collection("_aiUsage")
      .get();

    let totalDailyTokens = 0;
    for (const schoolDoc of aiUsageSnapshot.docs) {
      const dailyDoc = await schoolDoc.ref.collection("daily").doc(today).get();
      if (dailyDoc.exists) {
        const tokens = dailyDoc.data()?.tokensUsed ?? 0;
        totalDailyTokens += tokens;

        // Alerte si une école dépasse 500k tokens par jour
        if (tokens > 500000) {
          alerts.push(
            `QUOTA IA: École ${schoolDoc.id} a utilisé ${tokens} tokens aujourd'hui`
          );
        }
      }
    }

    metrics.totalDailyAITokens = totalDailyTokens;

    // 4. Vérifier les erreurs récentes dans les logs d'audit
    const oneHourAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 60 * 60 * 1000)
    );

    const recentErrors = await db
      .collection("auditLogs")
      .where("action", ">=", "error.")
      .where("timestamp", ">=", oneHourAgo)
      .count()
      .get();

    metrics.recentErrors = recentErrors.data().count;
    if (metrics.recentErrors > 50) {
      alerts.push(
        `ALERTE: ${metrics.recentErrors} erreurs système dans la dernière heure`
      );
    }

    // 5. Vérifier les tentatives d'accès non autorisées
    const unauthorizedAttempts = await db
      .collection("auditLogs")
      .where("action", "in", [
        "student.create.unauthorized",
        "progress.access.denied",
        "ai.query.blocked",
      ])
      .where("timestamp", ">=", oneHourAgo)
      .count()
      .get();

    metrics.unauthorizedAttempts = unauthorizedAttempts.data().count;
    if (metrics.unauthorizedAttempts > 10) {
      alerts.push(
        `SÉCURITÉ: ${metrics.unauthorizedAttempts} tentatives d'accès non autorisées dans la dernière heure`
      );
    }

    // Enregistrer les métriques
    await db.collection("_systemMetrics").add({
      timestamp: admin.firestore.Timestamp.now(),
      metrics,
      alertCount: alerts.length,
      alerts,
    });

    // Logger les alertes critiques
    if (alerts.length > 0) {
      functions.logger.error("System health alerts detected", {
        alertCount: alerts.length,
        alerts,
        metrics,
      });
    } else {
      functions.logger.info("System health check passed", { metrics });
    }
  }
);

// ---------------------------------------------------------------
// CALLABLE FUNCTION : getSystemMetrics
// Tableau de bord des métriques pour la direction
// ---------------------------------------------------------------
export const getSystemMetrics = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const claims = request.auth.token as { role?: string; schoolId?: string };
    if (claims.role !== "direction") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only direction can access system metrics"
      );
    }

    const schoolId = claims.schoolId!;
    const today = new Date().toISOString().split("T")[0];

    // Métriques de l'école
    const [
      activeStudents,
      activeProfesseurs,
      totalCourses,
      publishedCourses,
      aiDailyUsage,
      pendingDeletions,
    ] = await Promise.all([
      db.collection("students")
        .where("schoolId", "==", schoolId)
        .where("isActive", "==", true)
        .count()
        .get(),

      db.collection("users")
        .where("schoolId", "==", schoolId)
        .where("role", "==", "professeur")
        .where("isActive", "==", true)
        .count()
        .get(),

      db.collection("courses")
        .where("schoolId", "==", schoolId)
        .count()
        .get(),

      db.collection("courses")
        .where("schoolId", "==", schoolId)
        .where("isPublished", "==", true)
        .count()
        .get(),

      db.collection("_aiUsage")
        .doc(schoolId)
        .collection("daily")
        .doc(today)
        .get(),

      db.collection("_deletionQueue")
        .where("status", "==", "pending")
        .count()
        .get(),
    ]);

    return {
      school: {
        activeStudents: activeStudents.data().count,
        activeProfesseurs: activeProfesseurs.data().count,
        totalCourses: totalCourses.data().count,
        publishedCourses: publishedCourses.data().count,
      },
      ai: {
        dailyTokensUsed: aiDailyUsage.data()?.tokensUsed ?? 0,
        dailyRequestCount: aiDailyUsage.data()?.requestCount ?? 0,
        dailyTokenLimit: 1000000, // 1M tokens par jour par école
      },
      gdpr: {
        pendingDeletionRequests: pendingDeletions.data().count,
      },
      timestamp: new Date().toISOString(),
    };
  }
);

// ---------------------------------------------------------------
// TRIGGER : onSuspiciousActivity
// Détecte et log les activités suspectes en temps réel
// ---------------------------------------------------------------
export const detectSuspiciousActivity = functions.firestore.onDocumentCreated(
  {
    document: "auditLogs/{logId}",
    region: "europe-west1",
  },
  async (event) => {
    const log = event.data?.data();
    if (!log) return;

    const suspiciousActions = [
      "student.create.unauthorized",
      "user.role.changed",
      "gdpr.deletion.requested",
    ];

    if (suspiciousActions.includes(log.action)) {
      functions.logger.warn("Suspicious activity detected", {
        action: log.action,
        actorUid: log.actorUid,
        schoolId: log.schoolId,
        timestamp: log.timestamp,
        // NE PAS loguer les données sensibles
      });

      // En production: envoyer une alerte email/Slack à la direction
      // via un service d'emailing ou webhook
    }
  }
);

// ---------------------------------------------------------------
// CALLABLE FUNCTION : reportSecurityIncident
// Permet à la direction de signaler un incident de sécurité
// ---------------------------------------------------------------
export const reportSecurityIncident = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
  },
  async (
    request: functions.https.CallableRequest<{
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      affectedUsers?: string[];
    }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const claims = request.auth.token as { role?: string; schoolId?: string };
    if (claims.role !== "direction") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only direction can report security incidents"
      );
    }

    const { severity, description, affectedUsers = [] } = request.data;

    if (description.length > 2000) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Description must be under 2000 characters"
      );
    }

    const incidentRef = await db.collection("_securityIncidents").add({
      schoolId: claims.schoolId,
      reportedBy: request.auth.uid,
      severity,
      description,
      affectedUserCount: affectedUsers.length,
      // Ne stocker que les UIDs, pas les noms/emails
      affectedUserIds: affectedUsers.slice(0, 100),
      status: "open",
      createdAt: admin.firestore.Timestamp.now(),
      // Délai de notification légale : 72h pour les incidents graves (RGPD Art. 33)
      notificationDeadline:
        severity === "high" || severity === "critical"
          ? admin.firestore.Timestamp.fromDate(
              new Date(Date.now() + 72 * 60 * 60 * 1000)
            )
          : null,
    });

    await writeAuditLog({
      schoolId: claims.schoolId!,
      actorUid: request.auth.uid,
      actorRole: "direction",
      action: "security.incident.reported",
      targetId: incidentRef.id,
      targetType: "incident",
      metadata: {
        severity,
        affectedUserCount: affectedUsers.length,
      },
    });

    functions.logger.error("Security incident reported", {
      incidentId: incidentRef.id,
      severity,
      schoolId: claims.schoolId,
    });

    return {
      success: true,
      incidentId: incidentRef.id,
      notificationRequired:
        severity === "high" || severity === "critical",
      notificationDeadline:
        severity === "high" || severity === "critical"
          ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
          : null,
    };
  }
);
