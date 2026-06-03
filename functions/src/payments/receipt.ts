// ============================================================
// CLOUD FUNCTIONS - GÉNÉRATION DE REÇUS PDF
// Génère un reçu officiel de paiement, le stocke dans Firebase Storage
// et retourne une URL signée valable 1 heure
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import PDFDocument from "pdfkit";
import { Readable } from "stream";
import { writeAuditLog } from "../utils/audit";
import { CustomClaims } from "../types";

const db      = admin.firestore();
const storage = admin.storage();

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReceiptRequest {
  paymentId: string;
  schoolId:  string;
}

interface ReceiptResponse {
  success:    boolean;
  signedUrl:  string;       // URL valable 1 heure
  receiptNum: string;
  storagePath: string;
}

// ── Génération du numéro de reçu séquentiel ──────────────────────────────────

async function generateReceiptNumber(schoolId: string): Promise<string> {
  const year     = new Date().getFullYear();
  const counterRef = db.collection("_counters").doc(`receipt_${schoolId}_${year}`);

  const num = await db.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    const next = (snap.data()?.count ?? 0) + 1;
    t.set(counterRef, { count: next }, { merge: true });
    return next;
  });

  const paddedNum = String(num).padStart(5, "0");
  const schoolSlug = schoolId.substring(0, 6).toUpperCase();
  return `${year}-${schoolSlug}-${paddedNum}`;
}

// ── Génération du PDF via PDFKit ──────────────────────────────────────────────

async function buildReceiptPDF(data: {
  receiptNum:    string;
  schoolName:    string;
  schoolAddress: string;
  parentName:    string;
  studentName:   string;
  className:     string;
  feeLabel:      string;
  amount:        number;
  currency:      string;
  paidAt:        admin.firestore.Timestamp;
  paymentMethod: string;
  transactionId: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: "A5", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data",  (chunk: Buffer) => chunks.push(chunk));
    doc.on("end",   ()              => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const {
      receiptNum, schoolName, schoolAddress, parentName, studentName,
      className, feeLabel, amount, currency, paidAt, paymentMethod, transactionId,
    } = data;

    const paidDate = paidAt.toDate().toLocaleDateString("fr-FR", {
      year: "numeric", month: "long", day: "numeric",
    });
    const paidTime = paidAt.toDate().toLocaleTimeString("fr-FR", {
      hour: "2-digit", minute: "2-digit",
    });

    // ── En-tête ──────────────────────────────────────────────────────────────
    doc
      .fontSize(18).fillColor("#1E3A5F").font("Helvetica-Bold")
      .text(schoolName, { align: "center" })
      .fontSize(9).fillColor("#6B7280").font("Helvetica")
      .text(schoolAddress, { align: "center" })
      .moveDown(0.5);

    // Ligne de séparation
    doc.moveTo(40, doc.y).lineTo(375, doc.y).strokeColor("#E5E7EB").stroke().moveDown(0.5);

    // Titre
    doc
      .fontSize(14).fillColor("#1E3A5F").font("Helvetica-Bold")
      .text("REÇU DE PAIEMENT", { align: "center" })
      .fontSize(9).fillColor("#6B7280").font("Helvetica")
      .text(`N° ${receiptNum}`, { align: "center" })
      .moveDown(0.8);

    // ── Bloc infos ────────────────────────────────────────────────────────────
    const rowY = (label: string, value: string) => {
      doc
        .fontSize(9).fillColor("#374151").font("Helvetica-Bold").text(label, { continued: true })
        .font("Helvetica").fillColor("#111827").text(`  ${value}`)
        .moveDown(0.3);
    };

    rowY("Date de paiement :",    `${paidDate} à ${paidTime}`);
    rowY("Parent / Tuteur :",      parentName);
    rowY("Élève :",                studentName);
    rowY("Classe :",               className);
    rowY("Objet du paiement :",    feeLabel);
    rowY("Mode de paiement :",     paymentMethod);
    rowY("Réf. transaction :",     transactionId);

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(375, doc.y).strokeColor("#E5E7EB").stroke().moveDown(0.5);

    // ── Montant ───────────────────────────────────────────────────────────────
    doc
      .fontSize(22).fillColor("#059669").font("Helvetica-Bold")
      .text(`${amount.toLocaleString("fr-FR")} ${currency}`, { align: "center" })
      .moveDown(0.3)
      .fontSize(9).fillColor("#6B7280").font("Helvetica")
      .text("MONTANT PAYÉ", { align: "center" })
      .moveDown(1);

    // ── Pied de page ──────────────────────────────────────────────────────────
    doc.moveTo(40, doc.y).lineTo(375, doc.y).strokeColor("#E5E7EB").stroke().moveDown(0.5);
    doc
      .fontSize(7).fillColor("#9CA3AF")
      .text(
        "Ce reçu constitue une preuve officielle de paiement. " +
        "Conservez-le précieusement. Document généré automatiquement par EduSchool.",
        { align: "center" },
      );

    doc.end();
  });
}

// ── Cloud Function callable ───────────────────────────────────────────────────

export const generatePaymentReceipt = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "512MiB",
    timeoutSeconds:  60,
    secrets:         [],
  },
  async (
    request: functions.https.CallableRequest<ReceiptRequest>
  ): Promise<ReceiptResponse> => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const { paymentId, schoolId } = request.data;
    const claims = request.auth.token as CustomClaims;

    // Seuls parent (pour son paiement) et direction peuvent générer un reçu
    const isParent    = claims.role === "parent" && claims.schoolId === schoolId;
    const isDirection = claims.role === "direction" && claims.schoolId === schoolId;
    if (!isParent && !isDirection) {
      throw new functions.https.HttpsError("permission-denied", "Non autorisé");
    }

    // 1. Récupérer le paiement
    const paymentSnap = await db
      .collection("schools").doc(schoolId)
      .collection("payments").doc(paymentId)
      .get();

    if (!paymentSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Paiement introuvable");
    }

    const payment = paymentSnap.data()!;

    // Un parent ne peut télécharger que ses propres reçus
    if (isParent && payment.parentId !== request.auth.uid) {
      throw new functions.https.HttpsError("permission-denied", "Non autorisé");
    }

    // 2. Vérifier si un reçu existe déjà pour ce paiement
    const existingReceiptSnap = await db
      .collection("schools").doc(schoolId)
      .collection("receipts")
      .where("paymentId", "==", paymentId)
      .limit(1)
      .get();

    if (!existingReceiptSnap.empty) {
      const existing    = existingReceiptSnap.docs[0].data();
      const storagePath = existing.storageUrl as string;
      const file        = storage.bucket().file(storagePath);

      const [signedUrl] = await file.getSignedUrl({
        action:  "read",
        expires: Date.now() + 60 * 60 * 1000, // 1 heure
      });

      return { success: true, signedUrl, receiptNum: existing.receiptNum, storagePath };
    }

    // 3. Récupérer les infos école et élève
    const [schoolSnap, studentSnap] = await Promise.all([
      db.collection("schools").doc(schoolId).get(),
      db.collection("users").doc(payment.studentId).get(),
    ]);

    const school  = schoolSnap.data() ?? {};
    const student = studentSnap.data() ?? {};

    // 4. Générer le numéro de reçu
    const receiptNum = await generateReceiptNumber(schoolId);

    // 5. Générer le PDF
    const pdfBuffer = await buildReceiptPDF({
      receiptNum,
      schoolName:    school.name    ?? "École",
      schoolAddress: school.address ? `${school.address.street}, ${school.address.city}` : "",
      parentName:    payment.parentName  ?? "Parent",
      studentName:   student.displayName ?? payment.studentId,
      className:     student.className   ?? "",
      feeLabel:      payment.feeLabel    ?? payment.feeId,
      amount:        payment.amount,
      currency:      payment.currency    ?? "XOF",
      paidAt:        payment.paidAt      ?? admin.firestore.Timestamp.now(),
      paymentMethod: payment.network     ?? "Mobile Money",
      transactionId: payment.transactionId ?? paymentId,
    });

    // 6. Upload dans Storage (chemin sécurisé : non-guessable)
    const storagePath = `receipts/${schoolId}/${receiptNum.replace(/-/g, "_")}.pdf`;
    const file        = storage.bucket().file(storagePath);

    await file.save(pdfBuffer, {
      metadata: { contentType: "application/pdf" },
    });

    // 7. Enregistrer la référence en Firestore
    await db
      .collection("schools").doc(schoolId)
      .collection("receipts").add({
        paymentId,
        studentId:   payment.studentId,
        parentId:    payment.parentId,
        amount:      payment.amount,
        currency:    payment.currency ?? "XOF",
        feeLabel:    payment.feeLabel ?? payment.feeId,
        receiptNum,
        storageUrl:  storagePath,   // Chemin Storage, PAS l'URL signée (éphémère)
        generatedAt: admin.firestore.Timestamp.now(),
        generatedBy: request.auth.uid,
      });

    // 8. URL signée (1h)
    const [signedUrl] = await file.getSignedUrl({
      action:  "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    // 9. Audit
    await writeAuditLog({
      schoolId,
      actorUid:   request.auth.uid,
      actorRole:  claims.role,
      action:     "payment.receipt_generated",
      metadata:   { paymentId, receiptNum },
    });

    return { success: true, signedUrl, receiptNum, storagePath };
  }
);
