/**
 * Supabase Edge Function : ai-proxy
 * Remplace Firebase Cloud Function : callAI
 *
 * Runtime : Deno (pas Node.js)
 * Secrets : GEMINI_API_KEY (via supabase secrets set)
 *
 * Deploy : supabase functions deploy ai-proxy
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Quotas par rôle (requêtes / heure)
const QUOTAS: Record<string, number> = {
  direction: 200,
  teacher:   100,
  student:   20,
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Charger le profil pour obtenir role + school_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const role     = profile?.role     ?? 'student'
    const schoolId = profile?.school_id

    // 3. Rate limiting simple (Supabase DB)
    const hourKey = `${user.id}:${new Date().getUTCHours()}`
    const { data: rateData } = await supabase
      .from('ai_rate_limits')
      .select('count')
      .eq('key', hourKey)
      .single()

    const currentCount = rateData?.count ?? 0
    const maxRequests  = QUOTAS[role] ?? 20

    if (currentCount >= maxRequests) {
      return new Response(JSON.stringify({ error: `Rate limit: ${maxRequests} req/h pour rôle ${role}` }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Parser la requête
    const { prompt, context = 'default', maxTokens = 1000 } = await req.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Sanitisation du prompt
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s*:\s*/i,
      /\[INST\]/i, /<<SYS>>/i,
      /you\s+are\s+now/i,
      /forget\s+everything/i,
    ]
    let sanitized = prompt.trim()
    for (const p of injectionPatterns) sanitized = sanitized.replace(p, '[FILTERED]')

    if (sanitized.length > 2000) {
      return new Response(JSON.stringify({ error: 'Prompt trop long (max 2000 chars)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. Appel Gemini
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY non configurée')

    const SYSTEM_PROMPTS: Record<string, string> = {
      default:          'Tu es un assistant pédagogique pour une école africaine. Réponds en français, de façon claire et bienveillante.',
      quiz_generation:  'Tu es un professeur expert. Génère des questions de quiz claires et adaptées. Réponds UNIQUEMENT en JSON valide.',
      progress_analysis:'Tu analyses la progression d\'un élève. Fournis des recommandations constructives et encourageantes.',
      content_summary:  'Tu résumes des contenus pédagogiques. Utilise un langage adapté aux élèves africains de collège/lycée.',
    }

    const geminiResp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPTS[context] ?? SYSTEM_PROMPTS.default }] },
          contents:           [{ role: 'user', parts: [{ text: sanitized }] }],
          generationConfig:   { maxOutputTokens: Math.min(maxTokens, 2000), temperature: 0.7 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',       threshold: 'BLOCK_LOW_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',      threshold: 'BLOCK_LOW_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',threshold: 'BLOCK_LOW_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT',threshold: 'BLOCK_LOW_AND_ABOVE' },
          ],
        }),
      }
    )

    const geminiData = await geminiResp.json()

    if (geminiData.promptFeedback?.blockReason) {
      return new Response(JSON.stringify({ error: 'Prompt bloqué par les filtres de sécurité' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const tokensUsed = geminiData.usageMetadata?.totalTokenCount ?? 0

    // 7. Incrémenter le compteur de rate limiting
    await supabase.rpc('increment_ai_rate_limit', { p_key: hourKey })

    // 8. Log d'utilisation (sans le contenu)
    await supabase.from('audit_logs').insert({
      school_id:  schoolId,
      actor_uid:  user.id,
      actor_role: role,
      action:     'ai.query',
      metadata:   { context, tokens_used: tokensUsed, prompt_chars: prompt.length },
    })

    return new Response(
      JSON.stringify({ success: true, result: resultText, tokensUsed, model: 'gemini-2.0-flash' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('ai-proxy error:', err)
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur IA' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
