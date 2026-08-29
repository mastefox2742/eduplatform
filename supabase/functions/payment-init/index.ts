/**
 * Supabase Edge Function : payment-init
 *
 * Initie un paiement Mobile Money pour une tranche de scolarité.
 * Appelée par l'espace Parent (§16.3).
 *
 * Cahier des charges §14.2 : « création d'une demande de paiement,
 * redirection/popup sécurisé et vérification par webhook serveur ».
 *
 * Cette fonction ne confirme JAMAIS un paiement. Elle crée une ligne
 * `pending` et renvoie l'URL de l'opérateur. Seul `payment-webhook`,
 * après re-confirmation auprès du fournisseur, passe le paiement en
 * `success` (§22, §26).
 *
 * Deploy  : supabase functions deploy payment-init
 * Secrets : CINETPAY_API_KEY, CINETPAY_SITE_ID, PUBLIC_APP_URL
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CINETPAY_INIT_URL = 'https://api-checkout.cinetpay.com/v2/payment'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Authentifier l'appelant ───────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifié' }, 401)

    const asUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authErr } = await asUser.auth.getUser()
    if (authErr || !user) return json({ error: 'Non authentifié' }, 401)

    const { installmentId, phoneNumber, network } = await req.json()

    if (!installmentId || !phoneNumber) {
      return json({ error: 'installmentId et phoneNumber sont requis' }, 400)
    }

    // ── 2. Lire la tranche SOUS L'IDENTITÉ DE L'APPELANT ─────────────────────
    // C'est volontaire : RLS vérifie ici que le parent est bien rattaché
    // à cet élève (§26). Utiliser le service_role à cette étape
    // reviendrait à permettre de payer — et donc de lire le montant dû —
    // la facture de n'importe quel enfant.
    const { data: inst, error: instErr } = await asUser
      .from('installments')
      .select('id, school_id, student_id, invoice_id, amount, paid_amount, due_date, label')
      .eq('id', installmentId)
      .single()

    if (instErr || !inst) {
      return json({ error: 'Échéance introuvable ou accès refusé' }, 404)
    }

    const remaining = Number(inst.amount) - Number(inst.paid_amount ?? 0)
    if (remaining <= 0) {
      return json({ error: 'Cette échéance est déjà réglée' }, 409)
    }

    // ── 3. Créer le paiement en attente ──────────────────────────────────────
    // Le service_role est requis : les policies interdisent l'écriture
    // cliente sur `payments`, précisément pour qu'un client ne puisse
    // pas s'auto-déclarer payé.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Référence unique, sans horodatage aléatoire côté client.
    const transactionId = `PJ1-${inst.id.replace(/-/g, '').slice(0, 12)}-${Date.now()}`

    const { data: payment, error: payErr } = await admin
      .from('payments')
      .insert({
        school_id:       inst.school_id,
        student_id:      inst.student_id,
        parent_id:       user.id,
        invoice_id:      inst.invoice_id,
        installment_id:  inst.id,
        amount:          remaining,
        currency:        'XOF',
        network:         network ?? null,
        status:          'pending',
        provider:        'cinetpay',
        provider_ref:    transactionId,
        idempotency_key: `cinetpay:${transactionId}`,
        transaction_id:  transactionId,
      })
      .select('id')
      .single()

    if (payErr) throw payErr

    // ── 4. Demander l'URL de paiement à l'opérateur ──────────────────────────
    const apiKey = Deno.env.get('CINETPAY_API_KEY')
    const siteId = Deno.env.get('CINETPAY_SITE_ID')
    const appUrl = Deno.env.get('PUBLIC_APP_URL') ?? ''

    if (!apiKey || !siteId) {
      // On annule la ligne créée : laisser un `pending` orphelin
      // fausserait le suivi des impayés.
      await admin.from('payments')
        .update({ status: 'failed', failure_reason: 'Configuration CinetPay absente' })
        .eq('id', payment.id)
      return json({ error: 'Paiement en ligne indisponible' }, 503)
    }

    const initResp = await fetch(CINETPAY_INIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey:          apiKey,
        site_id:         siteId,
        transaction_id:  transactionId,
        amount:          remaining,
        currency:        'XOF',
        description:     inst.label ?? 'Frais de scolarité',
        customer_phone_number: phoneNumber,
        channels:        'MOBILE_MONEY',
        // `cpm_custom` nous revient dans le webhook : on y place la
        // facture pour pouvoir rattacher un paiement initié hors app.
        metadata:        inst.invoice_id ?? '',
        notify_url:      `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
        return_url:      `${appUrl}/paiements/retour`,
      }),
    })

    const init = await initResp.json()

    if (init?.code !== '201' || !init?.data?.payment_url) {
      await admin.from('payments')
        .update({
          status: 'failed',
          failure_reason: init?.message ?? 'Initialisation refusée par le fournisseur',
          raw_payload: init,
        })
        .eq('id', payment.id)
      return json({ error: init?.message ?? 'Initialisation du paiement refusée' }, 502)
    }

    await admin.from('audit_logs').insert({
      school_id:    inst.school_id,
      actor_uid:    user.id,
      actor_role:   'parent',
      action:       'payment.initiated',
      entity_table: 'payments',
      entity_id:    payment.id,
      metadata:     { amount: remaining, installment: inst.id, network },
    })

    return json({
      paymentId:  payment.id,
      paymentUrl: init.data.payment_url,
      amount:     remaining,
      // Le client ne doit surtout pas conclure au succès sur cette
      // réponse : le statut vient du webhook (§22).
      status:     'pending',
    })

  } catch (err) {
    console.error('[payment-init]', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
