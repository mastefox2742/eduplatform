// ============================================================
// MESSAGING GATEWAY — WhatsApp Business API + SMS Fallback
//
// Providers :
//   • WhatsApp → Twilio (WhatsApp Business API)
//   • SMS fallback → Africa's Talking (fort en Afrique sub-saharienne)
//
// Secrets gérés dans Firebase Secret Manager :
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_NUMBER   (format: whatsapp:+14155238886)
//   AT_API_KEY               (Africa's Talking)
//   AT_USERNAME
//
// Tous les messages sont loggés dans Firestore pour audit.
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { writeAuditLog } from "../utils/audit";
import { requireClaims } from "../utils/claims";

const db = admin.firestore();

// ── Envoi WhatsApp via Twilio ─────────────────────────────────────────────────

export async function sendWhatsAppMessage(
  to:       string,
  body:     string,
  schoolId: string,
): Promise<boolean> {
  const accountSid   = process.env.TWILIO_ACCOUNT_SID;
  const authToken    = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber   = process.env.TWILIO_WHATSAPP_NUMBER ?? "whatsapp:+14155238886";

  if (!accountSid || !authToken) {
    functions.logger.warn("Twilio not configured — skipping WhatsApp");
    return false;
  }

  // Normaliser le numéro
  const toNormalized = normalizePhone(to);
  if (!toNormalized) {
    functions.logger.warn("Invalid phone number", { to });
    return false;
  }

  try {
    // Appel direct à l'API Twilio REST (sans SDK pour réduire la taille du bundle CF)
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        },
        body: new URLSearchParams({
          From: fromNumber,
          To:   `whatsapp:${toNormalized}`,
          Body: body,
        }).toString(),
      }
    );

    const data: any = await response.json();
    const success   = response.ok && data.sid;

    // Log
    await db.collection("schools").doc(schoolId).collection("messageLogs").add({
      channel:   "whatsapp",
      recipient: toNormalized,
      message:   body,
      status:    success ? "sent" : "failed",
      provider:  "twilio",
      sentAt:    Date.now(),
      sentBy:    "system",
      errorMsg:  success ? null : (data.message ?? "Unknown error"),
    });

    return success;
  } catch (e) {
    functions.logger.error("WhatsApp send failed", { error: (e as Error).message });
    return false;
  }
}

// ── Envoi SMS via Africa's Talking ────────────────────────────────────────────

export async function sendSMS(
  to:       string,
  message:  string,
  schoolId: string,
): Promise<boolean> {
  const apiKey   = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME ?? "sandbox";

  if (!apiKey) {
    functions.logger.warn("Africa's Talking not configured — skipping SMS");
    return false;
  }

  const toNormalized = normalizePhone(to);
  if (!toNormalized) return false;

  try {
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method:  "POST",
      headers: {
        "apiKey":       apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept":       "application/json",
      },
      body: new URLSearchParams({
        username,
        to:      toNormalized,
        message,
      }).toString(),
    });

    const data: any    = await response.json();
    const recipients   = data.SMSMessageData?.Recipients ?? [];
    const success      = recipients.some((r: any) => r.status === "Success");

    await db.collection("schools").doc(schoolId).collection("messageLogs").add({
      channel:   "sms",
      recipient: toNormalized,
      message,
      status:    success ? "sent" : "failed",
      provider:  "africas_talking",
      sentAt:    Date.now(),
      sentBy:    "system",
      errorMsg:  success ? null : JSON.stringify(data),
    });

    return success;
  } catch (e) {
    functions.logger.error("SMS send failed", { error: (e as Error).message });
    return false;
  }
}

// ── Envoi intelligent : WhatsApp en priorité, SMS en fallback ────────────────

export async function sendAlert(
  to:        string,
  message:   string,
  schoolId:  string,
  channel:   "whatsapp" | "sms" | "auto" = "auto",
): Promise<"whatsapp" | "sms" | "failed"> {
  if (channel === "whatsapp" || channel === "auto") {
    const ok = await sendWhatsAppMessage(to, message, schoolId);
    if (ok) return "whatsapp";
  }

  if (channel === "sms" || channel === "auto") {
    const ok = await sendSMS(to, message, schoolId);
    if (ok) return "sms";
  }

  return "failed";
}

// ── Cloud Function : envoi d'alerte depuis le client ─────────────────────────

export const sendManualAlert = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "256MiB",
    timeoutSeconds:  30,
    secrets:         ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_NUMBER", "AT_API_KEY", "AT_USERNAME"],
  },
  async (request: functions.https.CallableRequest<{
    schoolId:   string;
    to:         string;       // numéro de téléphone
    message:    string;
    channel:    "whatsapp" | "sms" | "auto";
    eventType:  string;
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");

    const claims = requireClaims(request.auth.token);
    if (!["direction", "teacher", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Non autorisé");
    }

    const { schoolId, to, message, channel, eventType } = request.data;
    const result = await sendAlert(to, message, schoolId, channel);

    await writeAuditLog({
      schoolId,
      actorUid:  request.auth.uid,
      actorRole: claims.role,
      action:    `messaging.${eventType}_sent`,
      metadata:  { channel: result, to: to.slice(0, -4) + "****" },  // masquer fin du numéro
    });

    return { success: result !== "failed", channel: result };
  }
);

// ── Cloud Function : alerte absence (déclenchée par l'appel numérique) ───────

export const onAttendanceAbsence = functions.firestore.onDocumentWritten(
  {
    document:  "schools/{schoolId}/attendance/{docId}",
    region:    "europe-west1",
    memory:    "256MiB",
    timeoutSeconds: 60,
    secrets:   ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_NUMBER", "AT_API_KEY", "AT_USERNAME"],
  },
  async (event) => {
    const after  = event.data?.after?.data();
    const before = event.data?.before?.data();

    if (!after || !before) return;  // Création initiale seulement
    if (JSON.stringify(before.records) === JSON.stringify(after.records)) return;

    const schoolId = event.params.schoolId;
    const records  = after.records as Record<string, { status: string }>;

    // Trouver les nouveaux absents
    const newAbsents: string[] = [];
    for (const [studentId, rec] of Object.entries(records)) {
      const wasPresent = before.records?.[studentId]?.status === "present" || !before.records?.[studentId];
      if (rec.status === "absent" && wasPresent) newAbsents.push(studentId);
    }

    if (newAbsents.length === 0) return;

    for (const studentId of newAbsents) {
      try {
        const studentSnap = await db.collection("users").doc(studentId).get();
        const student     = studentSnap.data();
        if (!student) continue;

        const parentEmail = student.parentEmail as string;
        if (!parentEmail) continue;

        const parentSnap = await db.collection("users")
          .where("email", "==", parentEmail)
          .where("role",  "==", "parent")
          .limit(1).get();

        if (parentSnap.empty) continue;
        const parent     = parentSnap.docs[0].data();
        const parentPhone = parent.phone ?? parent.whatsapp;

        if (!parentPhone) continue;

        const msg = `🏫 EduSchool — ${student.displayName ?? "Votre enfant"} est absent(e) ce ${after.dayLabel ?? "jour"} à ${after.date}.\nMatière : ${after.subject ?? "Cours"} · Classe : ${after.className ?? ""}\n\nSi cette absence est justifiée, connectez-vous à l'application pour soumettre un justificatif.`;

        await sendAlert(parentPhone, msg, schoolId, "auto");
      } catch (e) {
        functions.logger.warn("absence alert failed", { studentId, error: (e as Error).message });
      }
    }
  }
);

// ── Utilitaire : normalisation des numéros de téléphone ──────────────────────

function normalizePhone(phone: string): string | null {
  // Supprimer les espaces, tirets, parenthèses
  let clean = phone.replace(/[\s\-().]/g, "");

  // Si commence par 0, supposer que c'est un numéro local sans indicatif
  // Pas possible de deviner le pays sans contexte → log warning
  if (clean.startsWith("0") && clean.length < 12) {
    functions.logger.warn("Phone without country code", { phone });
    return null;
  }

  // Si commence par 00 → convertir en +
  if (clean.startsWith("00")) clean = "+" + clean.slice(2);

  // Si commence par + → ok
  if (clean.startsWith("+")) return clean;

  // Sinon → ajouter + (présumer international)
  return "+" + clean;
}
