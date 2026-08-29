/**
 * Service Gemini — proxy via Firebase Cloud Function `callAI`
 *
 * ⚠️  La clé API Gemini n'est JAMAIS exposée côté client.
 *      Elle est stockée dans Secret Manager et utilisée uniquement
 *      par la Cloud Function `callAI` (functions/src/ai/proxy.ts).
 *
 * Avantages vs appel direct :
 *  - Clé API invisible dans le bundle APK/IPA
 *  - Rate limiting par rôle (20 req/h élève, 100 prof, 200 direction)
 *  - Logging d'utilisation et quotas par école
 *  - Filtrage des réponses sensibles côté serveur
 */
import { httpsCallable } from 'firebase/functions'
import { functions }     from '@/config/firebase'

// ── Types ────────────────────────────────────────────────────────────────────

export interface GeminiContent {
  role:  'user' | 'model'
  parts: { text: string }[]
}

type AIContext = 'quiz_generation' | 'progress_analysis' | 'content_summary' | 'default'

interface CallAIRequest {
  prompt:    string
  context?:  AIContext
  courseId?: string
  maxTokens?: number
}

interface CallAIResponse {
  success:    boolean
  result:     string
  tokensUsed: number
  model:      string
}

// Callable Firebase Function — hébergée en europe-west1
const callAI = httpsCallable<CallAIRequest, CallAIResponse>(functions, 'callAI')

// ── Fonction principale ───────────────────────────────────────────────────────

/**
 * Envoie un prompt à Gemini via le proxy Cloud Function sécurisé.
 * L'historique de conversation est sérialisé dans le prompt (le proxy ne
 * gère pas nativement le multi-tour, mais le contexte est préservé).
 */
export async function askGemini(params: {
  prompt:             string
  history?:           GeminiContent[]
  context?:           AIContext
  courseId?:          string
  maxTokens?:         number
  /**
   * Cadrage envoye en tete du prompt : role de l'assistant, limites du
   * sujet, interdiction de donner une reponse a recopier pendant une
   * evaluation (§15.7). Sans lui, le chat repond hors contexte scolaire.
   */
  systemInstruction?: string
  temperature?:       number
}): Promise<string> {
  const {
    prompt, history = [], context = 'default', courseId,
    maxTokens = 1024, systemInstruction,
  } = params

  // Sérialiser l'historique dans le prompt si présent (format lisible par le LLM)
  let fullPrompt = prompt
  if (history.length > 0) {
    const historyText = history
      .map(m => `${m.role === 'user' ? 'Élève' : 'Assistant'} : ${m.parts.map(p => p.text).join(' ')}`)
      .join('\n')
    fullPrompt = `${historyText}\nÉlève : ${prompt}`
  }

  if (systemInstruction) {
    fullPrompt = `${systemInstruction}

---

${fullPrompt}`
  }

  const result = await callAI({ prompt: fullPrompt, context, courseId, maxTokens })
  return result.data.result
}

// ── Génération de QCM ─────────────────────────────────────────────────────────

export async function generateQuizFromCourse(courseContent: string, count: number = 3): Promise<any[]> {
  const truncated = courseContent.slice(0, 3000) // Limite côté client aussi

  const prompt = `Génère un QCM de ${count} questions pour tester la compréhension du cours suivant.
Renvoie UNIQUEMENT un tableau JSON valide (pas de Markdown).
Format de chaque question :
{"id":"q1","type":"qcm","text":"?","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","points":1}

Cours :
${truncated}`

  const raw = await askGemini({ prompt, context: 'quiz_generation', maxTokens: 1024 })
  const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned)
}

// ── Instruction système (conservée pour compatibilité mais ignorée côté serveur) ──

/** @deprecated Le système prompt est géré par la Cloud Function selon le contexte */
export const PEDAGOGY_SYSTEM_INSTRUCTION = ''
