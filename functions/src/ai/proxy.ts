// ============================================================
// CLOUD FUNCTIONS - PROXY IA SÉCURISÉ
// Proxy vers Gemini/GPT-4 avec validation, rate limiting, filtrage
// Les clés API ne sont JAMAIS exposées côté client
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { AIProxyRequest, AIProxyResponse, CustomClaims } from "../types";
import { writeAuditLog, checkRateLimit } from "../utils/audit";

const db = admin.firestore();

// Quotas par rôle et par fenêtre temporelle
const QUOTAS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  direction: { maxRequests: 200, windowSeconds: 3600 },  // 200/heure
  professeur: { maxRequests: 100, windowSeconds: 3600 }, // 100/heure
  eleve: { maxRequests: 20, windowSeconds: 3600 },       // 20/heure (anti-abus)
};

// Longueur maximale des prompts par contexte
const MAX_PROMPT_LENGTH: Record<string, number> = {
  quiz_generation: 2000,
  progress_analysis: 1000,
  content_summary: 3000,
  default: 500,
};

// ---------------------------------------------------------------
// CALLABLE FUNCTION : callAI
// Proxy sécurisé vers l'API IA (Gemini Pro)
// - Validation et sanitisation du prompt
// - Rate limiting par utilisateur et par rôle
// - Logging des tokens utilisés (sans le contenu du prompt)
// - Filtrage des réponses inappropriées
// ---------------------------------------------------------------
export const callAI = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
    memory: "512MiB",
    timeoutSeconds: 60,
    secrets: ["GEMINI_API_KEY"],   // Secret Manager - jamais en variables d'env ordinaires
  },
  async (
    request: functions.https.CallableRequest<AIProxyRequest>
  ): Promise<AIProxyResponse> => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const callerUid = request.auth.uid;
    const claims = request.auth.token as CustomClaims;
    const { prompt, context = "default", courseId, maxTokens = 1000 } =
      request.data;

    // 1. Vérification que l'utilisateur est actif
    const userDoc = await db.collection("users").doc(callerUid).get();
    if (!userDoc.exists || !userDoc.data()?.isActive) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Account is inactive"
      );
    }

    // 2. Rate limiting par utilisateur
    const userRateKey = `ai:user:${callerUid}`;
    const quota = QUOTAS[claims.role] ?? QUOTAS.eleve;
    const rateCheck = await checkRateLimit(
      userRateKey,
      quota.maxRequests,
      quota.windowSeconds
    );

    if (!rateCheck.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `AI rate limit exceeded. Limit: ${quota.maxRequests} requests per hour.`
      );
    }

    // 3. Validation du prompt
    const maxLength = MAX_PROMPT_LENGTH[context] ?? MAX_PROMPT_LENGTH.default;
    if (!prompt || prompt.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Prompt is required"
      );
    }

    if (prompt.length > maxLength) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Prompt too long. Maximum ${maxLength} characters for context: ${context}`
      );
    }

    // 4. Sanitisation du prompt - retirer les tentatives d'injection
    const sanitizedPrompt = sanitizePrompt(prompt);

    // 5. Construire le prompt système selon le contexte
    const systemPrompt = buildSystemPrompt(context, claims.role);

    // 6. Vérifier les autorisations par contexte
    await verifyAIContextAccess(claims, context, courseId);

    // 7. Appel à l'API Gemini (via Secret Manager)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError(
        "internal",
        "AI service not configured"
      );
    }

    let aiResult: string;
    let tokensUsed: number;
    const model = "gemini-1.5-flash"; // Modèle rapide pour les requêtes courantes

    try {
      const response = await callGeminiAPI(
        apiKey,
        systemPrompt,
        sanitizedPrompt,
        Math.min(maxTokens, getMaxTokensForRole(claims.role))
      );

      aiResult = response.text;
      tokensUsed = response.tokensUsed;
    } catch (error) {
      functions.logger.error("AI API call failed", {
        context,
        callerUid,
        error: error instanceof Error ? error.message : "Unknown error",
        // NE PAS loguer le prompt (peut contenir des données élèves)
      });

      throw new functions.https.HttpsError("internal", "AI service error");
    }

    // 8. Filtrage post-traitement de la réponse
    const filteredResult = filterAIResponse(aiResult);

    // 9. Log d'utilisation (sans le contenu)
    await writeAuditLog({
      schoolId: claims.schoolId,
      actorUid: callerUid,
      actorRole: claims.role,
      action: "ai.query",
      metadata: {
        context,
        model,
        tokensUsed,
        promptLengthChars: prompt.length,
        courseId: courseId ?? null,
        // NE PAS loguer le prompt ni la réponse
      },
    });

    // 10. Comptabiliser les tokens dans les quotas de l'établissement
    await incrementSchoolTokenUsage(claims.schoolId, tokensUsed);

    return {
      success: true,
      result: filteredResult,
      tokensUsed,
      model,
    };
  }
);

// ---------------------------------------------------------------
// SCHEDULED FUNCTION : resetDailyAIQuotas
// Réinitialise les quotas quotidiens à minuit
// ---------------------------------------------------------------
export const resetDailyAIQuotas = functions.scheduler.onSchedule(
  {
    schedule: "0 0 * * *",
    region: "europe-west1",
    timeZone: "Europe/Paris",
  },
  async () => {
    // Les compteurs sont gérés par le système de rate limiting
    // Nettoyer les anciens enregistrements
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const oldLimitsSnapshot = await db
      .collection("_rateLimits")
      .where("updatedAt", "<=", admin.firestore.Timestamp.fromDate(oneDayAgo))
      .limit(200)
      .get();

    if (!oldLimitsSnapshot.empty) {
      const batch = db.batch();
      oldLimitsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    functions.logger.info("Daily AI quotas reset completed");
  }
);

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function sanitizePrompt(prompt: string): string {
  // Retirer les tentatives de prompt injection courantes
  const injectionPatterns = [
    /ignore\s+previous\s+instructions/gi,
    /system\s*:\s*/gi,
    /\[INST\]/gi,
    /<<SYS>>/gi,
    /<\|system\|>/gi,
    /you\s+are\s+now/gi,
    /forget\s+everything/gi,
    /act\s+as\s+if/gi,
  ];

  let sanitized = prompt.trim();
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "[FILTERED]");
  }

  // Limiter les caractères spéciaux excessifs
  sanitized = sanitized.replace(/[^\x20-\x7EÀ-ɏ-ÿ\n]/g, "");

  return sanitized;
}

function buildSystemPrompt(context: string, role: string): string {
  const basePrompt = `Tu es un assistant pédagogique pour une plateforme éducative française.
Tu travailles avec des données d'élèves mineurs. Tu dois :
- Rester strictement dans le contexte éducatif
- Ne jamais révéler d'informations personnelles
- Répondre uniquement en français
- Être encourageant et bienveillant envers les élèves
- Ne jamais générer de contenu inapproprié ou hors sujet`;

  const contextPrompts: Record<string, string> = {
    quiz_generation: `${basePrompt}
Context : Génération de questions de quiz pédagogiques.
- Génère des questions claires, adaptées au niveau scolaire
- Inclus 4 choix de réponses (A, B, C, D) avec une seule bonne réponse
- Format JSON : {question, choices: [A,B,C,D], correctAnswer, explanation}`,

    progress_analysis: `${basePrompt}
Context : Analyse de progression d'un élève.
- Fournis des recommandations constructives et encourageantes
- Identifie les points forts et axes d'amélioration
- Propose des exercices adaptés au niveau`,

    content_summary: `${basePrompt}
Context : Résumé de contenu de cours.
- Synthétise les points clés du cours
- Utilise un langage adapté au niveau scolaire
- Structure la réponse avec des titres clairs`,
  };

  return contextPrompts[context] ?? basePrompt;
}

async function verifyAIContextAccess(
  claims: CustomClaims,
  context: string,
  courseId?: string
): Promise<void> {
  // La génération de quiz est réservée aux professeurs et direction
  if (context === "quiz_generation" && claims.role === "eleve") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Students cannot generate quizzes"
    );
  }

  // L'analyse de progression nécessite un courseId valide
  if (context === "progress_analysis" && courseId) {
    const courseDoc = await db.collection("courses").doc(courseId).get();
    if (!courseDoc.exists || courseDoc.data()?.schoolId !== claims.schoolId) {
      throw new functions.https.HttpsError(
        "not-found",
        "Course not found or not accessible"
      );
    }
  }
}

function getMaxTokensForRole(role: string): number {
  const limits: Record<string, number> = {
    direction: 4000,
    professeur: 2000,
    eleve: 1000,
  };
  return limits[role] ?? 500;
}

function filterAIResponse(response: string): string {
  // Vérifier que la réponse ne contient pas de données sensibles
  // (exemple: si l'IA a été induite à révéler des infos)
  const sensitivePatterns = [
    /\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, // Dates de naissance
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Emails
    /\b\d{2}[- ]\d{2}[- ]\d{2}[- ]\d{2}[- ]\d{2}\b/g, // Numéros de téléphone
  ];

  let filtered = response;
  for (const pattern of sensitivePatterns) {
    filtered = filtered.replace(pattern, "[DONNÉES CACHÉES]");
  }

  return filtered;
}

async function callGeminiAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<{ text: string; tokensUsed: number }> {
  const GEMINI_ENDPOINT =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_LOW_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_LOW_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_LOW_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_LOW_AND_ABOVE",
      },
    ],
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content: { parts: Array<{ text: string }> };
      finishReason: string;
    }>;
    usageMetadata?: { totalTokenCount: number };
    promptFeedback?: { blockReason?: string };
  };

  if (data.promptFeedback?.blockReason) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Prompt blocked by safety filters"
    );
  }

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("No candidates in Gemini response");
  }

  const candidate = data.candidates[0];
  if (candidate.finishReason === "SAFETY") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Response blocked by safety filters"
    );
  }

  return {
    text: candidate.content.parts.map((p) => p.text).join(""),
    tokensUsed: data.usageMetadata?.totalTokenCount ?? 0,
  };
}

async function incrementSchoolTokenUsage(
  schoolId: string,
  tokensUsed: number
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const usageRef = db
    .collection("_aiUsage")
    .doc(schoolId)
    .collection("daily")
    .doc(today);

  await usageRef.set(
    {
      tokensUsed: admin.firestore.FieldValue.increment(tokensUsed),
      requestCount: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.Timestamp.now(),
    },
    { merge: true }
  );
}
