// ============================================================
// CLOUD FUNCTIONS — EXPORT UNIVERSEL (XLSX / CSV / PDF)
//
// Architecture :
//   1. Client appelle requestExport()  → crée un ExportJob en Firestore
//   2. onExportJobCreated() se déclenche → génère le fichier en arrière-plan
//   3. Fichier stocké dans Firebase Storage (chemin sécurisé)
//   4. URL signée 24h inscrite dans le job → notification push au demandeur
//   5. Client poll le job (onSnapshot) ou reçoit la notif
//
// Librairie : ExcelJS pour XLSX (cellules stylisées, pas des CSV renommés)
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import ExcelJS from "exceljs";
import { Readable } from "stream";
import { writeAuditLog } from "../utils/audit";
import { CustomClaims } from "../types";

const db      = admin.firestore();
const storage = admin.storage();

// ── Couleurs de la marque pour les exports stylisés ──────────────────────────
const BRAND = {
  primary:     "FF1E3A5F",   // bleu marine
  accent:      "FF2563EB",   // bleu primaire
  lightBg:     "FFEFF6FF",   // bleu très clair
  border:      "FFE5E7EB",
  success:     "FF059669",
  warning:     "FFD97706",
  danger:      "FFDC2626",
  text:        "FF111827",
  textMuted:   "FF6B7280",
}

// ── Helper : style d'en-tête colonne ─────────────────────────────────────────
function headerStyle(col: ExcelJS.Column) {
  col.header = col.header
  if (col.header) {
    // appliqué via worksheet directement
  }
}

// ── Générateurs par dataset ───────────────────────────────────────────────────

async function buildStudentsSheet(
  wb: ExcelJS.Workbook,
  schoolId: string,
  filters: Record<string, string>,
): Promise<number> {
  const ws = wb.addWorksheet("Élèves", { pageSetup: { orientation: "landscape" } })

  ws.columns = [
    { header: "N°",             key: "num",     width: 5  },
    { header: "Nom & Prénom",   key: "name",    width: 28 },
    { header: "Classe",         key: "class",   width: 12 },
    { header: "Niveau",         key: "level",   width: 12 },
    { header: "N° Matricule",   key: "matric",  width: 16 },
    { header: "Email parent",   key: "parent",  width: 26 },
    { header: "Statut",         key: "status",  width: 12 },
    { header: "Date inscription", key: "created", width: 16 },
  ]

  styleHeaderRow(ws, 1)

  let q = db.collection("users").where("schoolId", "==", schoolId).where("role", "==", "student")
  if (filters.classId)    q = q.where("classId",    "==", filters.classId)    as any
  if (filters.archiveStatus) q = q.where("archiveStatus", "==", filters.archiveStatus) as any

  const snap = await (q as any).orderBy("displayName").get()
  let i = 1
  for (const doc of snap.docs) {
    const d = doc.data()
    const row = ws.addRow({
      num:     i++,
      name:    d.displayName ?? "",
      class:   d.className   ?? "",
      level:   d.levelName   ?? "",
      matric:  d.studentNumber ?? "",
      parent:  d.parentEmail  ?? "",
      status:  d.archiveStatus === "active" ? "Actif" : "Archivé",
      created: d.createdAt ? new Date(d.createdAt).toLocaleDateString("fr-FR") : "",
    })
    alternateRowStyle(ws, row, i)
  }
  return snap.size
}

async function buildGradesSheet(
  wb: ExcelJS.Workbook,
  schoolId: string,
  filters: Record<string, string>,
): Promise<number> {
  const ws = wb.addWorksheet("Notes & Bulletins")

  ws.columns = [
    { header: "Élève",        key: "student",   width: 26 },
    { header: "Classe",       key: "class",     width: 12 },
    { header: "Matière",      key: "subject",   width: 18 },
    { header: "Trimestre",    key: "tri",       width: 10 },
    { header: "Moyenne",      key: "avg",       width: 10 },
    { header: "Mention",      key: "mention",   width: 12 },
    { header: "Conduite",     key: "conduct",   width: 14 },
    { header: "Appréciation", key: "apprec",    width: 32 },
    { header: "Statut",       key: "status",    width: 12 },
    { header: "Professeur",   key: "teacher",   width: 22 },
  ]
  styleHeaderRow(ws, 1)

  let q: any = db.collection("schools").doc(schoolId).collection("bulletins")
  if (filters.trimestre)  q = q.where("trimestre", "==", filters.trimestre)
  if (filters.classId)    q = q.where("classId",   "==", filters.classId)
  if (filters.status)     q = q.where("status",    "==", filters.status)

  const snap = await q.orderBy("studentName").get()
  let i = 1
  for (const doc of snap.docs) {
    const d = doc.data()
    const avg = typeof d.average === "number" ? d.average : null
    const row = ws.addRow({
      student:  d.studentName   ?? "",
      class:    d.className     ?? "",
      subject:  d.subject       ?? "",
      tri:      d.trimestre     ?? "",
      avg:      avg !== null ? avg.toFixed(2) : "—",
      mention:  getMention(avg),
      conduct:  d.conduct       ?? "",
      apprec:   d.appreciation  ?? "",
      status:   statusLabel(d.status),
      teacher:  d.teacherName   ?? d.teacherId ?? "",
    })
    // Colorer la cellule moyenne selon le résultat
    if (avg !== null) {
      const avgCell = row.getCell("avg")
      avgCell.font = { bold: true, color: { argb: avg >= 10 ? BRAND.success : BRAND.danger } }
    }
    alternateRowStyle(ws, row, i++)
  }
  return snap.size
}

async function buildAttendanceSheet(
  wb: ExcelJS.Workbook,
  schoolId: string,
  filters: Record<string, string>,
): Promise<number> {
  const ws = wb.addWorksheet("Présences")

  ws.columns = [
    { header: "Date",      key: "date",    width: 12 },
    { header: "Jour",      key: "day",     width: 10 },
    { header: "Classe",    key: "class",   width: 12 },
    { header: "Matière",   key: "subject", width: 18 },
    { header: "Professeur",key: "teacher", width: 22 },
    { header: "Présents",  key: "present", width: 10 },
    { header: "Absents",   key: "absent",  width: 10 },
    { header: "Retards",   key: "late",    width: 10 },
    { header: "Total",     key: "total",   width: 8  },
    { header: "Taux présence", key: "rate", width: 14 },
  ]
  styleHeaderRow(ws, 1)

  let q: any = db.collection("schools").doc(schoolId).collection("attendance")
  if (filters.classId) q = q.where("classId", "==", filters.classId)
  if (filters.from)    q = q.where("date", ">=", filters.from)
  if (filters.to)      q = q.where("date", "<=", filters.to)

  const snap = await q.orderBy("date", "desc").limit(2000).get()
  let i = 1
  for (const doc of snap.docs) {
    const d = doc.data()
    const records: Record<string, { status: string }> = d.records ?? {}
    const total   = Object.keys(records).length
    const present = Object.values(records).filter(r => r.status === "present").length
    const late    = Object.values(records).filter(r => r.status === "late").length
    const absent  = total - present - late
    const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0

    const row = ws.addRow({
      date:    d.date       ?? "",
      day:     d.dayLabel   ?? "",
      class:   d.className  ?? "",
      subject: d.subject    ?? "",
      teacher: d.teacherId  ?? "",
      present,
      late,
      absent,
      total,
      rate:    `${rate}%`,
    })
    const rateCell = row.getCell("rate")
    rateCell.font = { color: { argb: rate >= 80 ? BRAND.success : rate >= 60 ? BRAND.warning : BRAND.danger } }
    alternateRowStyle(ws, row, i++)
  }
  return snap.size
}

async function buildPaymentsSheet(
  wb: ExcelJS.Workbook,
  schoolId: string,
  filters: Record<string, string>,
): Promise<number> {
  const ws = wb.addWorksheet("Paiements")

  ws.columns = [
    { header: "Date",         key: "date",     width: 14 },
    { header: "Élève",        key: "student",  width: 26 },
    { header: "Parent",       key: "parent",   width: 22 },
    { header: "Libellé",      key: "label",    width: 24 },
    { header: "Montant",      key: "amount",   width: 14 },
    { header: "Devise",       key: "currency", width: 8  },
    { header: "Réseau",       key: "network",  width: 14 },
    { header: "Réf. transaction", key: "txRef", width: 20 },
    { header: "Statut",       key: "status",   width: 12 },
    { header: "N° Reçu",      key: "receipt",  width: 18 },
  ]
  styleHeaderRow(ws, 1)

  let q: any = db.collection("schools").doc(schoolId).collection("payments")
  if (filters.status) q = q.where("status", "==", filters.status)
  if (filters.month)  q = q.where("month",  "==", filters.month)

  const snap = await q.orderBy("paidAt", "desc").get()

  // Charger les reçus pour cross-reference
  const receiptsSnap = await db.collection("schools").doc(schoolId).collection("receipts").get()
  const receiptByPayment = new Map<string, string>()
  receiptsSnap.docs.forEach(d => receiptByPayment.set(d.data().paymentId, d.data().receiptNum))

  let i = 1
  let totalAmount = 0
  for (const doc of snap.docs) {
    const d = doc.data()
    const amount = d.amount ?? 0
    totalAmount += d.status === "success" ? amount : 0
    const row = ws.addRow({
      date:     d.paidAt?.toDate?.()?.toLocaleDateString("fr-FR") ?? "",
      student:  d.studentName  ?? "",
      parent:   d.parentName   ?? "",
      label:    d.feeLabel     ?? d.feeId ?? "",
      amount:   amount,
      currency: d.currency     ?? "XOF",
      network:  d.network      ?? "",
      txRef:    d.transactionId ?? "",
      status:   d.status === "success" ? "Payé" : d.status === "pending" ? "En cours" : "Échoué",
      receipt:  receiptByPayment.get(doc.id) ?? "—",
    })
    row.getCell("amount").numFmt = "#,##0"
    const statusCell = row.getCell("status")
    statusCell.font = { color: { argb: d.status === "success" ? BRAND.success : d.status === "pending" ? BRAND.warning : BRAND.danger } }
    alternateRowStyle(ws, row, i++)
  }

  // Ligne de total
  const totalRow = ws.addRow({ label: "TOTAL ENCAISSÉ", amount: totalAmount, currency: snap.docs[0]?.data()?.currency ?? "XOF" })
  totalRow.font = { bold: true }
  totalRow.getCell("label").font = { bold: true }
  totalRow.getCell("amount").numFmt = "#,##0"
  totalRow.getCell("amount").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.lightBg } }

  return snap.size
}

// ── Helpers de style ──────────────────────────────────────────────────────────

function styleHeaderRow(ws: ExcelJS.Worksheet, rowNum: number) {
  const row = ws.getRow(rowNum)
  row.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.primary } }
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = {
      bottom: { style: "medium", color: { argb: BRAND.accent } },
    }
  })
  row.height = 22
}

function alternateRowStyle(ws: ExcelJS.Worksheet, row: ExcelJS.Row, index: number) {
  if (index % 2 === 0) {
    row.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
    })
  }
  row.eachCell(cell => {
    cell.alignment = { vertical: "middle" }
    cell.border = {
      bottom: { style: "hair", color: { argb: BRAND.border } },
    }
  })
}

function getMention(avg: number | null): string {
  if (avg === null) return "—"
  if (avg >= 16)   return "Très Bien"
  if (avg >= 14)   return "Bien"
  if (avg >= 12)   return "Assez Bien"
  if (avg >= 10)   return "Passable"
  return "Insuffisant"
}

function statusLabel(s: string): string {
  const MAP: Record<string, string> = {
    draft: "Brouillon", submitted: "Soumis", approved: "Validé",
    rejected: "Rejeté", published: "Publié",
  }
  return MAP[s] ?? s
}

// ── Génération CSV simple (fallback léger) ────────────────────────────────────

async function buildCSV(wb: ExcelJS.Workbook): Promise<Buffer> {
  const ws = wb.getWorksheet(1)!
  const lines: string[] = []
  ws.eachRow(row => {
    const cells: string[] = []
    row.eachCell({ includeEmpty: true }, cell => {
      const v = String(cell.value ?? "").replace(/"/g, '""')
      cells.push(`"${v}"`)
    })
    lines.push(cells.join(";"))
  })
  return Buffer.from("﻿" + lines.join("\r\n"), "utf8")  // BOM pour Excel FR
}

// ── Cloud Function : demande d'export ─────────────────────────────────────────

export const requestExport = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "256MiB",
    timeoutSeconds:  30,
  },
  async (request: functions.https.CallableRequest<{
    dataset: string;
    format:  string;
    filters?: Record<string, string>;
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required")

    const claims   = request.auth.token as CustomClaims
    const schoolId = claims.schoolId

    if (!["direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement")
    }

    const { dataset, format, filters = {} } = request.data

    const jobRef = await db.collection("schools").doc(schoolId).collection("exportJobs").add({
      schoolId,
      requestedBy: request.auth.uid,
      dataset,
      format,
      filters,
      status:      "queued",
      requestedAt: Date.now(),
    })

    return { jobId: jobRef.id }
  }
)

// ── Cloud Function : traitement du job (trigger Firestore) ────────────────────

export const processExportJob = functions.firestore.onDocumentCreated(
  {
    document:      "schools/{schoolId}/exportJobs/{jobId}",
    region:        "europe-west1",
    memory:        "1GiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    const snap     = event.data
    if (!snap) return
    const job      = snap.data()
    const schoolId = event.params.schoolId
    const jobId    = event.params.jobId

    // Marquer comme en cours
    await snap.ref.update({ status: "processing" })

    try {
      const wb = new ExcelJS.Workbook()
      wb.creator  = "EduSchool"
      wb.created  = new Date()
      wb.modified = new Date()

      // En-tête de métadonnées (première feuille)
      const infoWs = wb.addWorksheet("Informations")
      const schoolSnap = await db.collection("schools").doc(schoolId).get()
      const school     = schoolSnap.data() ?? {}
      infoWs.addRow(["Export EduSchool"]).font = { bold: true, size: 14 }
      infoWs.addRow(["École",       school.name   ?? schoolId])
      infoWs.addRow(["Dataset",     job.dataset])
      infoWs.addRow(["Format",      job.format.toUpperCase()])
      infoWs.addRow(["Généré le",   new Date().toLocaleString("fr-FR")])
      infoWs.addRow(["Demandé par", job.requestedBy])
      if (Object.keys(job.filters ?? {}).length > 0) {
        infoWs.addRow(["Filtres", JSON.stringify(job.filters)])
      }

      let rowCount = 0

      switch (job.dataset) {
        case "students":
          rowCount = await buildStudentsSheet(wb, schoolId, job.filters ?? {});     break
        case "grades":
          rowCount = await buildGradesSheet(wb, schoolId, job.filters ?? {});       break
        case "attendance":
          rowCount = await buildAttendanceSheet(wb, schoolId, job.filters ?? {});   break
        case "payments":
          rowCount = await buildPaymentsSheet(wb, schoolId, job.filters ?? {});     break
        default:
          throw new Error(`Dataset inconnu : ${job.dataset}`)
      }

      // Générer le buffer
      const ext    = job.format === "csv" ? "csv" : "xlsx"
      const buffer = job.format === "csv"
        ? await buildCSV(wb)
        : await wb.xlsx.writeBuffer() as Buffer

      // Upload Storage
      const filename    = `${job.dataset}_${new Date().toISOString().split("T")[0]}.${ext}`
      const storagePath = `exports/${schoolId}/${jobId}/${filename}`
      const file        = storage.bucket().file(storagePath)

      await file.save(buffer, {
        metadata: {
          contentType: ext === "csv"
            ? "text/csv; charset=UTF-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      })

      // URL signée 24h
      const [signedUrl] = await file.getSignedUrl({
        action:  "read",
        expires: Date.now() + 24 * 60 * 60 * 1000,
      })

      await snap.ref.update({
        status:      "done",
        storageUrl:  storagePath,
        signedUrl,
        rowCount,
        completedAt: Date.now(),
        filename,
      })

      // Notification push au demandeur
      const tokenSnap = await db.collection("fcmTokens").where("userId", "==", job.requestedBy).get()
      if (!tokenSnap.empty) {
        const tokens = tokenSnap.docs.map(d => d.data().token as string)
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: "Export prêt ✅",
            body:  `${job.dataset} (${rowCount} lignes) — disponible 24h`,
          },
          data: { jobId, type: "export_ready" },
        })
      }

    } catch (e) {
      await snap.ref.update({ status: "error", errorMsg: (e as Error).message })
      functions.logger.error("export job failed", { jobId, error: (e as Error).message })
    }
  }
)
