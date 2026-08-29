# Mapping Firestore → PostgreSQL

Livrable §28 du cahier des charges. Décision §24.2 : **Supabase est la source
de vérité unique**. Ce document dit, pour chaque collection Firestore existante,
où vont ses données et ce qui change.

---

## 1. Ce qui change en profondeur

Firestore est un magasin de documents ; PostgreSQL est relationnel. Quatre
différences structurent toute la migration.

**Les sous-collections deviennent des tables avec clé étrangère.**
`schools/{id}/students/{uid}` devient une ligne de `profiles` avec un
`school_id`. Le chemin du document portait le tenant ; désormais c'est une
colonne, et c'est elle que RLS vérifie.

**Les tableaux imbriqués deviennent des lignes.**
`profiles.children` était un JSONB. Il devient `student_guardians`, avec un
responsable financier unique garanti par index. Un tableau ne peut pas porter
de contrainte ; une table le peut.

**Les compteurs deviennent des séquences.**
`_counters/receipts` était un document incrémenté par transaction. C'est
maintenant `receipt_seq` + `next_receipt_num()`. Plus de contention, plus de
transaction perdue.

**Les règles deviennent des policies.**
Chaque `allow read: if ...` de `firestore.rules` a son équivalent RLS. La
différence : une policy s'applique aussi aux accès directs à la base, pas
seulement au SDK client.

---

## 2. Table de correspondance

### Identité et structure

| Firestore | PostgreSQL | Notes |
|---|---|---|
| `schools/{id}` | `schools` | ajout de `sites` pour le multi-campus |
| `users/{uid}` | `profiles` | `role` conservé, mais `user_roles` fait autorité |
| `schools/{id}/students/{uid}` | `profiles` (role='student') + `student_enrollments` | l'historique annuel sort du document |
| `schools/{id}/students/{uid}/private/data` | `student_health` | table séparée, accès journalisé |
| `students/{uid}.parentEmail` | `student_guardians` | **rupture** : lien explicite, plus par email |
| `users/{uid}.children[]` | `student_guardians` | **rupture** : tableau → lignes |
| `classes/{id}` | `classes` (+ `site_id`) | |
| `studentHistory/{id}` | `student_enrollments` | |
| — | `user_roles`, `role_permissions`, `teacher_assignments` | **nouveau** : §3.1, §21.1 |

### Pédagogie

| Firestore | PostgreSQL | Notes |
|---|---|---|
| `courses/{id}` | `courses` | |
| `courses/{id}/lessons/{id}` | `lesson_logs` + `curricula` | le cahier de texte se sépare du programme |
| `courses/{id}/quizzes/{id}` | `exercises` | |
| `fichesPedagogiques/{id}` | `courses` (`is_ai_generated`) | + trace dans `ai_usage_logs` |
| `progress/{uid}/courses/{id}` | `student_progress` | conservée telle quelle |
| `progressAnalyses/{id}` | `risk_signals` | **changement de sens** : une analyse devient un signal assigné à un humain |
| `bulletins/{id}` | `bulletins` + `bulletin_summaries` | une ligne par matière **et** une synthèse signée |
| — | `assessments`, `grades`, `grade_history` | **nouveau** : les notes individuelles n'existaient pas |
| `gradingResults/{id}` | `grades` + `ai_usage_logs` | la note et la trace IA se séparent |
| `hintUsage/{id}` | `ai_usage_logs` (task='explication') | |
| `_aiUsage/{key}` | `ai_usage_logs` + `ai_quotas` | |

### Vie scolaire

| Firestore | PostgreSQL | Notes |
|---|---|---|
| `attendance/{id}` | `attendance_sessions` + `attendance_records` | déjà séparé en 001 |
| `discipline/{id}` | `discipline_records` (+ `incidents`) | un incident précède désormais la sanction |
| `studentBadges/{id}`, `studentXP/{id}` | `student_xp` | |
| — | `absence_justifications`, `exit_permissions`, `parent_summons` | **nouveau** : §11 |

### Finance

| Firestore | PostgreSQL | Notes |
|---|---|---|
| `schools/{id}/fees/{id}` | `fee_structures` + `fee_items` | **rupture** : un « fee » devenait une facture ; les deux se séparent |
| `payments/{id}` | `payments` (+ `invoice_id`, `idempotency_key`) | |
| `cashPayments/{id}` | `cash_payments` (+ `session_id`) | rattaché à une session de caisse |
| `receipts/{id}` | `receipts` | |
| `_counters/receipts` | séquence `receipt_seq` | |
| `expenses/{id}` | `expenses` (+ `supplier_id`, workflow) | |
| `budgetLines/{id}`, `budgetAlerts/{id}` | `budget_lines` | l'alerte devient un seuil sur la ligne |
| `payroll/{id}`, `teacherContracts/{id}` | `monthly_payroll`, `teacher_contracts` | |
| `relanceLogs/{id}` | `message_logs` + `installments.reminders_sent` | |
| — | `invoices`, `invoice_lines`, `installments`, `discounts`, `cash_sessions`, `payment_webhooks` | **nouveau** : §14 |

### Communication et plateforme

| Firestore | PostgreSQL | Notes |
|---|---|---|
| `notifications/{id}` | `notifications` | TTL 72 h conservé |
| `fcmTokens/{id}` | `push_tokens` | |
| `messageLogs/{id}` | `message_logs` | |
| `inscriptionLeads/{id}` | `inscription_leads` → `applications` | le prospect reste, la candidature devient un objet à part |
| `exportJobs/{id}` | `export_jobs` | |
| `ministryReports/{id}` | `export_jobs` (dataset='ministry') | |
| `auditLogs/{id}` | `audit_logs` | enrichi : entité, IP, avant/après |
| `_securityIncidents/{id}` | `security_alerts` | |
| `_systemMetrics/daily` | `school_usage` | |
| `_rateLimits/{key}` | `ai_rate_limits` | déjà en 003 |
| `_deletionQueue`, `_deleteQueue` | `deletion_requests` | deux collections fusionnées |
| `school_config/{id}` | `school_configs` | |

---

## 3. Ce qui ne se migre pas automatiquement

Quatre cas demandent une décision humaine avant transfert.

**Les liens parent-enfant par email.** `students.parentEmail` ne garantit rien :
plusieurs parents partagent parfois une adresse, d'autres n'en ont pas. La
migration `005` traite trois cas (parent avec compte, parent identifié par
email, parent hors plateforme), mais le résultat doit être **relu par le
secrétariat** avant mise en service. Un mauvais rattachement expose les
données d'un enfant à la mauvaise famille.

**Les frais devenus factures.** Un document `fees` mélangeait le tarif et ce
qui est dû. Il faut décider, école par école, quelle grille tarifaire
reconstruire et quelles factures régénérer. Aucun script ne peut deviner.

**Les rôles.** `profiles.role` ne portait qu'une valeur. Les cumuls réels
(directeur qui est aussi DE, secrétaire qui tient la caisse) n'étaient pas
représentables. La migration crée un rôle par profil ; les cumuls doivent
être saisis ensuite.

**Les fichiers.** Firebase Storage → Supabase Storage impose de réécrire
chaque chemin selon la convention `<school_id>/<entité_id>/<fichier>`. Les URL
publiques existantes deviennent des URL signées : tout lien enregistré en base
doit être remplacé par un chemin, pas une URL.

---

## 4. Ordre de bascule

Le cahier des charges (§24.2) demande de finir une verticale avant d'en
commencer une autre, et de ne pas laisser de double écriture. Ordre proposé,
du moins risqué au plus risqué :

1. **Référentiel** — écoles, sites, années, niveaux, classes, matières.
   Peu de volume, aucune écriture concurrente, valide le multi-tenant.
2. **Identité** — profils, rôles, tuteurs. C'est là que se joue la sécurité :
   à valider avec le jeu de tests `acceptance_26.sql`.
3. **Vie scolaire** — présences, justificatifs, discipline. Fort volume
   d'écriture mobile : c'est le vrai test de l'offline.
4. **Pédagogie** — cours, devoirs, évaluations, notes, bulletins.
5. **Finance** — en dernier. Une erreur ici a un coût direct pour l'école.
   Basculer sur une année scolaire neuve, jamais en cours de trimestre.

À chaque étape : migrer, vérifier, **retirer le chemin Firebase**. Une
verticale qui écrit dans les deux bases pendant plus d'une semaine finit par
diverger.

---

## 5. Plan de rollback

Chaque verticale se déploie derrière un drapeau par école
(`schools.features.supabase_<verticale>`).

**Pendant la bascule** — le drapeau route les lectures. Firebase reste en
place, non modifié. Revenir en arrière = repasser le drapeau à `false`.
Coût : les écritures faites côté Supabase pendant la fenêtre sont perdues,
d'où l'intérêt de fenêtres courtes (une journée, hors période de saisie).

**Après retrait de Firebase** — le retour arrière n'est plus possible par
drapeau. La protection devient la sauvegarde : `pg_dump` avant chaque
migration, restauration testée au moins une fois sur un projet Supabase de
recette. Une sauvegarde jamais restaurée n'est pas une sauvegarde.

**Migrations SQL** — elles sont additives : aucune ne supprime de colonne ni
de table. Un `db push` raté se corrige par une migration suivante, pas par un
retour arrière. Les seules suppressions (`profiles.children`,
`profiles.role`) attendront une migration dédiée, après que le code aura
basculé et tourné en production plusieurs semaines.

---

## 6. Vérifications avant de retirer Firebase

Pour chaque verticale, ces contrôles doivent passer :

- Le nombre de lignes correspond au nombre de documents source.
- `acceptance_26.sql` passe intégralement.
- Un compte de chaque rôle a été testé à la main sur l'application réelle.
- Aucune écriture Firebase depuis 7 jours sur les collections concernées.
- Les fichiers liés sont accessibles par URL signée, et l'ancienne URL
  publique ne répond plus.
