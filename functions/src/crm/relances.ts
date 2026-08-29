// ============================================================
// CLOUD FUNCTIONS — CRM INSCRIPTIONS & RELANCES AUTOMATIQUES
//
// Planification et envoi des relances de scolarité :
//   - Push notification aux parents
//   - Log de chaque relance envoyée
//   - Scheduled : tous les lundis à 8h (semaine de relance)
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { writeAuditLog } from "../utils/audit";
import { requireClaims } from "../utils/claims";

const db = admin.firestore();

// ── Cloud Function : envoyer relances paiement ────────────────────────────────

export const sendPaymentReminders = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "512MiB",
    timeoutSeconds:  120,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:  string;
    message?:  string;      // message personnalisé, sinon message par défaut
    daysLate?: number;      // envoyer seulement aux parents en retard depuis N jours
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");
    const claims = requireClaims(request.auth.token);
    if (!["direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement");
    }

    const { schoolId, message, daysLate = 7 } = request.data;

    // 1. Trouver les paiements en retard
    const cutoffDate = new Date(Date.now() - daysLate * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];

    const paymentsSnap = await db
      .collection("schools").doc(schoolId)
      .collection("fees")
      .where("status",  "==", "overdue")
      .where("dueDate", "<=", cutoffDate)
      .get();

    if (paymentsSnap.empty) return { success: true, sent: 0 };

    // 2. Grouper par parent (éviter le spam)
    const byParent = new Map<string, { parentName: string; amount: number; currency: string; studentName: string }>();
    for (const doc of paymentsSnap.docs) {
      const d = doc.data();
      const existing = byParent.get(d.parentId);
      byParent.set(d.parentId, {
        parentName:  d.parentName  ?? existing?.parentName ?? "",
        amount:      (existing?.amount ?? 0) + (d.amount ?? 0),
        currency:    d.currency ?? "XOF",
        studentName: d.studentName ?? existing?.studentName ?? "",
      });
    }

    let sent = 0;
    const batch = db.batch();

    for (const [parentId, info] of byParent) {
      const tokenSnap = await db.collection("fcmTokens").where("userId", "==", parentId).get();
      const tokens    = tokenSnap.docs.map(d => d.data().token as string).filter(Boolean);

      const body = message
        ?? `Rappel : ${info.amount.toLocaleString("fr-FR")} ${info.currency} de frais scolaires de ${info.studentName} sont en attente. Veuillez régulariser dès que possible.`;

      if (tokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: { title: "📌 Rappel scolarité", body },
          data: { type: "payment_reminder", schoolId },
          android: { priority: "high" },
        });
        sent++;
      }

      // Log de la relance
      const logRef = db.collection("schools").doc(schoolId).collection("relanceLogs").doc();
      batch.set(logRef, {
        schoolId,
        targetId:   parentId,
        targetName: info.parentName,
        channel:    "push",
        message:    body,
        sentAt:     Date.now(),
        sentBy:     request.auth!.uid,
        success:    tokens.length > 0,
      });
    }

    await batch.commit();

    await writeAuditLog({
      schoolId,
      actorUid:  request.auth!.uid,
      actorRole: claims.role,
      action:    "crm.payment_reminders_sent",
      metadata:  { sent, totalParents: byParent.size },
    });

    return { success: true, sent, total: byParent.size };
  }
);

// ── Scheduled : relances automatiques hebdomadaires ──────────────────────────

export const weeklyPaymentReminders = functions.scheduler.onSchedule(
  {
    schedule:   "0 8 * * 1",    // Tous les lundis à 8h
    timeZone:   "Africa/Abidjan",
    region:     "europe-west1",
    memory:     "512MiB",
  },
  async () => {
    // Lancer pour toutes les écoles actives
    const schoolsSnap = await db
      .collection("schools")
      .where("status", "==", "active")
      .get();

    for (const school of schoolsSnap.docs) {
      try {
        const schoolId = school.id;
        // Même logique que la CF manuelle, via Admin SDK
        const paymentsSnap = await db
          .collection("schools").doc(schoolId)
          .collection("fees")
          .where("status", "==", "overdue")
          .get();

        const byParent = new Map<string, { tokens: string[]; amount: number; currency: string; studentName: string }>();

        for (const doc of paymentsSnap.docs) {
          const d = doc.data();
          const tokenSnap = await db.collection("fcmTokens").where("userId", "==", d.parentId).get();
          const tokens    = tokenSnap.docs.map(t => t.data().token as string).filter(Boolean);
          const existing  = byParent.get(d.parentId) ?? { tokens, amount: 0, currency: d.currency ?? "XOF", studentName: d.studentName };
          byParent.set(d.parentId, { ...existing, amount: existing.amount + (d.amount ?? 0) });
        }

        for (const [, info] of byParent) {
          if (info.tokens.length === 0) continue;
          const body = `Rappel hebdomadaire : ${info.amount.toLocaleString("fr-FR")} ${info.currency} de frais scolaires de ${info.studentName} sont en attente.`;
          await admin.messaging().sendEachForMulticast({
            tokens: info.tokens,
            notification: { title: "📌 Frais scolaires impayés", body },
            data:         { type: "payment_reminder", schoolId },
          });
        }

        functions.logger.info(`Relances auto: ${byParent.size} parents contactés`, { schoolId });
      } catch (e) {
        functions.logger.error(`Relance auto failed for school ${school.id}`, { error: (e as Error).message });
      }
    }
  }
);

// ── Cloud Function : créer / mettre à jour un lead d'inscription ───────────────

export const upsertInscriptionLead = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "256MiB",
    timeoutSeconds:  30,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:     string;
    leadId?:      string;
    parentName:   string;
    parentPhone:  string;
    parentEmail?: string;
    studentName:  string;
    studentAge?:  number;
    targetLevel?: string;
    source:       string;
    status:       string;
    notes:        string;
    nextFollowUp?: string;
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");

    const { schoolId, leadId, ...data } = request.data;
    const ref = leadId
      ? db.collection("schools").doc(schoolId).collection("inscriptionLeads").doc(leadId)
      : db.collection("schools").doc(schoolId).collection("inscriptionLeads").doc();

    await ref.set(
      { ...data, schoolId, updatedAt: Date.now(), ...(!leadId ? { createdAt: Date.now() } : {}) },
      { merge: true }
    );

    return { success: true, leadId: ref.id };
  }
);
