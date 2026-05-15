/**
 * Service Gemini — appels directs à l'API REST Google Generative AI
 * Utilise gemini-1.5-flash via fetch() (compatible React Native / Expo)
 *
 * Configurer dans .env.local :
 *   EXPO_PUBLIC_GEMINI_API_KEY=AIza...
 */

const MODEL   = 'gemini-1.5-flash'
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

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
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
