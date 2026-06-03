// ============================================================
// CLOUD FUNCTIONS — GUICHET D'ENCAISSEMENT PHYSIQUE
//
// Enregistre les paiements espèces / chèques / virement
// faits directement au secrétariat.
// Génère un numéro de reçu séquentiel et un PDF téléchargeable.
// Optionnellement envoie le reçu par WhatsApp/SMS au parent.
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import PDFDocument from "pdfkit";
import { writeAuditLog } from "../utils/audit";
import { CustomClaims } from "../types";

const db      = admin.firestore();
const storage = admin.storage();

// ── Numéro de reçu séquentiel ─────────────────────────────────────────────────

async function nextReceiptNum(schoolId: string): Promise<string> {
  const year = new Date().getFullYear();
  const ref  = db.collection("_counters").doc(`cash_${schoolId}_${year}`);

  const num = await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const next = (snap.data()?.count ?? 0) + 1;
    t.set(ref, { count: next }, { merge: true });
    return next;
  });

  return `ESP-${year}-${String(num).padStart(5, "0")}`;
}

// ── Génération du reçu de caisse PDF ─────────────────────────────────────────

async function buildCashReceiptPDF(data: {
  receiptNum:     string;
  schoolName:     string;
  schoolAddress:  string;
  studentName:    string;
  parentName:     string;
  feeLabel:       string;
  amount:         number;
  currency:       string;
  method:         string;
  chequeNum?:     string;
  bankName?:      string;
  receivedByName: string;
  createdAt:      number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: [210 * 2.835, 148 * 2.835], margin: 30 }); // A5
    const chunks: Buffer[] = [];

    doc.on("data",  (c: Buffer) => chunks.push(c));
    doc.on("end",   ()          => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const date = new Date(data.createdAt).toLocaleDateString("fr-FR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const METHOD_LABELS: Record<string, string> = {
      especes: "Espèces", cheque: "Chèque", virement: "Virement bancaire", autre: "Autre",
    };

    // En-tête
    doc.fontSize(14).fillColor("#1E3A5F").font("Helvetica-Bold")
      .text(data.schoolName, { align: "center" })
      .fontSize(8).fillColor("#6B7280").font("Helvetica")
      .text(data.schoolAddress, { align: "center" })
      .moveDown(0.4);

    doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor("#E5E7EB").stroke().moveDown(0.4);

    doc.fontSize(13).fillColor("#1E3A5F").font("Helvetica-Bold")
      .text("REÇU DE CAISSE", { align: "center" })
      .fontSize(8).fillColor("#6B7280").font("Helvetica")
      .text(`N° ${data.receiptNum}`, { align: "center" })
      .moveDown(0.6);

    const row = (lbl: string, val: string) => {
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#374151")
        .text(`${lbl} :`, { continued: true })
        .font("Helvetica").fillColor("#111827").text(`  ${val}`)
        .moveDown(0.2);
    };

    row("Date",             date);
    row("Élève",            data.studentName);
    row("Parent / Tuteur",  data.parentName);
    row("Objet",            data.feeLabel);
    row("Mode de paiement", METHOD_LABELS[data.method] ?? data.method);
    if (data.chequeNum) row("N° Chèque", `${data.chequeNum} — ${data.bankName ?? ""}`);
    row("Reçu par",         data.receivedByName);

    doc.moveDown(0.5);
    doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor("#E5E7EB").stroke().moveDown(0.5);

    doc.fontSize(22).fillColor("#059669").font("Helvetica-Bold")
      .text(`${data.amount.toLocaleString("fr-FR")} ${data.currency}`, { align: "center" })
      .fontSize(8).fillColor("#6B7280").font("Helvetica")
      .text("MONTANT REÇU", { align: "center" })
      .moveDown(1.2);

    doc.fontSize(7).fillColor("#9CA3AF")
      .text("Reçu authentique — conservez ce document. Généré par EduSchool.", { align: "center" });

    doc.end();
  });
}

// ── Cloud Function ────────────────────────────────────────────────────────────

export const recordCashPayment = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "512MiB",
    timeoutSeconds:  60,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:      string;
    studentId:     string;
    studentName:   string;
    parentName:    string;
    parentPhone?:  string;
    feeLabel:      string;
    amount:        number;
    currency:      string;
    method:        string;
    chequeNum?:    string;
    bankName?:     string;
    notes?:        string;
    sendWhatsApp?: boolean;
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");

    const claims = request.auth.token as CustomClaims;
    if (!["direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement");
    }

    const { schoolId, sendWhatsApp, ...data } = request.data;
    const createdAt  = Date.now();
    const receiptNum = await nextReceiptNum(schoolId);

    // Infos école
    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    const school     = schoolSnap.data() ?? {};

    // 1. Enregistrer en Firestore
    const docRef = await db
      .collection("schools").doc(schoolId)
      .collection("cashPayments").add({
        ...data, schoolId, receiptNum, createdAt,
        receivedBy:     request.auth.uid,
        receivedByName: (await db.collection("users").doc(request.auth.uid).get()).data()?.displayName ?? request.auth.uid,
      });

    // 2. Générer le PDF
    const pdf = await buildCashReceiptPDF({
      receiptNum,
      schoolName:    school.name    ?? "École",
      schoolAddress: school.address ? `${school.address.street}, ${school.address.city}` : "",
      studentName:   data.studentName,
      parentName:    data.parentName,
      feeLabel:      data.feeLabel,
      amount:        data.amount,
      currency:      data.currency,
      method:        data.method,
      chequeNum:     data.chequeNum,
      bankName:      data.bankName,
      receivedByName: (await db.collection("users").doc(request.auth.uid).get()).data()?.displayName ?? "Secrétariat",
      createdAt,
    });

    // 3. Upload Storage
    const storagePath = `receipts/${schoolId}/cash_${receiptNum.replace(/-/g, "_")}.pdf`;
    await storage.bucket().file(storagePath).save(pdf, {
      metadata: { contentType: "application/pdf" },
    });

    const [signedUrl] = await storage.bucket().file(storagePath).getSignedUrl({
      action: "read", expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    // 4. Mettre à jour la référence Storage dans Firestore
    await docRef.update({ storageUrl: storagePath });

    // 5. Envoyer via WhatsApp si demandé et numéro disponible
    if (sendWhatsApp && data.parentPhone) {
      try {
        // Import dynamique pour éviter les dépendances circulaires
        const { sendWhatsAppMessage } = await import("../messaging/whatsapp");
        await sendWhatsAppMessage(
          data.parentPhone,
          `✅ Reçu de paiement\n\n📋 N° ${receiptNum}\n👤 Élève : ${data.studentName}\n💰 ${data.amount.toLocaleString("fr-FR")} ${data.currency}\n📌 ${data.feeLabel}\n\nMerci de votre paiement — ${school.name ?? "EduSchool"}`,
          schoolId,
        );
      } catch (e) {
        functions.logger.warn("WhatsApp receipt failed", { error: (e as Error).message });
      }
    }

    await writeAuditLog({
      schoolId,
      actorUid:  request.auth.uid,
      actorRole: claims.role,
      action:    "payment.cash_recorded",
      metadata:  { receiptNum, amount: data.amount, method: data.method },
    });

    return { success: true, receiptId: docRef.id, receiptNum, signedUrl };
  }
);
