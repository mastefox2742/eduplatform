/**
 * Supabase Edge Function : payment-webhook
 *
 * Reçoit les notifications de CinetPay / Bizao et les transforme en
 * encaissements vérifiés.
 *
 * Cahier des charges §14.2, §22, §26 :
 *   « Aucune intégration de paiement ne peut être simulée en
 *     production : le statut final doit provenir d'une confirmation
 *     serveur/webhook vérifiée, idempotente et auditable. »
 *
 * Ce que cette fonction remplace : `PaymentAggregatorMock` dans
 * functions/src/payments/mobileMoney.ts, qui répondait « succès »
 * après un setTimeout de 1,5 s — sans jamais parler à l'opérateur.
 *
 * Quatre garanties :
 *   1. Signature vérifiée avant toute écriture métier.
 *   2. Statut re-confirmé auprès du fournisseur (le webhook seul ne
 *      suffit pas : une requête forgée porterait une fausse signature
 *      valide si la clé fuitait).
 *   3. Idempotence : rejouer la même notification n'encaisse qu'une fois.
 *   4. Journal brut conservé, même en cas d'échec.
 *
 * Runtime : Deno.
 * Secrets  : CINETPAY_API_KEY, CINETPAY_SITE_ID, CINETPAY_SECRET_KEY
 * Deploy   : supabase functions deploy payment-webhook --no-verify-jwt
 *
 * `--no-verify-jwt` est nécessaire : l'appelant est l'opérateur de
 * paiement, pas un utilisateur connecté. L'authentification se fait
 * par signature HMAC, pas par JWT.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Constantes ────────────────────────────────────────────────────────────────

const CINETPAY_CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check'

/** Correspondance entre les statuts fournisseur et les nôtres. */
const STATUS_MAP: Record<string, 'success' | 'failed' | 'pending'> = {
  ACCEPTED:           'success',
  COMPLETED:          'success',
  SUCCESS:            'success',
  REFUSED:            'failed',
  CANCELED:           'failed',
  EXPIRED:            'failed',
  PAYMENT_FAILED:     'failed',
  INSUFFICIENT_FUNDS: 'failed',
  WAITING_FOR_CUSTOMER: 'pending',
  PENDING:            'pending',
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

/**
 * Compare deux chaînes en temps constant.
 * Une comparaison `===` s'arrête au premier octet différent : le temps
 * de réponse renseigne alors sur le nombre d'octets corrects, ce qui
 * permet de reconstruire une signature octet par octet.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Reconstitue la chaîne signée par CinetPay à partir du corps de la
 * notification, dans l'ordre imposé par leur documentation. L'ordre
 * compte : une concaténation différente produit un HMAC différent.
 */
function buildSignaturePayload(b: Record<string, unknown>): string {
  const fields = [
    'cpm_site_id', 'cpm_trans_id', 'cpm_trans_date', 'cpm_amount',
    'cpm_currency', 'signature', 'payment_method', 'cel_phone_num',
    'cpm_phone_prefixe', 'cpm_language', 'cpm_version', 'cpm_payment_config',
    'cpm_page_action', 'cpm_custom', 'cpm_designation', 'cpm_error_message',
  ]
  return fields.map((f) => (b[f] ?? '')).join('')
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Fonction principale ───────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée' }, 405)
  }

  // Le service_role est indispensable : les policies RLS interdisent
  // volontairement toute écriture cliente sur `payments` (§12).
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  let raw: Record<string, unknown> = {}
  let webhookId: number | null = null

  try {
    // ── 1. Lire et journaliser AVANT de juger ────────────────────────────────
    // Une notification rejetée doit rester consultable : c'est souvent
    // la seule trace d'une tentative de fraude ou d'un bug fournisseur.
    const bodyText = await req.text()
    try {
      raw = JSON.parse(bodyText)
    } catch {
      // CinetPay poste parfois en form-urlencoded.
      raw = Object.fromEntries(new URLSearchParams(bodyText))
    }

    const provider    = (raw.provider as string) ?? 'cinetpay'
    const providerRef = (raw.cpm_trans_id as string) ?? (raw.transaction_id as string) ?? null
    const signature   = req.headers.get('x-token') ?? (raw.signature as string) ?? null

    const { data: logRow } = await supabase
      .from('payment_webhooks')
      .insert({
        provider,
        provider_ref: providerRef,
        signature,
        payload: raw,
      })
      .select('id')
      .single()

    webhookId = logRow?.id ?? null

    // ── 2. Vérifier la signature ─────────────────────────────────────────────
    const secret = Deno.env.get('CINETPAY_SECRET_KEY')
    if (!secret) {
      // Refuser plutôt que d'accepter sans vérification : une clé
      // manquante ne doit jamais valoir blanc-seing.
      await supabase.from('payment_webhooks')
        .update({ error_msg: 'CINETPAY_SECRET_KEY absente' })
        .eq('id', webhookId)
      return json({ error: 'Configuration serveur incomplète' }, 500)
    }

    if (!signature) {
      await supabase.from('payment_webhooks')
        .update({ error_msg: 'Signature absente' }).eq('id', webhookId)
      return json({ error: 'Signature absente' }, 401)
    }

    const expected = await hmacSha256Hex(secret, buildSignaturePayload(raw))
    if (!safeEqual(signature.toLowerCase(), expected.toLowerCase())) {
      await supabase.from('payment_webhooks')
        .update({ error_msg: 'Signature invalide', signature_ok: false })
        .eq('id', webhookId)

      // On répond 200 : renvoyer une erreur inviterait l'émetteur à
      // réessayer indéfiniment. La notification est rejetée, pas perdue.
      return json({ received: true, accepted: false }, 200)
    }

    await supabase.from('payment_webhooks')
      .update({ signature_ok: true }).eq('id', webhookId)

    if (!providerRef) {
      await supabase.from('payment_webhooks')
        .update({ error_msg: 'Référence de transaction absente' }).eq('id', webhookId)
      return json({ received: true, accepted: false }, 200)
    }

    // ── 3. Idempotence ───────────────────────────────────────────────────────
    // Les opérateurs rejouent leurs notifications jusqu'à obtenir un 200.
    // Sans ce contrôle, un même paiement serait encaissé plusieurs fois.
    const { data: existing } = await supabase
      .from('payments')
      .select('id, status, invoice_id, amount')
      .eq('provider', provider)
      .eq('provider_ref', providerRef)
      .maybeSingle()

    if (existing && existing.status === 'success') {
      await supabase.from('payment_webhooks')
        .update({ processed: true, processed_at: new Date().toISOString(), payment_id: existing.id })
        .eq('id', webhookId)
      return json({ received: true, alreadyProcessed: true }, 200)
    }

    // ── 4. Re-confirmer auprès du fournisseur ────────────────────────────────
    // La signature prouve l'origine, pas le résultat. On redemande le
    // statut à la source avant de créditer quoi que ce soit.
    const apiKey = Deno.env.get('CINETPAY_API_KEY')
    const siteId = Deno.env.get('CINETPAY_SITE_ID')

    let confirmedStatus: 'success' | 'failed' | 'pending' = 'pending'
    let failureReason: string | null = null

    if (apiKey && siteId) {
      const checkResp = await fetch(CINETPAY_CHECK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: apiKey,
          site_id: siteId,
          transaction_id: providerRef,
        }),
      })

      const check = await checkResp.json()
      const opStatus = check?.data?.status ?? check?.code ?? 'PENDING'
      confirmedStatus = STATUS_MAP[String(opStatus).toUpperCase()] ?? 'pending'
      failureReason = confirmedStatus === 'failed'
        ? (check?.message ?? String(opStatus))
        : null
    } else {
      await supabase.from('payment_webhooks')
        .update({ error_msg: 'Clés CinetPay absentes : confirmation impossible' })
        .eq('id', webhookId)
      return json({ error: 'Configuration serveur incomplète' }, 500)
    }

    if (confirmedStatus === 'pending') {
      // Ni succès ni échec : on laisse le paiement en attente et on
      // accuse réception pour que l'opérateur cesse de réessayer.
      await supabase.from('payment_webhooks')
        .update({ processed: true, processed_at: new Date().toISOString(),
                  error_msg: 'Statut encore en attente chez le fournisseur' })
        .eq('id', webhookId)
      return json({ received: true, status: 'pending' }, 200)
    }

    // ── 5. Écrire l'encaissement ─────────────────────────────────────────────
    let paymentId = existing?.id ?? null

    if (paymentId) {
      const { error } = await supabase
        .from('payments')
        .update({
          status:           confirmedStatus,
          webhook_verified: true,
          paid_at:          confirmedStatus === 'success' ? new Date().toISOString() : null,
          failure_reason:   failureReason,
          raw_payload:      raw,
        })
        .eq('id', paymentId)
      if (error) throw error
    } else {
      // Paiement inconnu : la transaction a peut-être été initiée hors
      // de l'application. On la crée pour ne pas perdre l'encaissement,
      // en la rattachant à la facture si `cpm_custom` la référence.
      const invoiceId = (raw.cpm_custom as string) || null
      const amount    = Number(raw.cpm_amount ?? 0)

      const { data: created, error } = await supabase
        .from('payments')
        .insert({
          school_id:        (raw.school_id as string) ?? null,
          invoice_id:       invoiceId,
          amount,
          currency:         (raw.cpm_currency as string) ?? 'XOF',
          status:           confirmedStatus,
          provider,
          provider_ref:     providerRef,
          idempotency_key:  `${provider}:${providerRef}`,
          webhook_verified: true,
          paid_at:          confirmedStatus === 'success' ? new Date().toISOString() : null,
          failure_reason:   failureReason,
          raw_payload:      raw,
        })
        .select('id')
        .single()

      if (error) {
        // Une violation d'unicité signifie qu'un autre appel concurrent
        // a déjà créé la ligne : ce n'est pas une erreur, c'est
        // l'idempotence qui fonctionne.
        if (error.code === '23505') {
          await supabase.from('payment_webhooks')
            .update({ processed: true, processed_at: new Date().toISOString(),
                      error_msg: 'Doublon concurrent ignoré' })
            .eq('id', webhookId)
          return json({ received: true, alreadyProcessed: true }, 200)
        }
        throw error
      }
      paymentId = created.id
    }

    // Le trigger `on_payment_success` (migration 008) met à jour la
    // facture et la tranche : rien à faire ici.

    // ── 6. Journal d'audit ───────────────────────────────────────────────────
    await supabase.from('audit_logs').insert({
      school_id:    (raw.school_id as string) ?? null,
      actor_uid:    null,
      actor_role:   'system',
      action:       confirmedStatus === 'success' ? 'payment.confirmed' : 'payment.failed',
      entity_table: 'payments',
      entity_id:    paymentId,
      severity:     confirmedStatus === 'success' ? 'info' : 'warning',
      metadata: {
        provider,
        provider_ref: providerRef,
        amount:       raw.cpm_amount,
        currency:     raw.cpm_currency,
      },
    })

    await supabase.from('payment_webhooks')
      .update({
        processed:    true,
        processed_at: new Date().toISOString(),
        payment_id:   paymentId,
      })
      .eq('id', webhookId)

    return json({ received: true, status: confirmedStatus, paymentId }, 200)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    if (webhookId !== null) {
      await supabase.from('payment_webhooks')
        .update({ error_msg: message }).eq('id', webhookId)
    }

    // 500 : l'opérateur réessaiera, et l'idempotence protège du doublon.
    console.error('[payment-webhook]', message)
    return json({ error: 'Erreur interne' }, 500)
  }
})
