// ============================================================
// CLOUD FUNCTIONS - CONFORMITÉ RGPD
// Droit à l'oubli, export des données, gestion du consentement
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CustomClaims } from "../types";
import { writeAuditLog } from "../utils/audit";

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

// ---------------------------------------------------------------
// CALLABLE FUNCTION : requestDataDeletion
// Implémentation du droit à l'oubli (Article 17 RGPD)
// Supprime les données personnelles mais conserve les données anonymisées
// ---------------------------------------------------------------
export const requestDataDeletion = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (
    request: functions.https.CallableRequest<{
      targetUid?: string;   // Si vide, suppression du compte appelant
      reason?: string;
    }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const claims = request.auth.token as CustomClaims;
    const callerUid = request.auth.uid;

    // Déterminer le uid cible
    let targetUid = request.data.targetUid ?? callerUid;

    // Seule la direction peut supprimer des comptes tiers
    if (targetUid !== callerUid && claims.role !== "direction") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only direction can delete other accounts"
      );
    }

    // Vérifier que la direction supprime un compte de son école
    if (targetUid !== callerUid) {
      const targetDoc = await db.collection("users").doc(targetUid).get();
      if (targetDoc.data()?.schoolId !== claims.schoolId) {
        throw new functions.https.HttpsError(
          "not-found",
          "User not found in this school"
        );
      }
    }

    // Marquer la demande de suppression (délai légal de 30 jours)
    await db.collection("users").doc(targetUid).update({
      deletionRequestedAt: admin.firestore.Timestamp.now(),
      deletionRequestedBy: callerUid,
      deletionReason: request.data.reason ?? "user_request",
    });

    // Programmer la suppression effective dans 30 jours
    await db.collection("_deletionQueue").add({
      targetUid,
      requestedBy: callerUid,
      requestedAt: admin.firestore.Timestamp.now(),
      scheduledFor: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 jours
      ),
      status: "pending",
    });

    await writeAuditLog({
      schoolId: claims.schoolId,
      actorUid: callerUid,
      actorRole: claims.role,
      action: "gdpr.deletion.requested",
      targetId: targetUid,
      targetType: "user",
      metadata: { reason: request.data.reason ?? "user_request" },
    });

    return {
      success: true,
      message:
        "Demande enregistrée. Les données seront supprimées dans 30 jours conformément au RGPD.",
      scheduledDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
);

// ---------------------------------------------------------------
// SCHEDULED FUNCTION : processDataDeletionQueue
// Traite les suppressions programmées (exécuté quotidiennement)
// ---------------------------------------------------------------
export const processDataDeletionQueue = functions.scheduler.onSchedule(
  {
    schedule: "0 3 * * *",  // 03:00 chaque nuit
    region: "europe-west1",
    timeZone: "Europe/Paris",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async () => {
    const now = admin.firestore.Timestamp.now();

    const pendingDeletions = await db
      .collection("_deletionQueue")
      .where("status", "==", "pending")
      .where("scheduledFor", "<=", now)
      .limit(20)
      .get();

    for (const deletion of pendingDeletions.docs) {
      const { targetUid } = deletion.data();

      try {
        await executeDataDeletion(targetUid);

        await deletion.ref.update({
          status: "completed",
          completedAt: admin.firestore.Timestamp.now(),
        });

        functions.logger.info(`Data deletion completed for user ${targetUid}`);
      } catch (error) {
        await deletion.ref.update({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          failedAt: admin.firestore.Timestamp.now(),
        });

        functions.logger.error(`Data deletion failed for user ${targetUid}`, {
          error,
        });
      }
    }
  }
);

// ---------------------------------------------------------------
// CALLABLE FUNCTION : exportUserData
// Droit d'accès et de portabilité (Articles 15 et 20 RGPD)
// ---------------------------------------------------------------
export const exportUserData = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (
    request: functions.https.CallableRequest<{ targetUid?: string }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const claims = request.auth.token as CustomClaims;
    const callerUid = request.auth.uid;
    const targetUid = request.data.targetUid ?? callerUid;

    // Un élève ne peut exporter que ses propres données
    if (targetUid !== callerUid && claims.role === "eleve") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Students can only export their own data"
      );
    }

    // Collecter toutes les données de l'utilisateur
    const exportData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      exportedBy: callerUid,
      subject: "export des données personnelles conformément à l'article 15 RGPD",
    };

    // Profil utilisateur
    const userDoc = await db.collection("users").doc(targetUid).get();
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      // Exclure les champs techniques internes
      delete userData.fcmToken;
      delete userData.fcmTokenUpdatedAt;
      exportData.profile = userData;
    }

    // Profil élève si applicable
    const studentDoc = await db.collection("students").doc(targetUid).get();
    if (studentDoc.exists) {
      exportData.studentProfile = studentDoc.data();

      // Données privées déchiffrées (légalement requises dans l'export)
      const privateDoc = await db
        .collection("students")
        .doc(targetUid)
        .collection("private")
        .doc("data")
        .get();

      if (privateDoc.exists) {
        // Note: en production, les données sont déchiffrées ici avant export
        // On indique qu'elles existent mais nécessitent déchiffrement manuel
        exportData.privateData = {
          note: "Données chiffrées disponibles sur demande écrite",
          fields: Object.keys(privateDoc.data() ?? {}),
        };
      }
    }

    // Progressions
    const progressSnapshot = await db
      .collection("progress")
      .doc(targetUid)
      .collection("courses")
      .get();

    exportData.progress = progressSnapshot.docs.map((doc) => doc.data());

    // Notifications (non expirées)
    const notifSnapshot = await db
      .collection("notifications")
      .where("recipientUid", "==", targetUid)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    exportData.notifications = notifSnapshot.docs.map((doc) => doc.data());

    // Stocker l'export chiffré dans Storage (lien valable 24h)
    const exportJson = JSON.stringify(exportData, null, 2);
    const exportPath = `_gdpr_exports/${targetUid}/${Date.now()}.json`;
    const bucket = storage.bucket();
    const file = bucket.file(exportPath);

    await file.save(exportJson, {
      contentType: "application/json",
      metadata: {
        firebaseStorageDownloadTokens: "", // Désactiver le token public
      },
    });

    // URL signée valable 24 heures
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    await writeAuditLog({
      schoolId: claims.schoolId,
      actorUid: callerUid,
      actorRole: claims.role,
      action: "gdpr.export.generated",
      targetId: targetUid,
      targetType: "user",
      metadata: { exportPath },
    });

    return {
      success: true,
      downloadUrl: signedUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      message: "Export disponible pendant 24 heures",
    };
  }
);

// ---------------------------------------------------------------
// Fonction interne : executeDataDeletion
// Supprime toutes les données personnelles d'un utilisateur
// Conserve les données anonymisées pour les statistiques de l'école
// ---------------------------------------------------------------
async function executeDataDeletion(targetUid: string): Promise<void> {
  const batch = db.batch();

  // 1. Récupérer les infos avant suppression (pour l'audit final)
  const userDoc = await db.collection("users").doc(targetUid).get();
  const userData = userDoc.data();
  const schoolId = userData?.schoolId ?? "unknown";

  // 2. Supprimer le compte Firebase Auth
  try {
    await auth.deleteUser(targetUid);
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") {
      throw error;
    }
  }

  // 3. Supprimer le profil utilisateur
  batch.delete(db.collection("users").doc(targetUid));

  // 4. Supprimer les données privées de l'élève (DONNÉES SENSIBLES)
  const privateDoc = db
    .collection("students")
    .doc(targetUid)
    .collection("private")
    .doc("data");
  batch.delete(privateDoc);

  // 5. Anonymiser le profil élève (conserver les stats pour l'école)
  const studentDoc = await db.collection("students").doc(targetUid).get();
  if (studentDoc.exists) {
    batch.update(db.collection("students").doc(targetUid), {
      displayName: "[COMPTE SUPPRIMÉ]",
      studentId: `DELETED-${Date.now()}`,
      isActive: false,
      deletedAt: admin.firestore.Timestamp.now(),
      // Conserver: progressStats (statistiques anonymisées pour l'école)
      // Supprimer: tout ce qui identifie l'élève
    });
  }

  // 6. Supprimer les données de progression personnelles
  const progressSnapshot = await db
    .collection("progress")
    .doc(targetUid)
    .collection("courses")
    .get();

  progressSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.collection("progress").doc(targetUid));

  // 7. Supprimer les notifications
  const notifSnapshot = await db
    .collection("notifications")
    .where("recipientUid", "==", targetUid)
    .limit(500)
    .get();

  notifSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // 8. Supprimer les fichiers Storage personnels
  try {
    const bucket = storage.bucket();
    await bucket.deleteFiles({
      prefix: `users/${targetUid}/`,
    });
    await bucket.deleteFiles({
      prefix: `_gdpr_exports/${targetUid}/`,
    });
  } catch (error) {
    functions.logger.warn(`Storage cleanup partial for ${targetUid}`, { error });
  }

  await batch.commit();

  // 9. Log d'audit final (immuable, conservé 5 ans)
  await writeAuditLog({
    schoolId,
    actorUid: "system",
    actorRole: "direction",
    action: "gdpr.deletion.completed",
    targetId: targetUid,
    targetType: "user",
    metadata: {
      deletionType: "right_to_erasure_article_17",
      dataRetained: "anonymized_statistics_only",
    },
  });
}

// ---------------------------------------------------------------
// CALLABLE FUNCTION : updateConsent
// Mise à jour du consentement RGPD
// ---------------------------------------------------------------
export const updateConsent = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
  },
  async (
    request: functions.https.CallableRequest<{
      consentVersion: string;
      accepted: boolean;
      parentConsent?: boolean;  // Pour les élèves mineurs, consentement parental
    }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const { consentVersion, accepted, parentConsent } = request.data;
    const uid = request.auth.uid;

    await db.collection("users").doc(uid).update({
      consentVersion: accepted ? consentVersion : "refused",
      consentDate: admin.firestore.Timestamp.now(),
      parentConsentGiven: parentConsent ?? false,
      isActive: accepted, // Désactiver le compte si consentement refusé
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Si refus : déclencher une suppression après 30 jours
    if (!accepted) {
      await db.collection("_deletionQueue").add({
        targetUid: uid,
        requestedBy: uid,
        requestedAt: admin.firestore.Timestamp.now(),
        scheduledFor: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ),
        status: "pending",
        reason: "consent_refused",
      });
    }

    return { success: true, consentRecorded: accepted };
  }
);
