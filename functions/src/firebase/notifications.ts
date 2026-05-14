// ============================================================
// CLOUD FUNCTIONS - SYSTÈME DE NOTIFICATIONS
// Push notifications FCM avec gestion des droits et TTL
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { Notification, CustomClaims } from "../types";
import { writeAuditLog } from "../utils/audit";

const db = admin.firestore();
const messaging = admin.messaging();

// ---------------------------------------------------------------
// CALLABLE FUNCTION : sendNotification
// Envoie une notification push à un utilisateur ou un groupe
// ---------------------------------------------------------------
export const sendNotification = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (
    request: functions.https.CallableRequest<{
      recipientUid?: string;
      recipientClasseId?: string;    // Notification à toute une classe
      type: Notification["type"];
      title: string;
      body: string;
      data?: Record<string, string>;
      ttlHours?: number;             // Durée de vie de la notification
    }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const claims = request.auth.token as CustomClaims;
    const {
      recipientUid,
      recipientClasseId,
      type,
      title,
      body,
      data = {},
      ttlHours = 72,
    } = request.data;

    // Vérification des autorisations d'envoi
    await verifyNotificationPermission(claims, type, recipientUid, recipientClasseId);

    // Validation du contenu (anti-injection, limites de taille)
    if (title.length > 100 || body.length > 500) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Title max 100 chars, body max 500 chars"
      );
    }

    const now = admin.firestore.Timestamp.now();
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + ttlHours);

    // Collecter les destinataires
    const recipients: string[] = [];

    if (recipientUid) {
      recipients.push(recipientUid);
    } else if (recipientClasseId) {
      // Envoyer à toute une classe
      const studentsSnapshot = await db
        .collection("students")
        .where("classeId", "==", recipientClasseId)
        .where("schoolId", "==", claims.schoolId)
        .where("isActive", "==", true)
        .get();

      recipients.push(...studentsSnapshot.docs.map((doc) => doc.id));
    }

    if (recipients.length === 0) {
      throw new functions.https.HttpsError(
        "not-found",
        "No valid recipients found"
      );
    }

    // Limiter les notifications de masse (max 500 destinataires par appel)
    if (recipients.length > 500) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Maximum 500 recipients per notification"
      );
    }

    const batch = db.batch();
    const fcmTokens: string[] = [];

    // Créer les documents de notification et collecter les tokens FCM
    for (const uid of recipients) {
      const notifRef = db.collection("notifications").doc();
      const notification: Omit<Notification, "id"> = {
        schoolId: claims.schoolId,
        recipientUid: uid,
        senderUid: request.auth.uid,
        type,
        title,
        body,
        data,
        isRead: false,
        createdAt: now,
        expiresAt: admin.firestore.Timestamp.fromDate(expiryDate),
      };

      batch.set(notifRef, { id: notifRef.id, ...notification });

      // Récupérer le token FCM de l'utilisateur
      const userDoc = await db.collection("users").doc(uid).get();
      const fcmToken = userDoc.data()?.fcmToken;
      if (fcmToken) {
        fcmTokens.push(fcmToken);
      }
    }

    await batch.commit();

    // Envoyer les push notifications via FCM (par lots de 500)
    if (fcmTokens.length > 0) {
      const fcmBatches = chunkArray(fcmTokens, 500);

      for (const tokenBatch of fcmBatches) {
        const multicastMessage: admin.messaging.MulticastMessage = {
          tokens: tokenBatch,
          notification: {
            title,
            body,
          },
          data: {
            ...data,
            type,
            schoolId: claims.schoolId,
            senderUid: request.auth.uid,
          },
          android: {
            priority: type === "system" ? "high" : "normal",
            ttl: ttlHours * 60 * 60 * 1000,
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
        };

        const response = await messaging.sendEachForMulticast(multicastMessage);

        // Nettoyer les tokens invalides
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/registration-token-not-registered"
            ) {
              invalidTokens.push(tokenBatch[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await cleanupInvalidFcmTokens(invalidTokens);
        }
      }
    }

    await writeAuditLog({
      schoolId: claims.schoolId,
      actorUid: request.auth.uid,
      actorRole: claims.role,
      action: "notification.sent",
      metadata: {
        type,
        recipientCount: recipients.length,
        recipientClasseId,
      },
    });

    return {
      success: true,
      recipientCount: recipients.length,
      fcmSent: fcmTokens.length,
    };
  }
);

// ---------------------------------------------------------------
// SCHEDULED FUNCTION : cleanupExpiredNotifications
// Purge automatique des notifications expirées (RGPD / espace disque)
// Exécuté tous les jours à 02:00
// ---------------------------------------------------------------
export const cleanupExpiredNotifications = functions.scheduler.onSchedule(
  {
    schedule: "0 2 * * *",
    region: "europe-west1",
    timeZone: "Europe/Paris",
    memory: "256MiB",
  },
  async () => {
    const now = admin.firestore.Timestamp.now();

    const expiredSnapshot = await db
      .collection("notifications")
      .where("expiresAt", "<=", now)
      .limit(500)
      .get();

    if (expiredSnapshot.empty) {
      functions.logger.info("No expired notifications to clean up");
      return;
    }

    const batch = db.batch();
    expiredSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    functions.logger.info(
      `Cleaned up ${expiredSnapshot.size} expired notifications`
    );
  }
);

// ---------------------------------------------------------------
// TRIGGER : onMarkNotificationRead
// Met à jour le badge de notifications non lues
// ---------------------------------------------------------------
export const registerFcmToken = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
  },
  async (
    request: functions.https.CallableRequest<{ token: string; platform: "web" | "ios" | "android" }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const { token, platform } = request.data;

    if (!token || typeof token !== "string" || token.length < 10) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Valid FCM token required"
      );
    }

    await db.collection("users").doc(request.auth.uid).update({
      fcmToken: token,
      fcmPlatform: platform,
      fcmTokenUpdatedAt: admin.firestore.Timestamp.now(),
    });

    return { success: true };
  }
);

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

async function verifyNotificationPermission(
  claims: CustomClaims,
  type: Notification["type"],
  recipientUid?: string,
  recipientClasseId?: string
): Promise<void> {
  // Les élèves ne peuvent pas envoyer de notifications
  if (claims.role === "eleve") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Students cannot send notifications"
    );
  }

  // Les professeurs ne peuvent notifier que leurs classes
  if (claims.role === "professeur") {
    if (type === "system") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Teachers cannot send system notifications"
      );
    }

    if (recipientUid) {
      // Vérifier que l'élève est dans une classe du professeur
      const studentDoc = await db.collection("students").doc(recipientUid).get();
      const student = studentDoc.data();

      if (!student || student.schoolId !== claims.schoolId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Student not in your school"
        );
      }
    }
  }
}

async function cleanupInvalidFcmTokens(tokens: string[]): Promise<void> {
  const usersSnapshot = await db
    .collection("users")
    .where("fcmToken", "in", tokens.slice(0, 10)) // Firestore limite les "in" à 10
    .get();

  const batch = db.batch();
  usersSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      fcmToken: admin.firestore.FieldValue.delete(),
      fcmTokenInvalidatedAt: admin.firestore.Timestamp.now(),
    });
  });

  if (!usersSnapshot.empty) {
    await batch.commit();
    functions.logger.warn(
      `Cleaned up ${usersSnapshot.size} invalid FCM tokens`
    );
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
