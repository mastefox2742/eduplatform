# Déploiement Supabase — Projetto1

## 1. Lier le projet

```bash
npm install -g supabase
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
```

## 2. Valider en local AVANT de toucher la production

`db reset` rejoue `001` → `014` sur une base vide. C'est le seul moyen de
vérifier l'ordre des migrations et de repérer une dépendance manquante.

```bash
supabase start
supabase db reset
```

Puis les tests des critères d'acceptation :

```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/tests/acceptance_26.sql
```

Le script doit finir sur `TOUS LES TESTS SONT PASSES`. Toute autre sortie
signale une régression de sécurité : ne pas déployer.

## 3. Appliquer en production

```bash
supabase db push
```

## 4. Migrations

| Fichier | Objet |
|---|---|
| `001_initial_schema.sql` | Socle : écoles, profils, classes, bulletins, présences, paiements |
| `002_rls_policies.sql` | RLS du socle + fonctions `auth_role()`, `auth_school_id()` |
| `003_helpers.sql` | Utilitaires, rate limiting IA, numéros de reçu |
| `004_roles_sites_permissions.sql` | Rôles cumulables, sites, RBAC granulaire |
| `005_student_file_guardians.sql` | Tuteurs, santé, documents, consentements, parcours |
| `006_admissions_academic.sql` | Candidatures, années/périodes, barèmes, programmes |
| `007_assessments_grades_exams.sql` | Évaluations, notes, bulletins, workflows, examens |
| `008_finance.sql` | Tarifs, factures, échéanciers, caisse, webhooks |
| `009_vie_scolaire.sql` | Justificatifs, sorties, incidents, cahier de texte |
| `010_modules_optionnels.sql` | Bibliothèque, transport, infirmerie, stocks, RH, cantine |
| `011_communication_ia_saas.sql` | Campagnes, journal IA, console SaaS, RGPD, sync |
| `012_rls_nouvelles_tables.sql` | RLS des 103 tables ajoutées |
| `013_storage_buckets.sql` | Buckets et policies fichiers |
| `014_document_requests.sql` | Demandes de documents officiels, modèles, vue `validation_queue` |

Les migrations sont **additives**. Les colonnes remplacées
(`profiles.children`, `profiles.role`) restent en place tant que le code
applicatif n'a pas basculé.

## 5. Storage

Les buckets sont créés par `013`. Aucune action manuelle dans le dashboard.

| Bucket | Public | Taille | Contenu |
|---|---|---|---|
| `school-assets` | oui | 10 Mo | logos, en-têtes, cachets |
| `user-media` | non | 5 Mo | photos de profil |
| `student-docs` | non | 10 Mo | pièces du dossier élève |
| `admissions` | non | 10 Mo | pièces de candidature |
| `receipts` | non | 10 Mo | reçus PDF |
| `bulletins` | non | 10 Mo | bulletins signés |
| `exports` | non | 50 Mo | XLSX / CSV / PDF générés |
| `courses` | non | 50 Mo | supports pédagogiques |
| `homework` | non | 20 Mo | copies rendues |
| `health` | non | 10 Mo | justificatifs médicaux |

**Convention de chemin obligatoire** : `<school_id>/<entité_id>/<fichier>`.
Le premier segment porte le tenant — c'est lui que les policies vérifient.
Un fichier déposé hors de cette convention sera rejeté ou invisible.

Les URL sont signées à durée courte, jamais publiques (sauf `school-assets`).

## 6. Secrets

```bash
# IA
supabase secrets set GEMINI_API_KEY=...

# WhatsApp / SMS
supabase secrets set TWILIO_ACCOUNT_SID=...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_WHATSAPP_NUMBER=whatsapp:+...
supabase secrets set AFRICASTALKING_API_KEY=...

# Paiement
supabase secrets set CINETPAY_API_KEY=...
supabase secrets set CINETPAY_SITE_ID=...
supabase secrets set CINETPAY_SECRET_KEY=...
```

Aucune clé ne doit apparaître dans une URL, dans un log, ni dans le client
(§21.4). Le webhook de paiement vérifie la signature avant tout traitement.

## 7. Edge Functions

```bash
supabase functions deploy ai-proxy
supabase functions deploy enroll-student
supabase functions deploy payment-init
supabase functions deploy payment-webhook --no-verify-jwt
```

`enroll-student` (inscription individuelle, V1-11) vérifie le JWT et
n'a besoin d'aucun secret externe : le service role est injecté par la
plateforme. Elle dérive l'école du rôle de l'appelant et refuse tout
appelant qui n'est pas super_admin / directeur / de / secretaire /
gestionnaire. **Déployée sur `Alpha_school` le 30 août 2026.**

`--no-verify-jwt` n'est requis que pour le webhook : l'appelant est
l'opérateur de paiement, pas un utilisateur connecté. Son
authentification repose sur une signature HMAC vérifiée dans la
fonction (§22). Déclarer l'inverse ouvrirait la porte à n'importe qui.

Puis renseigner l'URL de notification chez CinetPay :

```
https://<PROJECT_REF>.supabase.co/functions/v1/payment-webhook
```

## 8. Après le premier déploiement

1. Créer le premier `super_admin` :

```sql
INSERT INTO user_roles (school_id, user_id, role, scope_kind)
VALUES ('<school_id>', '<user_id>', 'super_admin', 'school');
```

2. Vérifier que RLS est bien actif partout — aucune ligne ne doit sortir :

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (SELECT tablename FROM pg_tables t
                        JOIN pg_class c ON c.relname = t.tablename
                        WHERE c.relrowsecurity)
ORDER BY 1;
```

3. Générer les types TypeScript :

```bash
supabase gen types typescript --linked > packages/shared-types/src/database.ts
```
