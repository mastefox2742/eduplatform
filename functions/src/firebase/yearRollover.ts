// ============================================================
// CLOUD FUNCTIONS - CHANGEMENT D'ANNÉE SCOLAIRE
//
// Appelé manuellement par la direction une fois en fin d'année.
// Pour chaque élève actif de l'école :
//   - On prend un snapshot de ses résultats (moyenne + rang)
//   - Les élèves promus passent dans la classe suivante
//   - Les redoublants restent (marqués repeating dans la transition)
//   - Les diplômés (dernière classe du cycle) sont archivés
//
// ⚠️  Opération irréversible — demander confirmation côté UI.
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { writeAuditLog } from "../utils/audit";
import { requireClaims } from "../utils/claims";

const db = admin.firestore();

// ── Types ─────────────────────────────────────────────────────────────────────

interface RolloverRequest {
  schoolId:    string;
  newYear:     string;        // "2026-2027"
  // Mapping classe → classe suivante. Ex: { "6eme_a": "5eme_a", ... }
  promotionMap: Record<string, string | null>;
  // Classes de diplômés (dernière classe du cycle). Ces élèves seront archivés.
  graduatingClassIds: string[];
}

interface RolloverResult {
  success:     boolean;
  promoted:    number;
  repeating:   number;
  graduated:   number;
  errors:      string[];
}

// ── Cloud Function ────────────────────────────────────────────────────────────

export const yearRollover = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "1GiB",
    timeoutSeconds:  300,    // Opération longue
  },
  async (
    request: functions.https.CallableRequest<RolloverRequest>
  ): Promise<RolloverResult> => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const claims = requireClaims(request.auth.token);
    if (claims.role !== "direction" && claims.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement");
    }

    const { schoolId, newYear, promotionMap, graduatingClassIds } = request.data;

    if (claims.schoolId !== schoolId && claims.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Mauvaise école");
    }

    // 1. Récupérer tous les élèves actifs
    const studentsSnap = await db
      .collection("users")
      .where("schoolId",      "==", schoolId)
      .where("role",          "==", "student")
      .where("archiveStatus", "==", "active")
      .get();

    if (studentsSnap.empty) {
      throw new functions.https.HttpsError("not-found", "Aucun élève actif trouvé");
    }

    // 2. Récupérer les moyennes de l'année courante (bulletins publiés)
    const bulletinsSnap = await db
      .collection("schools").doc(schoolId)
      .collection("bulletins")
      .where("status", "==", "published")
      .get();

    // Moyenne par élève : agrégation de tous ses bulletins publiés
    const avgByStudent = new Map<string, { total: number; count: number; className: string; classId: string }>();
    for (const b of bulletinsSnap.docs) {
      const data = b.data();
      const sid  = data.studentId as string;
      const avg  = typeof data.average === "number" ? data.average : 0;

      const existing = avgByStudent.get(sid) ?? { total: 0, count: 0, className: data.className, classId: data.classId };
      avgByStudent.set(sid, {
        total:     existing.total + avg,
        count:     existing.count + 1,
        className: existing.className,
        classId:   existing.classId,
      });
    }

    // 3. Calculer les rangs par classe
    const rankByClass = new Map<string, { studentId: string; avg: number }[]>();
    for (const [sid, { total, count, classId }] of avgByStudent) {
      const avg = count > 0 ? total / count : 0;
      const existing = rankByClass.get(classId) ?? [];
      existing.push({ studentId: sid, avg });
      rankByClass.set(classId, existing);
    }
    // Trier par moyenne décroissante pour calculer les rangs
    for (const [, arr] of rankByClass) {
      arr.sort((a, b) => b.avg - a.avg);
    }

    // Helper : rang d'un élève dans sa classe (1-indexé)
    function getRank(studentId: string, classId: string): number {
      const arr = rankByClass.get(classId) ?? [];
      const idx = arr.findIndex(e => e.studentId === studentId);
      return idx >= 0 ? idx + 1 : 0;
    }

    // 4. Traiter chaque élève en batches Firestore (max 500 ops/batch)
    const currentYear  = newYear.replace(/(\d{4})-(\d{4})/, (_, a) => `${Number(a) - 1}-${a}`);
    const errors:  string[] = [];
    let promoted  = 0;
    let repeating = 0;
    let graduated = 0;

    const chunks = chunkArray(studentsSnap.docs, 400);

    for (const chunk of chunks) {
      const batch = db.batch();

      for (const doc of chunk) {
        try {
          const student  = doc.data();
          const sid      = doc.id;
          const classId  = student.classId as string;

          // Snapshot de l'année courante
          const entry = avgByStudent.get(sid);
          const yearRecord = {
            year:      currentYear,
            classId,
            className: student.className ?? entry?.className ?? "",
            average:   entry ? (entry.total / Math.max(entry.count, 1)) : 0,
            rank:      getRank(sid, classId),
            promoted:  false, // mis à jour ci-dessous
          };

          const isGraduating = graduatingClassIds.includes(classId);
          const nextClassId  = promotionMap[classId];
          const isPromoted   = !!nextClassId;

          if (isGraduating) {
            // Archiver l'élève diplômé
            yearRecord.promoted = true;
            batch.update(doc.ref, {
              archiveStatus:   "archived",
              archiveReason:   "graduated",
              archivedAt:      Date.now(),
              academicHistory: admin.firestore.FieldValue.arrayUnion(yearRecord),
              updatedAt:       Date.now(),
            });
            graduated++;

          } else if (isPromoted && nextClassId) {
            // Promouvoir vers la classe suivante
            yearRecord.promoted = true;

            // Récupérer infos de la nouvelle classe
            const nextClassSnap = await db
              .collection("schools").doc(schoolId)
              .collection("classes").doc(nextClassId)
              .get();
            const nextClass = nextClassSnap.data() ?? {};

            batch.update(doc.ref, {
              classId:         nextClassId,
              className:       nextClass.name ?? nextClassId,
              levelId:         nextClass.levelId ?? student.levelId,
              levelName:       nextClass.levelName ?? student.levelName,
              academicHistory: admin.firestore.FieldValue.arrayUnion(yearRecord),
              updatedAt:       Date.now(),
            });
            promoted++;

          } else {
            // Redoublant — reste dans sa classe
            yearRecord.promoted = false;
            batch.update(doc.ref, {
              academicHistory: admin.firestore.FieldValue.arrayUnion(yearRecord),
              updatedAt:       Date.now(),
            });
            repeating++;
          }
        } catch (e) {
          errors.push(`${doc.id}: ${(e as Error).message}`);
        }
      }

      await batch.commit();
    }

    // 5. Mettre à jour l'année scolaire de l'école
    await db.collection("schools").doc(schoolId)
      .collection("school_config").doc("main")
      .set({ annee: newYear, updatedAt: admin.firestore.Timestamp.now() }, { merge: true });

    // 6. Audit trail
    await writeAuditLog({
      schoolId,
      actorUid:  request.auth.uid,
      actorRole: claims.role,
      action:    "school.year_rollover",
      metadata:  { newYear, promoted, repeating, graduated, errors: errors.length },
    });

    functions.logger.info("Year rollover complete", { schoolId, newYear, promoted, repeating, graduated });

    return { success: true, promoted, repeating, graduated, errors };
  }
);

// ── Archivage manuel d'un élève (transfert, départ) ─────────────────────────

export const archiveStudent = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "512MiB",
    timeoutSeconds:  120,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:  string;
    studentId: string;
    reason:    "transferred" | "dropout" | "expelled";
    note?:     string;
  }>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const claims = requireClaims(request.auth.token);
    if (claims.role !== "direction" && claims.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement");
    }

    const { schoolId, studentId, reason, note } = request.data;

    const studentRef = db.collection("users").doc(studentId);
    const snap = await studentRef.get();

    if (!snap.exists || snap.data()?.schoolId !== schoolId) {
      throw new functions.https.HttpsError("not-found", "Élève introuvable");
    }

    // 1. Désactiver le compte Firebase Auth (ne peut plus se connecter)
    await admin.auth().updateUser(studentId, { disabled: true });

    // 2. Mettre à jour le profil Firestore
    await studentRef.update({
      archiveStatus: "archived",
      archiveReason: reason,
      archivedAt:    Date.now(),
      isActive:      false,
      archiveNote:   note ?? "",
      updatedAt:     Date.now(),
    });

    // 3. Audit
    await writeAuditLog({
      schoolId,
      actorUid:  request.auth.uid,
      actorRole: claims.role,
      action:    "student.archived",
      metadata:  { studentId, reason, note },
    });

    // 4. Déclencher la suppression en cascade des données non-légales
    //    (photos, messages, accès cours) via une autre CF
    await db.collection("_deleteQueue").add({
      type:      "student_cleanup",
      studentId,
      schoolId,
      reason,
      queuedAt:  admin.firestore.Timestamp.now(),
      processed: false,
    });

    return { success: true, studentId };
  }
);

// ── Helper ────────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
