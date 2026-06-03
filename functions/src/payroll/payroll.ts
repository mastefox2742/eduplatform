// ============================================================
// CLOUD FUNCTIONS — MODULE DE PAIE ENSEIGNANTS
//
// Calcule automatiquement la fiche de paie mensuelle :
//   - Permanent / Contractuel → salaire fixe ± retenues absences
//   - Vacataire               → heures effectuées × taux horaire
//
// La source de vérité des heures = collection attendance
// (présences enregistrées par le prof lui-même dans l'app)
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { writeAuditLog } from "../utils/audit";
import { CustomClaims } from "../types";

const db = admin.firestore();

// ── Types internes ────────────────────────────────────────────────────────────

interface PayrollCalculation {
  teacherId:      string;
  teacherName:    string;
  contractId:     string;
  month:          string;
  scheduledHours: number;
  effectiveHours: number;
  absenceHours:   number;
  grossAmount:    number;
  deductions:     { label: string; amount: number }[];
  netAmount:      number;
  currency:       string;
  basis:          "monthly" | "hourly";
}

// ── Calcul des heures effectives depuis l'attendance ─────────────────────────

async function computeEffectiveHours(
  schoolId:  string,
  teacherId: string,
  month:     string,   // "2026-05"
): Promise<{ scheduled: number; effective: number }> {
  const [year, mon] = month.split("-")
  const from = `${year}-${mon}-01`
  const to   = `${year}-${mon}-31`  // Firestore accepte les dates invalides en range

  const snap = await db
    .collection("schools").doc(schoolId)
    .collection("attendance")
    .where("teacherId", "==", teacherId)
    .where("date", ">=", from)
    .where("date", "<=", to)
    .get()

  let effective = 0
  let scheduled = 0

  for (const doc of snap.docs) {
    const d = doc.data()
    // Chaque document d'appel = 1 séance d'une heure (convention)
    // En production : utiliser la durée réelle du créneau
    scheduled += 1
    const records: Record<string, { status: string }> = d.records ?? {}
    const teacherRecord = records[teacherId]
    if (!teacherRecord || teacherRecord.status === "present" || teacherRecord.status === "late") {
      effective += 1
    }
  }

  return { scheduled, effective }
}

// ── Calcul de la fiche de paie ────────────────────────────────────────────────

async function calculatePayslip(
  schoolId: string,
  teacherId: string,
  month: string,
): Promise<PayrollCalculation> {
  // Récupérer le contrat actif
  const contractSnap = await db
    .collection("schools").doc(schoolId)
    .collection("teacherContracts")
    .where("teacherId", "==", teacherId)
    .where("isActive",  "==", true)
    .limit(1)
    .get()

  if (contractSnap.empty) {
    throw new Error(`Pas de contrat actif pour l'enseignant ${teacherId}`)
  }

  const contract    = contractSnap.docs[0].data()
  const contractId  = contractSnap.docs[0].id
  const { scheduled, effective } = await computeEffectiveHours(schoolId, teacherId, month)
  const absenceHours = Math.max(0, scheduled - effective)

  let grossAmount: number
  const deductions: { label: string; amount: number }[] = []

  if (contract.paymentBasis === "hourly") {
    // Vacataire : heures effectuées × taux
    grossAmount = effective * (contract.hourlyRate ?? 0)
  } else {
    // Permanent / Contractuel : salaire de base
    grossAmount = contract.baseSalary ?? 0

    // Retenue pour absences non-justifiées (prorata)
    if (absenceHours > 0 && scheduled > 0) {
      const dailyRate     = grossAmount / scheduled
      const absenceAmount = Math.round(dailyRate * absenceHours)
      deductions.push({ label: `Retenue absences (${absenceHours}h)`, amount: absenceAmount })
    }
  }

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)
  const netAmount       = Math.max(0, grossAmount - totalDeductions)

  return {
    teacherId,
    teacherName:    contract.teacherName ?? teacherId,
    contractId,
    month,
    scheduledHours: scheduled,
    effectiveHours: effective,
    absenceHours,
    grossAmount,
    deductions,
    netAmount,
    currency:       contract.currency ?? "XOF",
    basis:          contract.paymentBasis,
  }
}

// ── Cloud Function : calcul de la paie d'un mois ─────────────────────────────

export const generateMonthlyPayroll = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "512MiB",
    timeoutSeconds:  120,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:  string;
    month:     string;       // "2026-05"
    teacherIds?: string[];   // si absent → tous les enseignants actifs
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required")

    const claims = request.auth.token as CustomClaims
    if (!["direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement")
    }

    const { schoolId, month, teacherIds } = request.data

    // Récupérer la liste des enseignants à traiter
    let ids: string[]
    if (teacherIds && teacherIds.length > 0) {
      ids = teacherIds
    } else {
      const teacherSnap = await db
        .collection("users")
        .where("schoolId", "==", schoolId)
        .where("role",     "==", "teacher")
        .where("isActive", "==", true)
        .get()
      ids = teacherSnap.docs.map(d => d.id)
    }

    const results:   PayrollCalculation[] = []
    const errors:    { teacherId: string; error: string }[] = []

    for (const tid of ids) {
      try {
        // Vérifier si une fiche existe déjà
        const existing = await db
          .collection("schools").doc(schoolId)
          .collection("payroll")
          .where("teacherId", "==", tid)
          .where("month",     "==", month)
          .limit(1)
          .get()

        if (!existing.empty && existing.docs[0].data().status === "paid") {
          // Déjà payé — on ne recalcule pas
          continue
        }

        const calc = await calculatePayslip(schoolId, tid, month)

        // Upsert de la fiche de paie
        const data = {
          ...calc,
          schoolId,
          status:      "draft",
          generatedAt: Date.now(),
          updatedAt:   Date.now(),
        }

        if (!existing.empty) {
          await existing.docs[0].ref.update(data)
        } else {
          await db.collection("schools").doc(schoolId).collection("payroll").add(data)
        }

        results.push(calc)
      } catch (e) {
        errors.push({ teacherId: tid, error: (e as Error).message })
        functions.logger.warn("payroll calc error", { tid, error: (e as Error).message })
      }
    }

    await writeAuditLog({
      schoolId,
      actorUid:  request.auth.uid,
      actorRole: claims.role,
      action:    "payroll.generated",
      metadata:  { month, count: results.length, errors: errors.length },
    })

    const totalNet = results.reduce((s, r) => s + r.netAmount, 0)
    return { success: true, processed: results.length, errors, totalNet, month }
  }
)

// ── Cloud Function : valider une fiche de paie ────────────────────────────────

export const validatePayslip = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "256MiB",
    timeoutSeconds:  30,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:  string;
    payrollId: string;
    action:    "validate" | "mark_paid";
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required")

    const claims = request.auth.token as CustomClaims
    if (!["direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement")
    }

    const { schoolId, payrollId, action } = request.data
    const ref = db.collection("schools").doc(schoolId).collection("payroll").doc(payrollId)
    const snap = await ref.get()
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "Fiche introuvable")

    const update: Record<string, unknown> = { updatedAt: Date.now() }
    if (action === "validate") {
      update.status      = "validated"
      update.validatedBy = request.auth.uid
      update.validatedAt = Date.now()
    } else {
      update.status = "paid"
      update.paidAt = Date.now()
    }

    await ref.update(update)
    await writeAuditLog({
      schoolId,
      actorUid:  request.auth.uid,
      actorRole: claims.role,
      action:    `payroll.${action}`,
      metadata:  { payrollId },
    })

    return { success: true }
  }
)
