// ============================================================
// CLOUD FUNCTIONS — RAPPORTS MINISTÉRIELS PRÉ-REMPLIS
//
// Génère automatiquement les documents officiels demandés
// par le Ministère de l'Éducation (CEPE, BEPC, BAC, statistiques).
//
// Architecture :
//  1. Vérification de conformité (données manquantes ?)
//  2. Génération XLSX (format taboulaire ministère) avec ExcelJS
//     OU injection dans un PDF canevas avec pdf-lib
//  3. Stockage dans Firebase Storage + URL signée 24h
//
// Actuellement : XLSX structuré conforme aux formats courants
// (Congo, Côte d'Ivoire, Sénégal). Les PDF officiels nécessitent
// d'uploader les canevas du ministère local dans Storage.
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import ExcelJS from "exceljs";
import { writeAuditLog } from "../utils/audit";
import { CustomClaims } from "../types";

const db      = admin.firestore();
const storage = admin.storage();

// ── Champs requis par type de rapport ────────────────────────────────────────

const REQUIRED_FIELDS: Record<string, string[]> = {
  cepe_inscription:        ["studentNumber", "displayName", "levelId", "parentEmail"],
  bepc_inscription:        ["studentNumber", "displayName", "levelId", "parentEmail"],
  bac_inscription:         ["studentNumber", "displayName", "levelId", "parentEmail"],
  statistiques_annuelles:  [],   // Données agrégées — pas de champs individuels requis
  liste_effectifs:         ["displayName", "className", "levelName"],
}

// ── Vérification de conformité ────────────────────────────────────────────────

async function checkCompliance(
  schoolId:    string,
  reportType:  string,
  targetClass?: string,
): Promise<{ eligible: any[]; missing: { studentId: string; name: string; fields: string[] }[] }> {
  const required = REQUIRED_FIELDS[reportType] ?? []

  let q: any = db.collection("users")
    .where("schoolId", "==", schoolId)
    .where("role",     "==", "student")
    .where("archiveStatus", "==", "active")

  if (targetClass) q = q.where("classId", "==", targetClass)

  const snap = await q.get()

  const eligible: any[] = []
  const missing: { studentId: string; name: string; fields: string[] }[] = []

  for (const doc of snap.docs) {
    const data = doc.data()
    const missingFields = required.filter(f => !data[f] || data[f] === "")

    if (missingFields.length > 0) {
      missing.push({ studentId: doc.id, name: data.displayName ?? doc.id, fields: missingFields })
    } else {
      eligible.push({ id: doc.id, ...data })
    }
  }

  return { eligible, missing }
}

// ── Générateurs de rapport ────────────────────────────────────────────────────

async function buildExamInscription(
  wb:          ExcelJS.Workbook,
  school:      Record<string, any>,
  students:    any[],
  reportType:  string,
  academicYear: string,
): Promise<number> {
  const examLabel: Record<string, string> = {
    cepe_inscription: "CEPE (Certificat d'Études Primaires Élémentaires)",
    bepc_inscription: "BEPC (Brevet d'Études du Premier Cycle)",
    bac_inscription:  "BAC (Baccalauréat)",
  }

  const ws = wb.addWorksheet("Inscription examen")

  // En-tête institutionnel
  ws.mergeCells("A1:H1")
  ws.getCell("A1").value   = `LISTE D'INSCRIPTION — ${examLabel[reportType] ?? reportType.toUpperCase()}`
  ws.getCell("A1").font    = { bold: true, size: 14, color: { argb: "FF1E3A5F" } }
  ws.getCell("A1").alignment = { horizontal: "center" }
  ws.getRow(1).height = 30

  ws.mergeCells("A2:H2")
  ws.getCell("A2").value     = `Établissement : ${school.name ?? ""} — Année scolaire : ${academicYear}`
  ws.getCell("A2").font      = { italic: true, size: 11 }
  ws.getCell("A2").alignment = { horizontal: "center" }
  ws.addRow([])

  // En-tête colonnes
  const headerRow = ws.addRow([
    "N°", "N° Matricule", "Nom & Prénom", "Date de naissance",
    "Lieu de naissance", "Sexe", "Classe", "Niveau",
  ])
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = { bottom: { style: "medium" } }
  })
  headerRow.height = 20

  ws.columns = [
    { key: "num",        width: 5  },
    { key: "matric",     width: 16 },
    { key: "name",       width: 28 },
    { key: "birthdate",  width: 14 },
    { key: "birthplace", width: 20 },
    { key: "sex",        width: 6  },
    { key: "class",      width: 12 },
    { key: "level",      width: 12 },
  ]

  let i = 1
  for (const s of students) {
    const row = ws.addRow([
      i++,
      s.studentNumber      ?? "",
      s.displayName        ?? "",
      s.birthDate          ?? "",
      s.birthPlace         ?? "",
      s.gender             ?? "",
      s.className          ?? "",
      s.levelName          ?? "",
    ])
    if (i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
      })
    }
    row.eachCell(cell => {
      cell.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } }
    })
  }

  // Signature bas de page
  ws.addRow([])
  ws.addRow([`Fait à ${school.address?.city ?? ""}, le ${new Date().toLocaleDateString("fr-FR")}`])
  ws.addRow(["Le Directeur / La Directrice"])

  return students.length
}

async function buildEffectifsList(
  wb:          ExcelJS.Workbook,
  school:      Record<string, any>,
  students:    any[],
  academicYear: string,
): Promise<number> {
  const ws = wb.addWorksheet("Liste des effectifs")

  ws.mergeCells("A1:F1")
  ws.getCell("A1").value     = `LISTE DES EFFECTIFS — ${school.name ?? ""} — ${academicYear}`
  ws.getCell("A1").font      = { bold: true, size: 13 }
  ws.getCell("A1").alignment = { horizontal: "center" }
  ws.addRow([])

  const headerRow = ws.addRow(["N°", "Nom & Prénom", "Classe", "Niveau", "Statut", "N° Matricule"])
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } }
    cell.alignment = { horizontal: "center" }
  })

  ws.columns = [
    { width: 5 }, { width: 28 }, { width: 12 }, { width: 14 }, { width: 10 }, { width: 16 },
  ]

  let i = 1
  for (const s of students) {
    ws.addRow([
      i++,
      s.displayName  ?? "",
      s.className    ?? "",
      s.levelName    ?? "",
      s.archiveStatus === "active" ? "Actif" : "Archivé",
      s.studentNumber ?? "",
    ])
  }

  // Résumé par classe
  ws.addRow([])
  ws.addRow(["RÉSUMÉ PAR CLASSE"]).font = { bold: true }
  const byClass = students.reduce<Record<string, number>>((acc, s) => {
    acc[s.className ?? "?"] = (acc[s.className ?? "?"] ?? 0) + 1
    return acc
  }, {})
  for (const [className, count] of Object.entries(byClass)) {
    ws.addRow([className, `${count} élèves`])
  }
  ws.addRow(["TOTAL", `${students.length} élèves`]).font = { bold: true }

  return students.length
}

async function buildStatistiquesAnnuelles(
  wb:          ExcelJS.Workbook,
  schoolId:    string,
  school:      Record<string, any>,
  academicYear: string,
): Promise<number> {
  const ws = wb.addWorksheet("Statistiques annuelles")

  ws.mergeCells("A1:D1")
  ws.getCell("A1").value     = `STATISTIQUES ANNUELLES — ${school.name ?? ""} — ${academicYear}`
  ws.getCell("A1").font      = { bold: true, size: 13 }
  ws.getCell("A1").alignment = { horizontal: "center" }
  ws.addRow([])

  // Stats élèves
  const studSnap  = await db.collection("users").where("schoolId", "==", schoolId).where("role", "==", "student").get()
  const teachSnap = await db.collection("users").where("schoolId", "==", schoolId).where("role", "==", "teacher").get()

  const active   = studSnap.docs.filter(d => d.data().archiveStatus === "active").length
  const archived = studSnap.docs.filter(d => d.data().archiveStatus !== "active").length

  const statsData = [
    ["EFFECTIFS",            ""],
    ["Élèves actifs",        active],
    ["Élèves archivés",      archived],
    ["Total élèves",         studSnap.size],
    ["Enseignants",          teachSnap.size],
    [""],
    ["RÉSULTATS",            ""],
  ]

  // Moyennes par classe depuis les bulletins publiés
  const bullSnap = await db
    .collection("schools").doc(schoolId)
    .collection("bulletins")
    .where("status", "==", "published")
    .get()

  const avgByClass: Record<string, { total: number; count: number }> = {}
  for (const doc of bullSnap.docs) {
    const d = doc.data()
    const avg = typeof d.average === "number" ? d.average : null
    if (avg !== null && d.classId) {
      const entry = avgByClass[d.classId] ?? { total: 0, count: 0 }
      avgByClass[d.classId] = { total: entry.total + avg, count: entry.count + 1 }
    }
  }

  for (const [classId, { total, count }] of Object.entries(avgByClass)) {
    statsData.push([`Moyenne ${classId}`, (total / count).toFixed(2)])
  }

  const headerRow = ws.addRow(["Indicateur", "Valeur"])
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } }
  })

  for (const [label, value] of statsData) {
    const row = ws.addRow([label, value])
    if (!value) row.font = { bold: true, color: { argb: "FF2563EB" } }
  }

  ws.columns = [{ width: 30 }, { width: 16 }]

  return studSnap.size
}

// ── Cloud Function principale ─────────────────────────────────────────────────

export const generateMinistryReport = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "1GiB",
    timeoutSeconds:  180,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:     string;
    reportType:   string;
    academicYear: string;
    classId?:     string;
    force?:       boolean;   // true = ignorer les données manquantes
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required")

    const claims = request.auth.token as CustomClaims
    if (!["direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement")
    }

    const { schoolId, reportType, academicYear, classId, force = false } = request.data

    // 1. Vérification de conformité
    const { eligible, missing } = await checkCompliance(schoolId, reportType, classId)

    if (missing.length > 0 && !force) {
      return {
        success:     false,
        missingData: missing,
        message:     `${missing.length} élève(s) ont des données manquantes. Corrigez ou passez force=true.`,
      }
    }

    // 2. Infos école
    const schoolSnap = await db.collection("schools").doc(schoolId).get()
    const school     = schoolSnap.data() ?? {}

    // 3. Génération du workbook
    const wb      = new ExcelJS.Workbook()
    wb.creator    = "EduSchool"
    wb.created    = new Date()

    let rowCount = 0

    switch (reportType) {
      case "cepe_inscription":
      case "bepc_inscription":
      case "bac_inscription":
        rowCount = await buildExamInscription(wb, school, eligible, reportType, academicYear)
        break
      case "liste_effectifs":
        rowCount = await buildEffectifsList(wb, school, eligible, academicYear)
        break
      case "statistiques_annuelles":
        rowCount = await buildStatistiquesAnnuelles(wb, schoolId, school, academicYear)
        break
      default:
        throw new functions.https.HttpsError("invalid-argument", `Type de rapport inconnu : ${reportType}`)
    }

    // 4. Upload Storage
    const buffer      = await wb.xlsx.writeBuffer() as Buffer
    const filename    = `rapport_${reportType}_${academicYear.replace("-", "_")}_${Date.now()}.xlsx`
    const storagePath = `reports/${schoolId}/${filename}`
    const file        = storage.bucket().file(storagePath)

    await file.save(buffer, {
      metadata: { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    })

    const [signedUrl] = await file.getSignedUrl({
      action:  "read",
      expires: Date.now() + 24 * 60 * 60 * 1000,
    })

    // 5. Enregistrer dans Firestore
    await db.collection("schools").doc(schoolId).collection("ministryReports").add({
      type:         reportType,
      academicYear,
      classId:      classId ?? null,
      requestedBy:  request.auth.uid,
      status:       "ready",
      storageUrl:   storagePath,
      rowCount,
      missingCount: missing.length,
      generatedAt:  Date.now(),
    })

    await writeAuditLog({
      schoolId,
      actorUid:  request.auth.uid,
      actorRole: claims.role,
      action:    "report.ministry_generated",
      metadata:  { reportType, academicYear, rowCount, missingCount: missing.length },
    })

    return {
      success:     true,
      signedUrl,
      rowCount,
      missingCount: missing.length,
      filename,
    }
  }
)

// ── Cloud Function : vérification de conformité seule (aperçu) ───────────────

export const checkReportCompliance = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "256MiB",
    timeoutSeconds:  60,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:   string;
    reportType: string;
    classId?:   string;
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required")
    const claims = request.auth.token as CustomClaims
    if (!["direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Direction uniquement")
    }

    const { schoolId, reportType, classId } = request.data
    const { eligible, missing } = await checkCompliance(schoolId, reportType, classId)

    return {
      eligible:     eligible.length,
      missing:      missing.length,
      missingList:  missing,
      readyToGenerate: missing.length === 0,
    }
  }
)
