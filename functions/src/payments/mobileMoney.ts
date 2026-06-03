import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

// ============================================================
// SIMULATION DE L'AGRÉGATEUR (CinetPay / Bizao)
// ============================================================
class PaymentAggregatorMock {
  static async initializeTransaction(amount: number, currency: string, phoneNumber: string, network: string) {
    // Simule l'appel réseau vers l'API de l'agrégateur
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          status: "PENDING_USSD_PUSH",
          message: `USSD Push envoyé au ${phoneNumber} sur le réseau ${network}`,
        });
      }, 1500);
    });
  }
}

// ============================================================
// FONCTIONS CLOUD
// ============================================================

/**
 * Appelé depuis l'application mobile (Parent) pour initier un paiement Mobile Money
 */
export const initializePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Vous devez être connecté pour initier un paiement."
    );
  }

  const { feeId, amount, phoneNumber, network, schoolId } = data;

  if (!feeId || !amount || !phoneNumber || !network || !schoolId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Paramètres manquants : feeId, amount, phoneNumber, network, schoolId"
    );
  }

  try {
    // 1. Enregistre l'intention de paiement dans Firestore
    const db = admin.firestore();
    const feeRef = db.collection("schools").doc(schoolId).collection("fees").doc(feeId);
    
    const feeDoc = await feeRef.get();
    if (!feeDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Facture introuvable.");
    }

    // 2. Appel à l'agrégateur (Simulé)
    const result: any = await PaymentAggregatorMock.initializeTransaction(
      amount,
      "XAF",
      phoneNumber,
      network
    );

    // 3. Sauvegarde l'ID de transaction pour le Webhook
    await feeRef.update({
      paymentStatus: "PENDING",
      transactionId: result.transactionId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      transactionId: result.transactionId,
      message: result.message,
    };
  } catch (error) {
    console.error("Erreur lors de l'initialisation du paiement :", error);
    throw new functions.https.HttpsError("internal", "Erreur serveur lors du paiement.");
  }
});

/**
 * Webhook public appelé par l'agrégateur quand le parent tape son code PIN et valide.
 *
 * Signature HMAC-SHA256 : CinetPay envoie l'en-tête `x-cinetpay-signature`
 * contenant HMAC-SHA256(raw body, secret). Le secret doit être configuré :
 *   - Firebase : `firebase functions:secrets:set CINETPAY_WEBHOOK_SECRET`
 *   - EAS (Expo) : `eas secret:create --scope project --name CINETPAY_WEBHOOK_SECRET --value <secret>`
 *     puis ajoutez la clé dans eas.json sous `env` pour les profils `preview` et `production`.
 */
export const paymentWebhook = functions.https.onRequest(async (req, res) => {
  const secret = process.env.CINETPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CINETPAY_WEBHOOK_SECRET is not set");
    res.status(500).send("Internal Server Error");
    return;
  }

  const signature = req.headers["x-cinetpay-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(401).send("Unauthorized: missing signature");
    return;
  }

  // req.rawBody is populated by Firebase Functions for HTTP triggers
  const rawBody: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signature, "hex");

  const signaturesMatch =
    expectedBuf.length === receivedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, receivedBuf);

  if (!signaturesMatch) {
    res.status(401).send("Unauthorized: invalid signature");
    return;
  }

  const { transactionId, status, schoolId, feeId } = req.body;

  if (!transactionId || !status || !schoolId || !feeId) {
    res.status(400).send("Bad Request: missing parameters");
    return;
  }

  try {
    const db = admin.firestore();
    const feeRef = db.collection("schools").doc(schoolId).collection("fees").doc(feeId);

    if (status === "SUCCESS") {
      await feeRef.update({
        status: "paid",
        paymentStatus: "SUCCESS",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[Paiement] Facture ${feeId} payée avec succès !`);
    } else {
      await feeRef.update({
        paymentStatus: "FAILED",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[Paiement] Échec pour la facture ${feeId}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error :", error);
    res.status(500).send("Internal Server Error");
  }
});
