# Spécification API — Projetto1

Livrable §28. Décrit les Edge Functions, les webhooks de paiement, et
la façon dont le client accède aux données.

---

## 1. Principe d'accès

Le client **n'appelle pas une API métier** pour lire ou écrire des données
ordinaires : il interroge PostgREST directement via le SDK Supabase, et RLS
décide de ce qu'il voit. C'est ce qui rend l'isolation multi-tenant réelle
plutôt que déclarative — une requête forgée passe par les mêmes policies
qu'un écran de l'application.

```ts
// L'école, le rôle et le périmètre ne sont pas des paramètres :
// ils viennent du jeton, et RLS les applique.
const { data } = await supabase
  .from('grades')
  .select('*, assessments(title, max_score, subject_name)')
  .eq('student_id', studentId)
```

Une Edge Function n'est nécessaire que dans trois cas :

1. **Un secret est en jeu** — clé Gemini, clé CinetPay.
2. **Le client ne doit pas pouvoir décider** — confirmer un paiement,
   valider une correction IA.
3. **L'appelant n'est pas un utilisateur** — webhook d'un opérateur.

Tout le reste passe par PostgREST + RLS.

---

## 2. Edge Functions

### `ai-proxy`

`POST /functions/v1/ai-proxy` — authentification JWT requise.

Relaie les requêtes vers Gemini sans jamais exposer la clé au client.
Applique un quota horaire par rôle (direction 200, enseignant 100,
élève 20) et filtre les tentatives d'injection de prompt.

```jsonc
// requête
{ "prompt": "Explique le théorème de Pythagore", "context": "default", "maxTokens": 1000 }
// réponse
{ "result": "…", "tokensUsed": 412 }
```

### `payment-init`

`POST /functions/v1/payment-init` — authentification JWT requise.

Initie un paiement Mobile Money pour une échéance.

```jsonc
// requête
{ "installmentId": "uuid", "phoneNumber": "+242061234567", "network": "MTN" }
// réponse
{ "paymentId": "uuid", "paymentUrl": "https://checkout.cinetpay.com/…",
  "amount": 45000, "status": "pending" }
```

La lecture de l'échéance se fait **sous l'identité de l'appelant**, pas en
`service_role` : RLS vérifie ainsi que le parent est bien rattaché à cet
élève. Utiliser les droits serveur à cette étape permettrait de payer — et
donc de lire le montant dû — la facture de n'importe quel enfant.

`status` vaut toujours `pending` en retour. Le client ne doit jamais
conclure au succès sur cette réponse.

| Code | Signification |
|---|---|
| 401 | Jeton absent ou invalide |
| 404 | Échéance inexistante, ou hors du périmètre du parent |
| 409 | Échéance déjà réglée |
| 502 | L'opérateur a refusé l'initialisation |
| 503 | Paiement en ligne non configuré pour cette école |

### `payment-webhook`

`POST /functions/v1/payment-webhook` — **sans JWT** (`--no-verify-jwt`).

L'appelant est l'opérateur de paiement. L'authentification se fait par
signature HMAC-SHA256, pas par jeton.

---

## 3. Webhook de paiement — le détail qui compte

§22 : « le statut final doit provenir d'une confirmation serveur/webhook
vérifiée, idempotente et auditable ». Voici comment les trois mots sont tenus.

### Vérifiée

La signature est recalculée à partir du corps reçu, avec les champs
concaténés dans l'ordre imposé par CinetPay, puis comparée **en temps
constant**. Une comparaison `===` s'arrête au premier octet différent : le
temps de réponse renseignerait alors sur le nombre d'octets corrects, ce qui
permet de reconstruire une signature valide octet par octet.

Une signature invalide reçoit tout de même `200`. Répondre en erreur
inviterait l'émetteur à réessayer indéfiniment ; la notification est
rejetée et journalisée, pas perdue.

La signature prouve l'origine, **pas le résultat**. La fonction redemande
donc le statut à l'API CinetPay avant de créditer quoi que ce soit. Sans
cette seconde étape, une clé qui fuiterait suffirait à s'auto-déclarer payé.

### Idempotente

Les opérateurs rejouent leurs notifications jusqu'à obtenir un `200`. Trois
protections se superposent :

1. Un index unique sur `(provider, provider_ref)`.
2. Un index unique sur `idempotency_key`.
3. Un contrôle explicite : si le paiement est déjà `success`, la fonction
   répond `{ alreadyProcessed: true }` sans rien écrire.

Une violation d'unicité concurrente (`23505`) n'est pas traitée comme une
erreur : c'est l'idempotence qui fonctionne.

### Auditable

La notification brute est enregistrée dans `payment_webhooks` **avant**
toute vérification — une notification rejetée est souvent la seule trace
d'une tentative de fraude. Chaque confirmation produit une ligne
`audit_logs` avec `actor_role = 'system'`.

### Enchaînement complet

```
Parent                payment-init          CinetPay            payment-webhook
  │                        │                    │                      │
  ├─ installmentId ───────►│                    │                      │
  │                   [RLS: mon enfant ?]       │                      │
  │                   [payments: pending]       │                      │
  │                        ├── init ───────────►│                      │
  │◄──── paymentUrl ───────┤                    │                      │
  ├──────── paie sur le portail opérateur ─────►│                      │
  │                        │                    ├── notification ─────►│
  │                        │                    │                 [signature]
  │                        │                    │◄─── /payment/check ──┤
  │                        │                    ├──── ACCEPTED ───────►│
  │                        │                    │                 [status=success]
  │                        │                    │                 [trigger → facture]
  │◄───── notification push « paiement reçu » ──────────────────────────┤
```

Le trigger `on_payment_success` (migration 008) met à jour la tranche puis
la facture. Aucun code applicatif ne recalcule un solde à la main.

---

## 4. Erreurs

Toutes les fonctions renvoient `{ "error": "message en français" }`. Les
messages sont destinés à être affichés : ils ne contiennent ni trace
technique, ni nom de table, ni identifiant interne.

| Code | Usage |
|---|---|
| 400 | Paramètre manquant ou invalide |
| 401 | Non authentifié |
| 403 | Authentifié mais hors périmètre |
| 404 | Ressource inexistante **ou** hors périmètre — volontairement indistinguables |
| 409 | Conflit d'état (déjà payé, déjà validé) |
| 429 | Quota dépassé |
| 5xx | Erreur serveur ; l'appelant peut réessayer |

Le `404` couvre aussi le cas « existe mais ne vous regarde pas ». Un `403`
distinct confirmerait l'existence de la ressource, ce qui suffit parfois à
énumérer les élèves d'un établissement.

---

## 5. Secrets

Aucun secret ne transite par une URL, un log, ou le bundle client (§21.4).

| Secret | Emplacement |
|---|---|
| `GEMINI_API_KEY` | Secrets Supabase — jamais côté client |
| `CINETPAY_API_KEY`, `CINETPAY_SITE_ID` | Secrets Supabase |
| `CINETPAY_SECRET_KEY` | Secrets Supabase — sert à vérifier les signatures |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions uniquement |
| `SUPABASE_ANON_KEY` | Public — protégé par RLS, peut être dans le bundle |

La clé Gemini a déjà été trouvée dans une URL et dans `eas.json` lors de
l'audit de sécurité (commit `2a61a6f`). Elle doit rester côté serveur.

---

## 6. Ce qui reste à faire

- Brancher l'espace Parent sur `payment-init` (l'écran appelle encore la
  Cloud Function Firebase, qui contient un mock).
- Retirer `PaymentAggregatorMock` de `functions/src/payments/mobileMoney.ts`
  une fois la bascule faite.
- Ajouter Bizao comme second fournisseur : la table `payments` porte déjà
  une colonne `provider`, la logique est prête à en accueillir un autre.
- Tester le webhook avec les notifications de test CinetPay avant toute
  mise en production.
