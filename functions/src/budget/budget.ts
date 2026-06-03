// ============================================================
// CLOUD FUNCTIONS — BUDGET & TRÉSORERIE
//
// - Agrégation du cash-flow (entrées scolarités + sorties dépenses)
// - Alertes automatiques si dépenses > X% du budget alloué
// - Snapshot mensuel pour les graphiques de tendance
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { writeAuditLog } from "../utils/audit";
import { CustomClaims } from "../types";

const db = admin.firestore();

// ── Cloud Function : ajouter une dépense ─────────────────────────────────────

export const addExpense = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "256MiB",
    timeoutSeconds:  30,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:   string;
    category:   string;
    label:      string;
    amount:     number;
    currency:   string;
    date:       string;
    notes?:     string;
    receiptUrl?: string;
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required")

    const claims = request.auth.token as CustomClaims
    if (!["direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement")
    }

    const { schoolId, category, label, amount, currency, date, notes, receiptUrl } = request.data

    // Récupérer le profil du demandeur
    const userSnap = await db.collection("users").doc(request.auth.uid).get()
    const userName = userSnap.data()?.displayName ?? request.auth.uid

    const docRef = await db.collection("schools").doc(schoolId).collection("expenses").add({
      schoolId, category, label, amount, currency, date, notes: notes ?? "",
      receiptUrl: receiptUrl ?? null,
      paidBy:     request.auth.uid,
      paidByName: userName,
      createdAt:  Date.now(),
    })

    // Vérifier les alertes de dépassement de budget
    await checkBudgetAlert(schoolId, category, claims)

    await writeAuditLog({
      schoolId,
      actorUid:  request.auth.uid,
      actorRole: claims.role,
      action:    "budget.expense_added",
      metadata:  { category, amount, currency, label },
    })

    return { success: true, expenseId: docRef.id }
  }
)

// ── Cloud Function : tableau de bord trésorerie ───────────────────────────────

export const getCashflowDashboard = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "512MiB",
    timeoutSeconds:  60,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:     string;
    academicYear: string;    // "2025-2026"
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required")

    const claims = request.auth.token as CustomClaims
    if (!["direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement")
    }

    const { schoolId, academicYear } = request.data
    const [startYear] = academicYear.split("-")
    const from = `${startYear}-09-01`
    const to   = `${Number(startYear) + 1}-08-31`

    // 1. Revenus — paiements de scolarité confirmés
    const paymentsSnap = await db
      .collection("schools").doc(schoolId)
      .collection("payments")
      .where("status", "==", "success")
      .where("date",   ">=", from)
      .where("date",   "<=", to)
      .get()

    // Agrégation par mois
    const incomeByMonth: Record<string, number> = {}
    let totalIncome = 0
    for (const doc of paymentsSnap.docs) {
      const d = doc.data()
      const month = (d.date as string ?? "").substring(0, 7)  // "2026-01"
      incomeByMonth[month] = (incomeByMonth[month] ?? 0) + (d.amount ?? 0)
      totalIncome += d.amount ?? 0
    }

    // 2. Dépenses — par catégorie et par mois
    const expensesSnap = await db
      .collection("schools").doc(schoolId)
      .collection("expenses")
      .where("date", ">=", from)
      .where("date", "<=", to)
      .get()

    const expenseByMonth:    Record<string, number> = {}
    const expenseByCategory: Record<string, number> = {}
    let totalExpenses = 0
    for (const doc of expensesSnap.docs) {
      const d = doc.data()
      const month = (d.date as string ?? "").substring(0, 7)
      expenseByMonth[month]       = (expenseByMonth[month]       ?? 0) + (d.amount ?? 0)
      expenseByCategory[d.category] = (expenseByCategory[d.category] ?? 0) + (d.amount ?? 0)
      totalExpenses += d.amount ?? 0
    }

    // 3. Paie enseignants (depuis payroll validé ou payé)
    const payrollSnap = await db
      .collection("schools").doc(schoolId)
      .collection("payroll")
      .where("status", "in", ["validated", "paid"])
      .get()

    let totalPayroll = 0
    for (const doc of payrollSnap.docs) {
      totalPayroll += doc.data().netAmount ?? 0
      const month = (doc.data().month as string)
      expenseByMonth[month]           = (expenseByMonth[month]           ?? 0) + (doc.data().netAmount ?? 0)
      expenseByCategory["salaires"]   = (expenseByCategory["salaires"]   ?? 0) + (doc.data().netAmount ?? 0)
      totalExpenses += doc.data().netAmount ?? 0
    }

    // 4. Lignes budgétaires (prévisionnel)
    const budgetSnap = await db
      .collection("schools").doc(schoolId)
      .collection("budgetLines")
      .where("year", "==", academicYear)
      .get()

    const budgetByCategory: Record<string, { budgeted: number; actual: number; alert: number }> = {}
    for (const doc of budgetSnap.docs) {
      const d = doc.data()
      budgetByCategory[d.category] = {
        budgeted: d.budgeted ?? 0,
        actual:   expenseByCategory[d.category] ?? 0,
        alert:    d.alertThreshold ?? 90,
      }
    }

    // 5. Construire les séries temporelles (12 mois)
    const months: string[] = []
    for (let m = 0; m < 12; m++) {
      const d = new Date(Number(startYear), 8 + m)  // Sept = 8
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    }

    const cashflowSeries = months.map(month => ({
      month,
      income:   incomeByMonth[month]   ?? 0,
      expenses: expenseByMonth[month]  ?? 0,
      balance:  (incomeByMonth[month]  ?? 0) - (expenseByMonth[month] ?? 0),
    }))

    const balance     = totalIncome - totalExpenses
    const alerts: { category: string; percent: number; message: string }[] = []

    for (const [cat, data] of Object.entries(budgetByCategory)) {
      if (data.budgeted > 0) {
        const percent = Math.round((data.actual / data.budgeted) * 100)
        if (percent >= data.alert) {
          alerts.push({
            category: cat,
            percent,
            message: `${cat} : ${percent}% du budget utilisé (${data.actual.toLocaleString()} / ${data.budgeted.toLocaleString()})`,
          })
        }
      }
    }

    return {
      summary: {
        totalIncome,
        totalExpenses,
        totalPayroll,
        balance,
        currency: "XOF",
      },
      cashflowSeries,
      expenseByCategory,
      budgetByCategory,
      alerts,
    }
  }
)

// ── Vérification d'alerte budget ──────────────────────────────────────────────

async function checkBudgetAlert(
  schoolId: string,
  category: string,
  claims:   CustomClaims,
): Promise<void> {
  try {
    const budgetSnap = await db
      .collection("schools").doc(schoolId)
      .collection("budgetLines")
      .where("category", "==", category)
      .limit(1)
      .get()

    if (budgetSnap.empty) return

    const budget      = budgetSnap.docs[0].data()
    const threshold   = budget.alertThreshold ?? 90

    const expensesSnap = await db
      .collection("schools").doc(schoolId)
      .collection("expenses")
      .where("category", "==", category)
      .get()

    const actual  = expensesSnap.docs.reduce((s, d) => s + (d.data().amount ?? 0), 0)
    const percent = budget.budgeted > 0 ? Math.round((actual / budget.budgeted) * 100) : 0

    if (percent >= threshold) {
      // Créer une alerte dans Firestore pour notification direction
      await db.collection("schools").doc(schoolId).collection("budgetAlerts").add({
        category,
        percent,
        actual,
        budgeted:   budget.budgeted,
        currency:   budget.currency ?? "XOF",
        message:    `${category} : ${percent}% du budget annuel atteint`,
        triggeredAt: Date.now(),
        acknowledged: false,
      })
    }
  } catch (e) {
    functions.logger.warn("checkBudgetAlert failed", { error: (e as Error).message })
  }
}
