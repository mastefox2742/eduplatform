// ============================================================
// CLOUD FUNCTIONS — GÉNÉRATEUR DE FICHE PÉDAGOGIQUE IA
//
// Le prof donne : matière + classe + chapitre + durée
// L'IA génère   : objectifs, prérequis, étapes du cours,
//                 évaluation, différenciation pédagogique
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CustomClaims } from "../types";
import { writeAuditLog } from "../utils/audit";

const db = admin.firestore();

export const generateFicheCours = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "512MiB",
    timeoutSeconds:  90,
    secrets:         ["GEMINI_API_KEY"],
  },
  async (request: functions.https.CallableRequest<{
    schoolId:    string;
    subjectName: string;
    className:   string;
    chapitre:    string;
    duree:       number;   // minutes
    niveau:      string;   // "6ème" | "Terminale" etc.
    contexte?:   string;   // infos supplémentaires du prof
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");

    const claims = request.auth.token as CustomClaims;
    if (!["teacher", "direction", "admin"].includes(claims.role)) {
      throw new functions.https.HttpsError("permission-denied", "Professeurs uniquement");
    }

    const { schoolId, subjectName, className, chapitre, duree, niveau, contexte } = request.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new functions.https.HttpsError("internal", "IA non configurée");

    const systemPrompt = `Tu es un expert en ingénierie pédagogique pour les systèmes éducatifs africains (Afrique de l'Ouest et Centrale).
Tu maîtrises les programmes officiels de l'UEMOA et de la CEMAC.
Tu rédiges des fiches pédagogiques claires, structurées et immédiatement exploitables par un professeur en classe.
Tu réponds UNIQUEMENT en JSON valide, sans balises Markdown.`;

    const userPrompt = `Génère une fiche pédagogique complète pour :
- Matière : ${subjectName}
- Classe : ${className} (${niveau})
- Chapitre / Leçon : ${chapitre}
- Durée de la séance : ${duree} minutes
${contexte ? `- Contexte supplémentaire : ${contexte}` : ""}

Retourne EXACTEMENT ce JSON (pas de markdown) :
{
  "objectifs": ["objectif 1", "objectif 2", "objectif 3"],
  "prerequis": ["prérequis 1", "prérequis 2"],
  "materiel": ["matériel 1", "matériel 2"],
  "introduction": "Phrase d'accroche et mise en situation (2-3 phrases)",
  "developpement": [
    "Étape 1 : ...",
    "Étape 2 : ...",
    "Étape 3 : ..."
  ],
  "conclusion": "Synthèse et ouverture vers la prochaine séance",
  "evaluation": "Comment évaluer les acquis de cette séance",
  "differenciation": "Comment adapter pour les élèves en difficulté et les élèves avancés"
}`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          system_instruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      throw new functions.https.HttpsError("internal", `Gemini error ${response.status}`);
    }

    const data: any = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new functions.https.HttpsError("internal", "Réponse IA invalide, réessayez");
    }

    // Sauvegarder la fiche
    const ficheRef = await db
      .collection("schools").doc(schoolId)
      .collection("fichesPedagogiques").add({
        schoolId,
        teacherId:   request.auth.uid,
        subjectName,
        className,
        chapitre,
        niveau,
        duree,
        ...parsed,
        generatedAt: Date.now(),
        model:       "gemini-2.0-flash",
      });

    await writeAuditLog({
      schoolId,
      actorUid:  request.auth.uid,
      actorRole: claims.role,
      action:    "pedagogy.fiche_generated",
      metadata:  { subjectName, className, chapitre },
    });

    return { success: true, ficheId: ficheRef.id, fiche: parsed };
  }
);

// ── Gamification : vérifier et attribuer les badges ──────────────────────────

export const checkAndAwardBadges = functions.https.onCall(
  {
    region:          "europe-west1",
    enforceAppCheck: true,
    memory:          "256MiB",
    timeoutSeconds:  30,
  },
  async (request: functions.https.CallableRequest<{
    schoolId:  string;
    studentId: string;
    event:     string;   // 'exercise_completed' | 'daily_login' | 'homework_done'
    metadata?: Record<string, any>;
  }>) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Auth required");

    const { schoolId, studentId, event, metadata } = request.data;

    const xpRef  = db.collection("schools").doc(schoolId).collection("studentXP").doc(studentId);
    const xpSnap = await xpRef.get();
    const xp     = xpSnap.data() ?? { totalXP: 0, badges: [], streak: 0 };

    const newBadges: string[] = [];
    let xpGain = 0;

    switch (event) {
      case "exercise_completed":
        xpGain = metadata?.perfect ? 20 : 10;
        if (metadata?.consecutivePerfect >= 3 && !xp.badges?.includes("maths_champion")) {
          newBadges.push("maths_champion");
          xpGain += 50;
        }
        break;

      case "daily_login":
        xpGain = 5;
        const streak = (xp.streak ?? 0) + 1;
        if (streak >= 7 && !xp.badges?.includes("consistent")) {
          newBadges.push("consistent");
          xpGain += 30;
        }
        await xpRef.set({ streak }, { merge: true });
        break;

      case "homework_done":
        xpGain = 10;
        break;

      case "course_read":
        xpGain = 5;
        break;
    }

    // Mise à jour XP
    await xpRef.set(
      {
        studentId,
        schoolId,
        totalXP:   admin.firestore.FieldValue.increment(xpGain),
        badges:    admin.firestore.FieldValue.arrayUnion(...(newBadges.length > 0 ? newBadges : ["_placeholder"])),
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    // Enregistrer les nouveaux badges
    const BADGE_DEFS: Record<string, { label: string; description: string; icon: string }> = {
      maths_champion: { label: "Champion des Maths",  description: "3 exercices parfaits d'affilée", icon: "🏆" },
      consistent:     { label: "Régularité",          description: "7 jours de connexion consécutifs", icon: "🔥" },
      speed_learner:  { label: "Apprenant rapide",    description: "Exercice complété en moins de 5 min", icon: "⚡" },
      team_player:    { label: "Élève sérieux",       description: "10 devoirs rendus à l'heure", icon: "⭐" },
    };

    for (const badgeId of newBadges) {
      const def = BADGE_DEFS[badgeId];
      if (!def) continue;
      await db.collection("schools").doc(schoolId).collection("studentBadges").add({
        studentId, schoolId, badgeId,
        label:       def.label,
        description: def.description,
        icon:        def.icon,
        awardedAt:   Date.now(),
        seen:        false,
      });
    }

    return { success: true, xpGain, newBadges };
  }
);
