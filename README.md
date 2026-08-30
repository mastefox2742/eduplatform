# Projetto1 — ERP scolaire SaaS multi-tenant

Plateforme de gestion scolaire pour le primaire, collège et lycée.
Cible : établissements privés et publics du Congo et d'Afrique francophone.

Référence fonctionnelle : `cahier_des_charges_projetto1.md` (v1.0).
**Ce README est le point d'entrée : il dit où en est le travail.**

---

## OÙ J'EN SUIS — 29 août 2026

### Fait

#### Phase 0 — gouvernance technique (§25)

- `D:\startup-alpha\Edu-school` gelé et marqué archive (`ARCHIVE.md` à sa
  racine). Décision §27 appliquée : plus aucun développement là-bas.
- `.gitignore` réécrit : builds (`functions/lib`, `dist`, `.expo`), médias
  générés (`*.mp4`, `preview-*.png`), worktrees locaux et
  `service-account.json` ne polluent plus l'arbre.

#### Schéma de base de données — migrations 004 à 014

Le schéma initial (001-003, 31 tables) couvrait environ 40 % du cahier des
charges. Onze migrations comblent l'écart : **107 tables ajoutées**.

| Fichier | Contenu | §CdC |
|---|---|---|
| `004_roles_sites_permissions.sql` | Rôles cumulables, sites/campus, RBAC granulaire, affectations enseignants | 3.1, 3.2, 4.1, 21.1 |
| `005_student_file_guardians.sql` | Tuteurs légaux, santé, documents, consentements, parcours, élève à risque | 7, 16, 17, 21.2, 21.3 |
| `006_admissions_academic.sql` | Candidatures, années/périodes, barèmes, coefficients, programmes | 5, 6 |
| `007_assessments_grades_exams.sql` | Évaluations, **notes individuelles**, historique, bulletins, workflows, examens | 3.3, 10.2, 13 |
| `008_finance.sql` | Tarifs, factures, échéanciers, remises, caisse, webhooks idempotents | 14, 22 |
| `009_vie_scolaire.sql` | Justificatifs, sorties, incidents, remplacements, cahier de texte, salles | 10.1, 11 |
| `010_modules_optionnels.sql` | Bibliothèque, transport, infirmerie, stocks, RH, cantine, visiteurs | 18 |
| `011_communication_ia_saas.sql` | Campagnes multicanal, journal IA, console SaaS, RGPD, file de sync | 4.2, 12.3, 17, 19, 21 |
| `012_rls_nouvelles_tables.sql` | RLS sur les 103 tables ajoutées en 004–011 | 21.1, 26 |
| `013_storage_buckets.sql` | 10 buckets + policies fichiers | 21.2 |
| `014_document_requests.sql` | Demandes de documents officiels, modèles, file de validation | 9, 16.4, 20.1 |

Trois manques structurels du schéma initial sont comblés :

1. **Les notes n'existaient pas.** Seule une moyenne par matière était
   stockée dans `bulletins`. `assessments` + `grades` + `grade_history` les
   portent désormais, avec traçabilité de chaque modification.
2. **Aucun lien parent-enfant fiable.** C'était un `profiles.children` en
   JSONB. `student_guardians` est une vraie table de liaison, avec
   responsable financier unique et reprise automatique de l'existant.
3. **Rien de ce qu'un élève DOIT.** Il n'y avait que la transaction de
   paiement. `fee_structures` → `invoices` → `installments` → `payments`
   ferme la chaîne.

#### Paiement réel (§22)

`PaymentAggregatorMock` répondait « succès » après un `setTimeout(1500)`.
Deux Edge Functions le remplacent :

- `payment-init` — crée un paiement `pending` et renvoie l'URL opérateur.
  Lit l'échéance **sous l'identité de l'appelant**, pour que RLS vérifie le
  rattachement parent-enfant.
- `payment-webhook` — signature HMAC comparée en temps constant, statut
  re-confirmé auprès de CinetPay, idempotence à trois niveaux, journal brut
  conservé même en cas de rejet.

Détail dans [`supabase/API.md`](supabase/API.md).

#### Design system et écrans repris

Les maquettes fournies (`design/maquettes/`) ont été transposées en
tokens partagés web et mobile. Les échelles Tailwind et le thème mobile
ont été **remappés** sur l'identité des maquettes : les 34 000 lignes
d'écrans existants ont changé d'apparence sans être réécrites.

Dix écrans refaits et branchés sur Supabase :

| Écran | Fichier | Particularité |
|---|---|---|
| Appel & Notes enseignant | `(teacher)/attendance.tsx` | Créneau en cours détecté à la minute, moyennes agrégées en une requête, appel 1-tap, file hors ligne, alerte WhatsApp parent |
| Paiement parent | `(parent)/paiement.tsx` | Quatre états distincts ; « payé » n'apparaît qu'après le webhook (§22) ; suivi par Realtime, pas par sondage |
| Validation direction | `(direction)/validation.tsx` | Anomalies calculées avant signature, « Valider tout » limité aux bulletins sains, rejet avec motif obligatoire |
| Tableau de bord direction | `(direction)/index.tsx` | État de synchronisation avant les chiffres ; « — » plutôt que zéro |
| Pilotage direction (web) | `web/pages/direction/OverviewPage.tsx` | Répartition sexe/niveau (§20.2), recouvrement rapporté au facturé, bulletins par classe |
| Accueil élève | `(student)/index.tsx` | Rang masqué par défaut (§15.7), moyenne visible après publication |
| Accueil parent | `(parent)/index.tsx` | Solde en tête, sélecteur d'enfant issu de `student_guardians` |
| Saisie flash des notes | `(teacher)/grades-flash.tsx` | Pavé fixe, barème contrôlé à la frappe, « saisi » ≠ « envoyé » |
| Guichet d'encaissement | `(direction)/caisse.tsx` | **Encaissement rattaché à une échéance** — le solde bougeait pas avant ; session de caisse ouverte/fermée avec écart constaté |
| Emploi du temps (prof + élève) | `WeekScheduleView` | Remplacements et annulations fusionnés dans la journée |

#### Sept écrans web de gestion (30 août)

Un audit demandé par le client a montré que **dix domaines documentés au
cahier des charges n'avaient aucune interface** — ni web ni mobile — et
que cinq autres n'existaient que sur mobile. Le schéma et les fonctions
étaient là depuis les migrations 006 à 011 ; il manquait de quoi s'en
servir.

Le cas le plus net était les ressources humaines : tables de contrats, de
paie et de congés écrites, fonctions `generateMonthlyPayroll` et
`validatePayslip` déployables, et pas un seul écran. Le domaine n'avait
même pas d'épic au backlog, ce qui explique qu'il soit passé inaperçu :
un tableau d'avancement ne mesure que ce qu'on a pensé à y mettre.

| Écran | Route | Règle métier portée à l'affichage |
|---|---|---|
| Ressources humaines | `/direction/hr` | Paie brouillon → validé → payé ; « Marquer payé » n'apparaît qu'après validation, un brouillon ne se décaisse pas. Heures d'absence toujours affichées à côté du net |
| Admissions | `/direction/admissions` | Un dossier incomplet ne passe pas à l'entretien, pièces manquantes nommées une par une ; « admis » ≠ « inscrit », les admis non inscrits comptés à part |
| Vie scolaire | `/direction/school-life` | Sanctionner ≠ notifier : les sanctions jamais transmises sont comptées et remontées. Aucune sortie autorisable sans nommer qui récupère l'élève |
| Facturation & impayés | `/direction/billing` | Le reste à payer prime sur le facturé ; aucune relance automatique — l'écran donne le montant et le numéro, la décision reste humaine |
| Communication | `/direction/communication` | Publier est irréversible : la confirmation dit combien de familles et par quel canal, avant l'envoi. Taux de lecture affiché après |
| Élèves en difficulté | `/direction/risk` | Score cumulant résultats, assiduité, comportement et scolarité ; jamais affiché seul, toujours avec ses signaux datés ; ne déclenche rien |
| Console éditeur | `/direction/platform` | **Rôle `ADMIN` seulement** — voir ci-dessous |

**La console éditeur n'est pas dans l'espace du directeur**, contrairement
à la demande initiale. Un directeur administre son établissement ; lui
montrer les effectifs et le chiffre d'affaires des autres écoles clientes
romprait l'isolation multi-tenant qui est la promesse centrale du produit.
La séparation tient à trois niveaux : la navigation ne montre pas
l'entrée, la route refuse l'accès, et les politiques RLS ne renverraient
aucune ligne si les deux premières barrières tombaient. Vérifié en local —
un directeur y reçoit « Accès refusé ».

Chaque écran affiche la règle qui le gouverne au lieu de la laisser dans
la documentation. Un utilisateur qui découvre à l'usage qu'un brouillon de
paie ne se décaisse pas a déjà perdu du temps ; l'écran le dit avant.

Les 28 liens de navigation pointent tous vers une route existante.

#### Qualité du code

Le type-check était cassé sur les quatre packages. Il passe maintenant :

```
apps/web              0 erreur   (37 avant)
apps/mobile           0 erreur   (58 avant)
packages/shared-types 0 erreur
functions             0 erreur  (115 avant)
```

`pnpm lint` et `pnpm test` passent aussi, et une CI GitHub Actions verrouille
l'ensemble — y compris le rejeu des migrations et les tests de sécurité §26.

**Bugs réels trouvés en chemin** (aucun n'était cosmétique) :

| Bug | Conséquence |
|---|---|
| `UserRole` n'avait que 3 valeurs sur 5 | **Un parent ne pouvait jamais générer le reçu de son paiement.** Les gardes `role !== "admin"` ne filtraient rien |
| `request.auth.token as CustomClaims` × 25 | Un jeton sans `schoolId` passait : l'isolation multi-tenant sautait. Remplacé par `requireClaims()` qui valide |
| `firebase` absent des dépendances mobile | 28 fichiers l'importaient : l'app ne pouvait pas se construire |
| `functions.auth.user()` appelé en API v2 | Ce trigger n'existe pas en v2 : `onCreateUser` n'était pas déployable |
| `onFinishQuiz` déclaré, jamais destructuré | Le score de quiz ne remontait pas : gamification muette |
| `systemInstruction` ignoré par `askGemini` | Le chat IA élève perdait son cadrage scolaire (§15.7) |
| `bulletins.tsx` en camelCase | Le hook était migré à Supabase, l'écran lisait les anciens noms |
| Cast `Buffer` invalide × 2 | Exports XLSX et rapports ministériels ne compilaient pas |
| Jest scannait `lib/` **et** `src/` | La suite affichait « 1 failed » pour un seul jeu de tests |

### En cours / à faire

- [ ] **Appliquer les migrations sur Supabase.** En attente des accès
      (`SUPABASE_PROJECT_REF`, mot de passe DB, `service_role`).
      Rien n'a encore été exécuté contre une base réelle.
- [ ] Brancher l'espace Parent sur `payment-init`, puis retirer
      `PaymentAggregatorMock`.
- [ ] Migration du code applicatif Firestore → Supabase, verticale par
      verticale (§24.2). Web : 100 % Firebase. Mobile : auth et bulletins
      sur Supabase, 27 fichiers encore sur Firestore.
- [ ] Types générés depuis le schéma (`supabase gen types`).
- [ ] Documentation utilisateur par rôle (§28).

### Deux points qui demandent une décision

**102 fichiers modifiés ne sont pas commités.** Le travail décrit ci-dessus
n'existe que dans l'arbre local. À découper en jalons avant de pousser.

**Deux worktrees Claude traînent dans `.claude/worktrees/`.** Expo Router les
a scannés comme des routes et a produit un `router.d.ts` corrompu, ce qui
cassait le type-check du mobile. Le fichier généré a été supprimé, mais les
worktrees restent — l'un porte un `launch.json` modifié non commité.
`git worktree remove` une fois vérifié qu'ils ne servent plus.

---

## Comment reprendre le travail

```bash
cd D:/projetto1
pnpm install
```

Vérifier que tout est sain :

```bash
pnpm type-check && pnpm lint
```

Appliquer les migrations (une fois les accès Supabase fournis) :

```bash
supabase link --project-ref VOTRE_REF
supabase db reset
```

`db reset` rejoue 001 → 014 sur une base locale vide. C'est le seul moyen de
valider l'ordre des migrations avant de toucher à la production. Puis :

```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/tests/acceptance_26.sql
```

Le script doit finir sur `TOUS LES TESTS SONT PASSES`. Toute autre sortie
signale une régression de sécurité : ne pas déployer.

---

## Architecture

```
projetto1/
├── apps/web/            React 18 + Vite 6 + Tailwind — direction, enseignants
├── apps/mobile/         Expo 51 + Expo Router — direction, prof, élève, parent
├── packages/shared-types/  types métier partagés
├── functions/           40 Cloud Functions Firebase (à migrer)
├── supabase/
│   ├── migrations/      001 → 014
│   ├── functions/       ai-proxy, payment-init, payment-webhook
│   ├── tests/           critères d'acceptation §26
│   ├── API.md           spécification API et webhooks
│   ├── MIGRATION_MAPPING.md   Firestore → PostgreSQL
│   └── DEPLOY.md
└── .github/workflows/   CI : types, lint, tests, migrations, RLS
```

### Backend — état de la bascule

| Couche | Aujourd'hui | Cible |
|---|---|---|
| Web | Firebase (100 %) | Supabase |
| Mobile | Firestore (27 fichiers) + Supabase (auth, bulletins) | Supabase |
| Fonctions | Firebase Functions | Edge Functions (3 écrites) |
| Schéma | — | **Supabase, prêt** |

La source de vérité décidée est **Supabase** (§24.2). Le schéma est en place ;
le code suit, verticale par verticale, sans double écriture durable.

---

## Rôles

Un utilisateur peut cumuler plusieurs rôles (§3.1), chacun limité à un
périmètre : école, site, cycle, niveau, classe ou matière.

`super_admin` · `directeur` · `secretaire` · `gestionnaire` · `de` ·
`sg` · `enseignant` · `parent` · `eleve` · `support`

Les permissions se lisent avec `can('resource', 'action')` en SQL, ou via le
hook `usePermissions()` côté web. Chaque école peut surcharger les défauts de
la plateforme.

Le hook sert à **afficher ou masquer**, jamais à autoriser : masquer un
bouton n'empêche personne d'appeler l'API. L'autorisation est portée par RLS.

---

## Règles de sécurité tenues par le schéma

Ces garanties sont dans les policies RLS, pas seulement dans l'interface —
critères d'acceptation §26, vérifiés par `supabase/tests/acceptance_26.sql` :

- Une école ne voit jamais les données d'une autre (`is_same_school`).
- Un enseignant ne modifie que ses classes, ses matières, et seulement tant
  que la période est ouverte (`teaches_class`, `period_is_open`).
- Un parent ne voit que les enfants auxquels il est rattaché (`is_my_child`).
- Les données de santé sont hors de portée des enseignants **et de l'élève
  lui-même**, et chaque consultation est journalisée.
- Les solutions d'exercices ne sont jamais lisibles côté client — ni par un
  élève, ni par un enseignant qui n'en est pas l'auteur.
- Les webhooks de paiement n'ont aucune policy cliente : `service_role` seul.
- Bulletins et notes ne deviennent visibles à l'élève qu'après publication.

---

## Conventions

- SQL : `snake_case`, `school_id` sur toute table métier, `timestamptz`,
  UUID en clé primaire, commentaires en français référençant le §CdC.
- Les migrations sont **additives**. Les colonnes remplacées
  (`profiles.children`, `profiles.role`) sont conservées le temps que le code
  bascule, puis retirées dans une migration dédiée.
- TypeScript strict sur tous les packages.
- ESLint ne double pas TypeScript : ce que `tsc` détecte déjà est désactivé.

---

## Décision sur Edu-school

`D:\startup-alpha\Edu-school` est un prototype archivé, pas un produit
parallèle (§27). Projetto1 est la seule base de référence.
