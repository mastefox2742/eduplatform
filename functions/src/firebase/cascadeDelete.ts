// ============================================================
// CLOUD FUNCTIONS - SUPPRESSION EN CASCADE (RGPD Droit à l'oubli)
//
// Trigger sur la collection _deleteQueue.
// Nettoie les données personnelles d'un élève archivé :
//   ✗ Photos de profil (Storage)
//   ✗ Messages privés
//   ✗ Fichiers de devoirs uploadés
//   ✗ Tokens FCM
//
// CONSERVÉS (obligation légale 5 ans) :
//   ✓ Notes et bulletins (anonymisés)
//   ✓ Présences (anonymisées)
//   ✓ Historique des paiements
//   ✓ Logs d'audit
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { writeAuditLog } from "../utils/audit";

const db      = admin.firestore();
const storage = admin.storage();

// ── Trigger : document créé dans _deleteQueue ─────────────────────────────────

export const processCascadeDelete = functions.firestore.onDocumentCreated(
  {
    document:  "_deleteQueue/{docId}",
    region:    "europe-west1",
    memory:    "512MiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (data.processed || data.type !== "student_cleanup") return;

    const { studentId, schoolId } = data as { studentId: string; schoolId: string };

    functions.logger.info("cascade delete start", { studentId, schoolId });

    const errors: string[] = [];

    // 1. Supprimer la photo de profil (Storage)
    try {
      const bucket = storage.bucket();
      const [files] = await bucket.getFiles({ prefix: `users/${studentId}/` });
      await Promise.all(files.map(f => f.delete()));
    } catch (e) {
      errors.push(`storage: ${(e as Error).message}`);
    }

    // 2. Anonymiser les bulletins (remplacer le nom par un pseudonyme)
    //    On conserve les données pédagogiques mais on efface l'identité
    try {
      const pseudonym = `ÉLÈVE_${studentId.substring(0, 6).toUpperCase()}`;
      const bullSnap = await db
        .collection("schools").doc(schoolId)
        .collection("bulletins")
        .where("studentId", "==", studentId)
        .get();

      const batch = db.batch();
      bullSnap.docs.forEach(d =>
        batch.update(d.ref, { studentName: pseudonym })
      );
      if (!bullSnap.empty) await batch.commit();
    } catch (e) {
      errors.push(`bulletins_anonymize: ${(e as Error).message}`);
    }

    // 3. Anonymiser les présences
    try {
      const pseudonym = `ÉLÈVE_${studentId.substring(0, 6).toUpperCase()}`;
      const attSnap = await db
        .collection("schools").doc(schoolId)
        .collection("attendance")
        .get();

      const batch = db.batch();
      let changed = false;
      attSnap.docs.forEach(d => {
        const records = d.data().records ?? {};
        if (records[studentId]) {
          // Remplacer la clé studentId par le pseudonyme
          const newRecords: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(records)) {
            newRecords[k === studentId ? pseudonym : k] = v;
          }
          batch.update(d.ref, { records: newRecords });
          changed = true;
        }
      });
      if (changed) await batch.commit();
    } catch (e) {
      errors.push(`attendance_anonymize: ${(e as Error).message}`);
    }

    // 4. Supprimer les messages privés impliquant cet élève
    try {
      const msgSnap = await db
        .collectionGroup("messages")
        .where("senderId", "==", studentId)
        .limit(500)
        .get();

      const batch = db.batch();
      msgSnap.docs.forEach(d => batch.delete(d.ref));
      if (!msgSnap.empty) await batch.commit();
    } catch (e) {
      errors.push(`messages: ${(e as Error).message}`);
    }

    // 5. Supprimer les tokens FCM de l'élève
    try {
      const tokenSnap = await db
        .collection("fcmTokens")
        .where("userId", "==", studentId)
        .get();
      const batch = db.batch();
      tokenSnap.docs.forEach(d => batch.delete(d.ref));
      if (!tokenSnap.empty) await batch.commit();
    } catch (e) {
      errors.push(`fcm_tokens: ${(e as Error).message}`);
    }

    // 6. Supprimer les données de progression (scores)
    //    Ces données sont purement opérationnelles, non-légales
    try {
      const progressSnap = await db
        .collection("schools").doc(schoolId)
        .collection("progress")
        .where("userId", "==", studentId)
        .get();
      const batch = db.batch();
      progressSnap.docs.forEach(d => batch.delete(d.ref));
      if (!progressSnap.empty) await batch.commit();
    } catch (e) {
      errors.push(`progress: ${(e as Error).message}`);
    }

    // 7. Marquer la queue comme traitée
    await snap.ref.update({
      processed:   true,
      processedAt: admin.firestore.Timestamp.now(),
      errors,
    });

    // 8. Audit (sans données personnelles)
    await writeAuditLog({
      schoolId,
      actorUid:  "system",
      actorRole: "system",
      action:    "student.cascade_deleted",
      metadata:  {
        studentId,
        errorsCount: errors.length,
        operations: ["storage", "bulletins_anonymized", "attendance_anonymized", "messages", "fcm_tokens", "progress"],
      },
    });

    if (errors.length > 0) {
      functions.logger.error("cascade delete partial failure", { studentId, errors });
    } else {
      functions.logger.info("cascade delete complete", { studentId });
    }
  }
);
