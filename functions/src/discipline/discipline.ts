// ============================================================
// CLOUD FUNCTIONS — DISCIPLINE & VIE SCOLAIRE
//
// Gestion des sanctions (avertissement → exclusion) et mérites
// Notification push immédiate aux parents dès qu'une sanction est posée
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { writeAuditLog } from "../utils/audit";
import { CustomClaims } from "../types";

const db = admin.firestore();

// ── Cloud Function : enregistrer une sanction ou un mérite ────────────────────

export const issueDisciplineRecord = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "256MiB",
    timeoutSeconds:  30,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:    string;
    studentId:   string;
    studentName: string;
    classId:     string;
    className:   string;
    type:        "sanction" | "merite";
    subType:     string;    // SanctionType | MeriteType
    motif:       string;
    description: string;
    date:        string;
    duration?:   number;    // jours pour exclusion_temp
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");

    const claims = request.auth.token as CustomClaims;
    if (!["direction", "teacher", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Non autorisé");
    }

    const { schoolId, studentId, studentName, classId, className, type, subType, motif, description, date, duration } = request.data;

    // 1. Récupérer le nom de l'émetteur
    const userSnap   = await db.collection("users").doc(request.auth.uid).get();
    const issuedByName = userSnap.data()?.displayName ?? request.auth.uid;

    // 2. Enregistrer dans Firestore
    const record = {
      schoolId, studentId, studentName, classId, className,
      type,
      [type === "sanction" ? "sanction" : "merite"]: subType,
      motif, description, date, duration: duration ?? null,
      issuedBy:       request.auth.uid,
      issuedByName,
      parentNotified: false,
      createdAt:      Date.now(),
    };

    const docRef = await db
      .collection("schools").doc(schoolId)
      .collection("discipline").add(record);

    // 3. Notifier les parents si c'est une sanction
    if (type === "sanction") {
      await notifyParent(schoolId, studentId, studentName, subType, motif, duration, docRef.id);
    }

    // 4. Si mérite → XP et badge
    if (type === "merite") {
      await awardXP(schoolId, studentId, subType === "tableau_honneur" ? 100 : 30);
    }

    await writeAuditLog({
      schoolId,
      actorUid:  request.auth.uid,
      actorRole: claims.role,
      action:    `discipline.${type}_issued`,
      metadata:  { studentId, subType, motif },
    });

    return { success: true, recordId: docRef.id };
  }
);

// ── Notification push aux parents ─────────────────────────────────────────────

async function notifyParent(
  schoolId:    string,
  studentId:   string,
  studentName: string,
  sanction:    string,
  motif:       string,
  duration:    number | undefined,
  recordId:    string,
): Promise<void> {
  const LABELS: Record<string, string> = {
    avertissement:  "Avertissement",
    blame:          "Blâme",
    retenue:        "Retenue",
    exclusion_temp: "Exclusion temporaire",
    exclusion_def:  "Exclusion définitive",
  };

  const label   = LABELS[sanction] ?? sanction;
  const bodyTxt = duration
    ? `${label} de ${duration} jour(s) : ${motif}`
    : `${label} : ${motif}`;

  // Trouver les tokens FCM des parents de l'élève
  const studentSnap = await db.collection("users").doc(studentId).get();
  const parentEmail = studentSnap.data()?.parentEmail;

  if (!parentEmail) return;

  const parentSnap = await db
    .collection("users")
    .where("email", "==", parentEmail)
    .where("role",  "==", "parent")
    .limit(1)
    .get();

  if (parentSnap.empty) return;

  const parentId   = parentSnap.docs[0].id;
  const tokenSnap  = await db.collection("fcmTokens").where("userId", "==", parentId).get();
  const tokens     = tokenSnap.docs.map(d => d.data().token as string).filter(Boolean);

  if (tokens.length === 0) return;

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: `⚠️ Sanction — ${studentName}`,
      body:  bodyTxt,
    },
    data: {
      type:     "discipline",
      recordId,
      schoolId,
      studentId,
    },
    android: { priority: "high" },
    apns:    { payload: { aps: { sound: "default", badge: 1 } } },
  });

  // Marquer notifié
  await db
    .collection("schools").doc(schoolId)
    .collection("discipline").doc(recordId)
    .update({ parentNotified: true, parentNotifiedAt: Date.now() });
}

// ── Attribution de XP gamification ───────────────────────────────────────────

async function awardXP(schoolId: string, studentId: string, xp: number): Promise<void> {
  const ref = db.collection("schools").doc(schoolId).collection("studentXP").doc(studentId);
  await ref.set(
    {
      studentId,
      schoolId,
      totalXP:   admin.firestore.FieldValue.increment(xp),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
