// ============================================================
// CLOUD FUNCTIONS — APPRÉCIATIONS DE BULLETIN AUTOMATISÉES PAR IA
//
// Le prof entre les notes. L'IA propose une appréciation
// calibrée selon : moyenne, matière, conduite, tendance.
// Le prof valide ou modifie en 2 secondes.
//
// Gain de temps estimé : 70 % sur la rédaction des bulletins
// ============================================================

import * as functions from "firebase-functions/v2";
import { CustomClaims } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentData {
  studentName:  string;
  subject:      string;
  average:      number;
  maxScore:     number;
  conduct:      string;
  trimestre:    string;
  previousAvg?: number;   // trimestre précédent (tendance)
}

// ── Générateur d'appréciations ────────────────────────────────────────────────

function getGradeContext(avg: number, max: number): string {
  const pct = (avg / max) * 100;
  if (pct >= 85) return "Excellent";
  if (pct >= 75) return "Très Bien";
  if (pct >= 65) return "Bien";
  if (pct >= 55) return "Assez Bien";
  if (pct >= 50) return "Passable";
  if (pct >= 40) return "Insuffisant";
  return "Très insuffisant";
}

function getTrend(current: number, previous?: number): string {
  if (!previous) return "";
  const delta = current - previous;
  if (delta >= 1.5) return "en nette progression";
  if (delta >= 0.5) return "en légère progression";
  if (delta <= -1.5) return "en baisse préoccupante";
  if (delta <= -0.5) return "en légère baisse";
  return "stable";
}

// Appréciations hors-ligne si l'IA n'est pas configurée
function generateLocalAppreciation(data: StudentData): string {
  const ctx   = getGradeContext(data.average, data.maxScore);
  const trend = getTrend(data.average, data.previousAvg);
  const pct   = (data.average / data.maxScore) * 100;

  const TEMPLATES: Record<string, string[]> = {
    "Excellent":       [
      `Excellent trimestre en ${data.subject}. Des résultats remarquables qui témoignent d'un travail sérieux et d'une réelle maîtrise des notions. Félicitations.`,
      `Très bon niveau en ${data.subject}. Élève rigoureux(euse) et appliqué(e). Continue dans cette voie.`,
    ],
    "Très Bien":       [
      `Très bons résultats en ${data.subject}. Élève sérieux(euse) qui maîtrise bien les notions fondamentales.`,
    ],
    "Bien":            [
      `Bons résultats en ${data.subject}. Peut encore progresser par un travail plus régulier à la maison.`,
    ],
    "Assez Bien":      [
      `Résultats acceptables en ${data.subject}. Des efforts supplémentaires permettraient d'améliorer cette moyenne.`,
    ],
    "Passable":        [
      `Résultats insuffisants en ${data.subject}. Des lacunes sont à combler. Doit renforcer les exercices de base.`,
    ],
    "Insuffisant":     [
      `Résultats très insuffisants en ${data.subject}. Il est indispensable de revoir les notions fondamentales et de solliciter de l'aide.`,
    ],
    "Très insuffisant":[
      `Niveau très faible en ${data.subject}. Un travail intensif et un soutien spécifique sont nécessaires d'urgence.`,
    ],
  };

  let appreciation = TEMPLATES[ctx]?.[0] ?? `Résultats ${ctx.toLowerCase()} en ${data.subject}.`;
  if (trend) appreciation += ` Élève ${trend} par rapport au trimestre précédent.`;

  // Ajout conduite
  if (data.conduct && data.conduct !== "Bien") {
    appreciation += ` La conduite doit être améliorée.`;
  }

  return appreciation;
}

// ── Cloud Function ────────────────────────────────────────────────────────────

export const generateBulletinAppreciation = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "256MiB",
    timeoutSeconds:  30,
    secrets:         ["GEMINI_API_KEY"],
  },
  async (request: functions.https.CallableRequest<{
    students: StudentData[];
    schoolId: string;
    useAI?:   boolean;    // false = appréciations locales (sans quota IA)
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");

    const claims = request.auth.token as CustomClaims;
    if (!["teacher", "direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Professeurs uniquement");
    }

    const { students, useAI = true } = request.data;
    const apiKey = process.env.GEMINI_API_KEY;

    // Mode local : pas d'appel IA (offline / quota épuisé)
    if (!useAI || !apiKey) {
      return {
        success: true,
        mode:    "local",
        appreciations: students.map(s => ({
          studentName:  s.studentName,
          appreciation: generateLocalAppreciation(s),
        })),
      };
    }

    // Mode IA : batch de toutes les appréciations en 1 seul appel Gemini
    const prompt = `Tu es un professeur expérimenté qui rédige les appréciations de bulletin de fin de trimestre.
Style : bienveillant mais honnête, précis, maximum 3 phrases par élève, en français.
Réponds UNIQUEMENT avec un tableau JSON valide (sans markdown).

Pour chaque élève, génère une appréciation. Format :
[{"studentName": "...", "appreciation": "..."}]

Données des élèves :
${students.map(s => `- ${s.studentName} : ${s.average}/${s.maxScore} en ${s.subject} (${getGradeContext(s.average, s.maxScore)})${s.previousAvg ? `, précédemment ${s.previousAvg}/${s.maxScore}` : ""}. Conduite : ${s.conduct || "Bien"}`).join("\n")}`;

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
          }),
        }
      );

      const data: any = await response.json();
      const raw       = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      const cleaned   = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed    = JSON.parse(cleaned);

      return { success: true, mode: "ai", appreciations: parsed };
    } catch (e) {
      // Fallback local si l'IA échoue
      functions.logger.warn("AI appreciation failed, using local", { error: (e as Error).message });
      return {
        success: true,
        mode:    "local_fallback",
        appreciations: students.map(s => ({
          studentName:  s.studentName,
          appreciation: generateLocalAppreciation(s),
        })),
      };
    }
  }
);

// ── Cloud Function : Génération liste d'émargement PDF ───────────────────────

export const generateEmargementList = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "512MiB",
    timeoutSeconds:  60,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:    string;
    classId:     string;
    className:   string;
    purpose:     string;   // "Examen BEPC" | "Composition T2" | "Appel"
    academicYear?: string;
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");

    const claims = request.auth.token as CustomClaims;
    if (!["direction", "teacher", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Non autorisé");
    }

    const { schoolId, classId, className, purpose, academicYear } = request.data;
    const db      = (await import("firebase-admin")).default.firestore();
    const storage = (await import("firebase-admin")).default.storage();

    // Charger les élèves de la classe
    const studentsSnap = await db.collection("users")
      .where("schoolId",      "==", schoolId)
      .where("role",          "==", "student")
      .where("classId",       "==", classId)
      .where("archiveStatus", "==", "active")
      .orderBy("displayName")
      .get();

    const students = studentsSnap.docs.map(d => d.data());

    // Générer le PDF via PDFKit
    const PDFDocument = (await import("pdfkit")).default;
    const doc         = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));

    const schoolSnap = await db.collection("schools").doc(schoolId).get();
    const school     = schoolSnap.data() ?? {};

    await new Promise<void>((resolve, reject) => {
      doc.on("end",   resolve);
      doc.on("error", reject);

      // En-tête
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#1E3A5F")
        .text(school.name ?? "École", { align: "center" })
        .fontSize(9).font("Helvetica").fillColor("#6B7280")
        .text(school.address ? `${school.address.street}, ${school.address.city}` : "", { align: "center" })
        .moveDown(0.4);

      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#E5E7EB").stroke().moveDown(0.4);

      doc.fontSize(14).font("Helvetica-Bold").fillColor("#1E3A5F")
        .text(`LISTE D'ÉMARGEMENT — ${purpose.toUpperCase()}`, { align: "center" })
        .fontSize(10).font("Helvetica")
        .text(`Classe : ${className}   |   Année scolaire : ${academicYear ?? "2025-2026"}   |   Effectif : ${students.length}`, { align: "center" })
        .text(`Date : ___________________   Heure : ___________________`, { align: "center" })
        .moveDown(0.5);

      // En-tête du tableau
      const COL = { n: 30, name: 220, matric: 100, sign: 100, absent: 70, obs: 75 };
      const startX = 40;
      const rowH   = 22;
      let y        = doc.y;

      // Ligne d'en-tête
      doc.rect(startX, y, 515, rowH).fillAndStroke("#1E3A5F", "#1E3A5F");
      const headerY = y + 6;
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#FFFFFF");
      doc.text("N°",              startX + 2,                      headerY, { width: COL.n,      lineBreak: false });
      doc.text("NOM & PRÉNOM",    startX + COL.n + 2,              headerY, { width: COL.name,   lineBreak: false });
      doc.text("MATRICULE",       startX + COL.n + COL.name + 2,  headerY, { width: COL.matric, lineBreak: false });
      doc.text("ÉMARGEMENT",      startX + COL.n + COL.name + COL.matric + 2, headerY, { width: COL.sign, lineBreak: false });
      doc.text("ABS",             startX + COL.n + COL.name + COL.matric + COL.sign + 2, headerY, { width: COL.absent, lineBreak: false });
      doc.text("OBSERVATIONS",    startX + COL.n + COL.name + COL.matric + COL.sign + COL.absent + 2, headerY, { width: COL.obs, lineBreak: false });
      y += rowH;

      students.forEach((s, i) => {
        if (y > 760) {
          doc.addPage();
          y = 40;
        }

        const bg = i % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
        doc.rect(startX, y, 515, rowH).fillAndStroke(bg, "#E5E7EB");

        doc.fontSize(8).font("Helvetica").fillColor("#111827");
        const lineY = y + 7;
        doc.text(String(i + 1),             startX + 2,                       lineY, { width: COL.n,      lineBreak: false });
        doc.text(s.displayName ?? "",        startX + COL.n + 2,              lineY, { width: COL.name,   lineBreak: false });
        doc.text(s.studentNumber ?? "",      startX + COL.n + COL.name + 2,  lineY, { width: COL.matric, lineBreak: false });
        // Colonnes vides (à remplir manuellement)
        y += rowH;
      });

      // Pied de page
      doc.moveDown(1);
      doc.fontSize(8).fillColor("#6B7280")
        .text(`Visa du responsable de salle : ___________________________`, 40)
        .moveDown(0.5)
        .text(`Document généré le ${new Date().toLocaleDateString("fr-FR")} par EduSchool`, { align: "center" });

      doc.end();
    });

    const buffer      = Buffer.concat(chunks);
    const filename    = `emargement_${className.replace(/\s/g, "_")}_${Date.now()}.pdf`;
    const storagePath = `exports/${schoolId}/emargements/${filename}`;

    await storage.bucket().file(storagePath).save(buffer, {
      metadata: { contentType: "application/pdf" },
    });

    const [signedUrl] = await storage.bucket().file(storagePath).getSignedUrl({
      action: "read", expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    return { success: true, signedUrl, studentCount: students.length, filename };
  }
);
