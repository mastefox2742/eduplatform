/**
 * Service Gemini — appels directs à l'API REST Google Generative AI
 * Utilise gemini-1.5-flash via fetch() (compatible React Native / Expo)
 *
 * Configurer dans .env.local :
 *   EXPO_PUBLIC_GEMINI_API_KEY=AIza...
 */

const MODEL   = 'gemini-2.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

// ── Types ────────────────────────────────────────────────────────────────────

export interface GeminiContent {
  role:  'user' | 'model'
  parts: { text: string }[]
}

interface GeminiRequest {
  system_instruction?: { parts: { text: string }[] }
  contents:            GeminiContent[]
  generationConfig?:   {
    temperature?:      number
    maxOutputTokens?:  number
    topP?:             number
    thinkingConfig?:   { thinkingBudget: number }
  }
}

interface GeminiResponse {
  candidates?: {
    content: { parts: { text: string }[]; role: string }
    finishReason: string
  }[]
  error?: { message: string; code: number }
}

// ── Fonction principale ───────────────────────────────────────────────────────

export async function askGemini(params: {
  prompt:            string
  history?:          GeminiContent[]   // Historique de la conversation
  systemInstruction?: string           // Personnalité / contexte du bot
  temperature?:      number            // 0.0 → déterministe, 1.0 → créatif
  maxTokens?:        number
}): Promise<string> {
  const {
    prompt,
    history          = [],
    systemInstruction,
    temperature      = 0.7,
    maxTokens        = 1024,
  } = params

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'Clé API Gemini manquante.\n' +
      'Ajoutez EXPO_PUBLIC_GEMINI_API_KEY dans apps/mobile/.env.local\n' +
      'Obtenez votre clé sur : https://aistudio.google.com/app/apikey'
    )
  }

  const body: GeminiRequest = {
    contents: [
      ...history,
      { role: 'user', parts: [{ text: prompt }] },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP:            0.95,
    },
  }

  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] }
  }

  // Clé dans un header dédié (pas dans l'URL) → ne s'affiche pas dans les logs proxy/serveur
  const response = await fetch(API_URL, {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'x-goog-api-key': apiKey,
    },
    body:    JSON.stringify(body),
  })

  const data: GeminiResponse = await response.json()

  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? `Erreur HTTP ${response.status}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Réponse vide de Gemini')

  return text
}

// ── Instruction système pour l'assistant pédagogique ─────────────────────────

export const PEDAGOGY_SYSTEM_INSTRUCTION = `
Tu es EduBot, un assistant pédagogique bienveillant pour des élèves de collège et lycée.
Règles absolues :
- Réponds TOUJOURS en français, clairement et de manière encourageante.
- Adapte ton niveau de langage à un élève de 11-18 ans.
- Utilise des emojis pour rendre tes explications vivantes (mais pas trop).
- Structure tes réponses avec des étapes numérotées quand c'est utile.
- Limite tes réponses à 200 mots maximum sauf si on te demande un développement.
- Ne donne jamais directement la réponse d'un exercice : guide l'élève étape par étape.
- Si tu ne sais pas quelque chose, dis-le honnêtement.
`.trim()

// ── Fonction utilitaire pour générer un QCM ───────────────────────────────────

// Patterns d'injection de prompt à rejeter (défense multicouche)
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /oublie\s+(toutes?\s+)?tes\s+instructions?/gi,
  /system\s*:\s*/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /you\s+are\s+now/gi,
  /act\s+as\s+if/gi,
  /forget\s+everything/gi,
  /new\s+persona/gi,
]

/**
 * Sanitise un texte utilisateur avant injection dans un prompt Gemini.
 * Lève une erreur si une tentative d'injection est détectée.
 */
function sanitizeUserInput(text: string): string {
  if (text.length > 2000) {
    throw new Error('Message trop long (max 2000 caractères)')
  }
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error('Message non autorisé détecté')
    }
  }
  return text.trim()
}

export async function generateQuizFromCourse(courseContent: string, count: number = 3): Promise<any[]> {
  // Délimiteurs XML stricts pour isoler le contenu tiers du prompt système
  // → empêche l'injection via le contenu du cours
  const sanitizedContent = courseContent
    .replace(/<\/?(instruction|content|system)[^>]*>/gi, '') // Supprimer les balises sensibles
    .slice(0, 8000) // Limite de taille

  const prompt = `
Tu es un professeur expert. Lis le cours ci-dessous et génère un QCM de ${count} questions pour tester la compréhension de l'élève.
Tu dois renvoyer UNIQUEMENT un tableau JSON valide (pas de Markdown \`\`\`json, juste le tableau brut).
Chaque question doit avoir ce format exact :
{
  "id": "q1",
  "type": "qcm",
  "text": "La question posée ?",
  "options": ["Choix A", "Choix B", "Choix C", "Choix D"],
  "correctIndex": 0,
  "explanation": "Explication courte pourquoi c'est la bonne réponse.",
  "points": 1
}

<content>
${sanitizedContent}
</content>
`

  try {
    const rawResponse = await askGemini({
      prompt,
      temperature: 0.2, // Faible pour être précis et structuré
      maxTokens: 1024,
    })

    // Nettoyer le markdown si Gemini l'ajoute quand même
    const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch (err) {
    console.error('Erreur génération QCM:', err)
    throw new Error('Impossible de générer le QCM. Vérifiez le format du texte.')
  }
}
