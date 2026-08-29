# Design system Projetto1

Source : maquettes `design/maquettes/*.html`. Ce document dit ce que
les maquettes fixent, comment c'est transposé dans le code, et quelle
fonctionnalité chaque écran porte.

**Règle** : web et mobile partagent les mêmes valeurs. Une carte web et
une carte mobile doivent être indiscernables sur une capture.

---

## 1. Ce que les maquettes fixent

### Couleurs

| Rôle | Valeur | Sens dans le produit |
|---|---|---|
| `primary` | `#145DA0` | Identité, navigation active, actions principales |
| `secondary` | `#0F766E` | Validé, présent, recouvré, réussite |
| `accent` | `#F4A62A` | En attente, XP, échéance proche, attention |
| `destructive` | `#C2413B` | Impayé, absence non justifiée, sanction, urgent |
| `background` | `#F6F8FB` | Fond d'écran |
| `card` | `#FFFFFF` | Surfaces |
| `foreground` | `#14213D` | Texte principal (bleu nuit, pas noir) |
| `muted-foreground` | `#5E7188` | Texte secondaire |
| `border` | `#D8E1EB` | Bordures |

Le point important : **il n'y a pas de vert vif**. Ce qui est validé est
teal. Un vert `#22C55E` dans un écran signale qu'il n'a pas été repris.

### Typographie

- **Manrope** (600/700/800) — titres, valeurs de KPI, noms d'élèves
- **Inter** (400/500/600/700) — texte courant
- JetBrains Mono et Playfair Display déclarées, peu employées

Les titres de section sont en `text-sm font-bold` : petits et denses,
pas de gros titres. C'est ce qui donne l'air d'un outil de travail.

### Formes

- Rayon de base `0.75rem` ; cartes en `rounded-2xl`, pastilles en `rounded-full`
- `corner-shape: squircle` là où le navigateur le supporte
- Ombres très discrètes — la bordure fait le travail de séparation

### Icônes

Jeu **Solar** via Iconify. `-outline` par défaut, `-bold` pour l'élément
actif ou mis en avant. Deux icônes MDI : `megaphone`, `whatsapp`.

---

## 2. Transposition dans le code

| Maquette | Web | Mobile |
|---|---|---|
| Tokens couleur | `src/styles/globals.css` (`:root`) | `src/theme/index.ts` (`colors`) |
| Échelles Tailwind | `tailwind.config.ts` | — |
| Polices | `@import` Google Fonts | `@expo-google-fonts/*` embarquées |
| Icônes | `components/ui/Icon.tsx` + `ICONS` | `Ionicons` (équivalences) |
| Carte, KPI, alerte | `components/ui/Card.tsx` | `components/ui/DesignSystem.tsx` |
| Bouton, pastille | `Button.tsx`, `Badge.tsx` | `DesignSystem.tsx` |
| Navigation | `layout/Sidebar.tsx` | `(role)/_layout.tsx` |

### Le choix qui évite de tout réécrire

Les 12 000 lignes de JSX web et 22 000 lignes mobile utilisent déjà
`primary-600`, `danger-500`, `colors.gray[500]`. Plutôt que de les
réécrire une par une, **les échelles sont remappées** sur l'identité des
maquettes : `primary-600` vaut désormais `#145DA0`, `success-*` pointe sur
le teal, `warning-*` sur l'ambre, la grise est teintée bleu nuit.

Conséquence : tous les écrans existants ont adopté le style sans être
touchés. Les écrans repris ensuite emploient les tokens sémantiques
(`bg-card`, `text-muted-foreground`), plus lisibles.

---

## 3. Correspondance écran ↔ fonctionnalité ↔ données

### `direction---web-dashboard` — poste de pilotage

Sidebar groupée par métier, contenu dense.

| Élément de la maquette | Fonction | Tables |
|---|---|---|
| Sélecteur « Année 2023–2024 · Trimestre 2 » | Contexte actif §3.1 | `academic_years`, `academic_periods`, `user_active_context` |
| Groupes de navigation | Rôles cumulables §3.2 | `user_roles`, `role_permissions` |
| Badge « 28 » sur Validation bulletins | Charge de travail en attente | `bulletin_summaries` où `state = 'soumis'` |
| « 84 % recouv. » sur Finance | Taux de recouvrement | `school_unpaid_total()` |
| Assiduité du jour | Appel consolidé | `attendance_sessions`, `attendance_records` |
| Alertes & Vie scolaire (SG) | Incidents et absences critiques | `incidents`, `risk_signals` |
| Génération rapide de documents | Attestations, certificats | `export_jobs`, `student_documents` |

**Fait** : Sidebar refaite (groupes, contexte actif, compteurs).
**Reste** : brancher les compteurs sur des requêtes réelles.

### `direction---dashboard` — direction mobile

| Élément | Fonction | Tables |
|---|---|---|
| « Bonjour, Mme Nsimba » + date | Accueil contextualisé | `profiles` |
| « Votre établissement est à jour · En ligne » | État de synchronisation §19.3 | `sync_operations` |
| Élèves inscrits, Assiduité, FCFA encaissés | KPI | `student_enrollments`, `attendance_records`, `payments` |
| Actions rapides : Valider · Caisse · Annonce · Paramètres | Raccourcis métier | `bulletin_summaries`, `cash_sessions`, `announcements` |
| À ne pas manquer | File d'attente du directeur | `workflow_instances` assignées |

### `direction---validation` — signature des bulletins

| Élément | Fonction | Tables |
|---|---|---|
| « 31 items » en attente | File de validation §3.3 | `workflow_instances` |
| « Mode signature électronique actif » | Signature §20.1 | `bulletin_summaries.signed_by`, `signature_url` |
| Bulletin élève + moyenne + avis conseil | Validation unitaire | `bulletin_summaries`, `grades` |
| Valider / Rejeter | Transition d'état | `workflow_steps_log` |
| « Valider tout » | Validation en masse | idem, en lot |
| Certificat de scolarité (Secrétariat) | Document officiel | `generated_documents` |

C'est l'écran qui matérialise le mieux la matrice §3.3 : chaque
validation trace qui, quand, et pourquoi.

### `enseignant---appel-et-notes` — le cœur du quotidien

| Élément | Fonction | Tables |
|---|---|---|
| « Appel de présence flash · Appuyez pour basculer » | Appel en une action §12.2 | `attendance_sessions`, `attendance_records` |
| Présent / Absent non justifié / Retard 15 min | Statuts + motifs | `attendance_status`, `absence_reasons` |
| « Saisie Flash des Notes · Contrôle N°3 · Coeff. 2 · Sur 20 » | Notes-flash §12.2 | `assessments`, `grades` |
| « Moy: 14.8/20 » sous le nom | Moyenne courante | `student_subject_average()` |
| Onglets : Appel · Cahier texte · Notes · Planning · Compte | Navigation enseignant | `lesson_logs`, `schedule_slots` |

Les deux fonctions les plus utilisées de tout l'ERP. Elles doivent
fonctionner hors ligne (`offline_allowed = true` dans `role_permissions`).

### `eleve---dashboard` — motivation et clarté

| Élément | Fonction | Tables |
|---|---|---|
| « Niv. 4 » + « 420 XP » + « Série de 5 jours 🔥 » | Gamification §15.7 | `student_xp` |
| « Mode hors ligne activé · Cours enregistrés » | État de synchronisation | `sync_operations` |
| Planning du jour en rail horizontal | Emploi du temps §15.5 | `schedule_slots` |
| Cartes de cours : en cours / bientôt / après-midi | Créneau courant | idem |
| Devoirs à rendre · « 2 urgents » | Devoirs §15.3 | `devoirs`, `devoir_submissions` |
| Tuteur IA Projetto1 | Chat IA cadré §15.7 | `ai_usage_logs` |
| Barre basse : Accueil · Cours · Devoirs · Notes · Profil | Navigation élève | — |

§15.7 impose « sans classement humiliant » : `grading_rules.rank_visible_student`
est à `false` par défaut, et l'écran n'affiche jamais le rang d'un élève.

### `parent---dashboard` — multi-enfants

| Élément | Fonction | Tables |
|---|---|---|
| Bandeau Destin / Clarisse / Aurel | `ChildSwitcher` §16.1 | `student_guardians` |
| « Frais de scolarité en attente · Reste à payer 45 000 FCFA » | Solde §16.3 | `invoices.balance`, `installments` |
| « Échéance Mai 2024 » | Échéancier | `installments.due_date` |
| Moyenne générale · Rang · Assiduité 98 % | Suivi §16.2 | `bulletin_summaries`, `attendance_records` |
| « 0 non just. · 1 retard » | Absences | `absence_justifications` |

Le `ChildSwitcher` n'est pas cosmétique : c'est lui qui matérialise
`is_my_child()` — un parent ne bascule qu'entre les enfants auxquels il
est rattaché.

### `parent---paiement-scolarite` — paiement Mobile Money

| Élément | Fonction | Tables / fonctions |
|---|---|---|
| « Facture #FAC-2024-0582 · Échéance 15 Mai » | Facture | `invoices` |
| Lignes : écolage, frais BEPC, remise fratrie | Détail | `invoice_lines`, `discounts` |
| « Remise fratrie (3ème enfant) » | Remise §14.1 | `discounts` kind=`fratrie` |
| « Montant total net » | Net à payer | `invoices.net_amount` |
| MTN MoMo (*105#) · Airtel Money (*128#) · CinetPay | Moyens §14.2 | Edge `payment-init` |
| « Sécurisé » | Confirmation serveur §22 | Edge `payment-webhook` |

L'écran ne doit **jamais** afficher « payé » sur la réponse de
`payment-init` : ce statut vient du webhook après re-confirmation.

---

## 3 bis. Écrans repris

### `enseignant---appel-et-notes` → `apps/mobile/src/app/(teacher)/attendance.tsx`

Refait à l'identique, branché sur Supabase via `useTeacherSession`.

Ce que l'écran fait réellement :

- Charge les créneaux du jour depuis `schedule_slots` et sélectionne
  celui qui est **en cours à cette minute** ; sinon le prochain.
- Liste les élèves de la classe via `student_enrollments`, avec leur
  **moyenne réelle** dans la matière (agrégée en une requête, pas 42).
- Charge les responsables en un seul appel : le bouton WhatsApp
  d'alerte d'absence doit répondre sans attendre.
- Un appui sur une ligne fait défiler présent → absent → retard.
- « Faire l'appel (1-Tap) » met toute la classe présente.
- L'enregistrement passe par la file hors ligne ; le bandeau affiche
  « en attente d'envoi » tant que le serveur n'a pas confirmé (§19.3).
- Si la période est verrouillée par le DE, la saisie passe en lecture
  seule (§5.2) — l'écran le dit au lieu d'échouer à l'enregistrement.
- La progression de saisie des notes vient de la dernière évaluation
  non publiée de la classe ; s'il n'y en a pas, l'écran le dit.

Aucun filtre par enseignant n'est fait côté client : RLS ne renvoie
que ses classes (§26). Un filtre client serait cosmétique.

### `parent---paiement-scolarite` → `apps/mobile/src/app/(parent)/paiement.tsx`

Refait à l'identique, branché sur les Edge Functions via
`useInvoicePayment`.

Quatre états distincts, jamais confondus :

| État | Ce que voit le parent |
|---|---|
| `idle` | Facture détaillée, choix du moyen, saisie du numéro |
| `initiating` | Bouton en attente, aucune promesse |
| `awaiting` | « En attente de votre validation » + rappel explicite que rien n'est réglé tant que l'opérateur n'a pas confirmé |
| `confirmed` | « Paiement reçu » — **seulement** après le webhook |

Le suivi passe par un abonnement Realtime sur la ligne `payments`,
pas par un sondage : le parent est souvent sur un forfait facturé à
la donnée. Au bout de cinq minutes sans réponse, l'écran cesse
d'attendre et renvoie vers l'historique plutôt que de tourner
indéfiniment.

La lecture de l'échéance se fait **sous l'identité du parent** : RLS
vérifie le rattachement parent-enfant. Le mode « Caisse École »
n'ouvre aucun paiement en ligne — il affiche la marche à suivre au
secrétariat.

**Reste à faire** : `payments.tsx` (la liste) lit encore Firestore et
ne dispose donc pas d'`installmentId`. Le lien vers cet écran sera
posé au moment de la bascule de la verticale Finance, qui vient en
dernier dans l'ordre de migration.

### `direction---validation` → `apps/mobile/src/app/(direction)/validation.tsx`

Refait à l'identique, branché sur Supabase via `useValidationQueue`.

C'est le seul écran où une décision **engage l'établissement** : signer
un bulletin le rend opposable, signer un certificat produit une pièce
qui servira à obtenir un visa. L'écran est donc fait pour aller vite
sans signer à l'aveugle :

- Les anomalies sont **calculées** et posées sur la carte : moyenne
  générale absente, décision de conseil vide, absences nombreuses.
- « Valider tout » ne porte que sur les bulletins sans anomalie. Un
  bandeau dit combien restent à examiner et pourquoi ils sont exclus.
- Un rejet **exige un motif** d'au moins cinq caractères : renvoyer un
  bulletin sans dire quoi corriger fait perdre une journée à l'enseignant.
- La pastille de moyenne prend son ton des seuils de l'école
  (`grading_rules`), pas de valeurs codées en dur : un établissement
  peut placer le tableau d'honneur à 15 plutôt qu'à 14.
- Realtime sur les deux tables : la file bouge pendant qu'on la traite
  — un DE peut soumettre un bulletin au moment où le directeur signe.

Signer **ne publie pas**. La publication est un geste distinct, car
c'est elle qui rend le bulletin visible aux familles (§13.3).

**Manque comblé au passage** : la maquette montrait « Certificat de
Scolarité · Junior Bantsimba · Demandé par Parent · Motif : Visa
Ambassade ». Le schéma savait stocker un document *produit*, pas la
*demande* qui le précède — or c'est elle qui remplit la file du
directeur. D'où la migration `014_document_requests.sql` :
`document_requests`, son historique d'états, les modèles de documents
par école, et une vue `validation_queue` qui réunit bulletins et
documents dans une seule file triée par urgence.

### Les quatre tableaux de bord

| Maquette | Fichier | Ce que l'écran décide |
|---|---|---|
| `direction---dashboard` | `(direction)/index.tsx` | État de synchronisation **avant** les chiffres : un tableau alimenté par des données non parties induirait en erreur |
| `direction---web-dashboard` | `web/pages/direction/OverviewPage.tsx` | Répartition par sexe et niveau (exigée §20.2), recouvrement rapporté au facturé, bulletins listés par classe avec leur contrôleur |
| `eleve---dashboard` | `(student)/index.tsx` | Rang masqué par défaut (§15.7), moyenne visible seulement après publication (§13.3) |
| `parent---dashboard` | `(parent)/index.tsx` | Solde en tête quand il y en a un — c'est ce qui déclenche l'action ; sélecteur d'enfant issu de `student_guardians` |

**La règle qui les gouverne tous : aucun chiffre inventé.** Une donnée
manquante s'affiche « — », jamais zéro. Un taux d'assiduité à 0 % parce
que l'appel n'a pas encore eu lieu ferait croire à une désertion
générale ; le tableau de bord direction ajoute même « Appel non
commencé » sous le tiret, sans quoi le directeur conclut à une panne.

Deux conséquences moins visibles :

- **Les compteurs sont des comptages.** `head: true` évite de rapatrier
  842 lignes pour en afficher le nombre.
- **Le sélecteur d'enfant du parent a changé de source.** Il lisait
  `profiles.children` (JSONB déprécié) ; il lit désormais
  `student_guardians`. Un tableau JSON ne porte aucune contrainte : un
  rattachement erroné exposait le dossier d'un enfant à la mauvaise
  famille. Le hook n'applique aucun filtre — RLS ne renvoie que les
  enfants rattachés (§26).

Le `ChildSwitcher` a été retiré de l'en-tête parent : l'accueil porte
désormais son propre rail de cartes, conformément à la maquette. Deux
sélecteurs pour un même choix auraient été un doublon.

### Écrans secondaires

Sans maquette : composés avec le design system, mais chacun corrige un
défaut de l'écran qu'il remplace.

| Écran | Fichier | Ce qui a changé |
|---|---|---|
| Saisie flash des notes | `(teacher)/grades-flash.tsx` | Données de démo en dur → évaluations réelles. Pavé numérique fixe, barème contrôlé à la frappe, distinction « saisi » / « envoyé » |
| Guichet d'encaissement | `(direction)/caisse.tsx` | **Le nom d'élève se tapait à la main** : l'argent entrait, le solde ne bougeait pas. Recherche réelle, échéance choisie, session de caisse ouverte/fermée |
| Emploi du temps | `WeekScheduleView` + 2 écrans | Grille partagée prof/élève, remplacements et annulations fusionnés dans la journée |

**La saisie flash** : le professeur corrige 42 copies puis saisit d'une
traite, souvent sans réseau. Le pavé est fixe — pas de clavier système
qui masque la liste, pas de champ à viser. Une frappe qui dépasserait le
barème est refusée sur le coup plutôt que rejetée à la validation. Un
point ambre marque les notes saisies mais pas encore envoyées : c'est la
distinction §19.3 entre « saisi » et « enregistré ».

**Le guichet** est celui qui portait le défaut le plus coûteux. On
tapait le nom de l'élève, on saisissait un montant, et rien ne reliait
l'encaissement à une facture. Un parent pouvait payer et rester marqué
« en retard ». Désormais : recherche par nom ou matricule avec le solde
affiché, choix de l'échéance, et c'est le trigger `on_payment_success`
qui met à jour tranche puis facture. Le numéro de reçu vient de la base
(`next_receipt_num`) — un compteur client produirait des doublons dès
que deux guichets encaissent ensemble.

La caisse s'ouvre sur un fond de tiroir déclaré et se ferme sur un
comptage physique (§14.3). L'écart est constaté, pas dissimulé : le
caissier déclare ce qu'il a compté, la base calcule la différence.

**L'emploi du temps** affiche une journée à la fois : sur un téléphone,
six colonnes rendent les libellés illisibles. Les remplacements et
annulations sont fusionnés dans la grille — un élève qui lit un créneau
annulé se déplace pour rien.

---

## 4. Ce qui a été fait

- Tokens couleur, typographie, formes — web et mobile
- Échelles Tailwind remappées : les écrans existants ont changé d'identité
- Polices Manrope + Inter embarquées côté mobile
- Icônes Solar via Iconify, avec un catalogue nommé par rôle métier
- Composants web : `Card`, `StatCard`, `SectionHeader`, `AlertRow`, `EmptyState`, `Button`, `Badge`, `Input`, `Icon`
- Composants mobile : `Card`, `StatTile`, `SectionHeader`, `AlertRow`, `Chip`, `SyncBanner`, `Rail`, `Button`, `EmptyState`
- Sidebar web refaite d'après la maquette : groupes métier, contexte
  actif année/trimestre, compteurs de charge

## 5. Ce qui reste

- Brancher les compteurs de la Sidebar sur des requêtes réelles
- Brancher la liste `payments.tsx` sur `installments` (verticale Finance)
- Reprendre les derniers écrans : cours et cahier de texte, exercices,
  carnet de notes, annonces, discipline — ils ont la bonne palette,
  pas encore la bonne composition

## 6. Règles à tenir

**Ne pas inventer de couleur.** Si un besoin n'entre pas dans les cinq
rôles (primary, secondary, accent, destructive, muted), c'est que la
sémantique est à revoir, pas la palette.

**Le ton porte le sens.** Teal = validé. Ambre = en attente. Rouge = en
retard ou grave. Un utilisateur doit pouvoir lire un écran à la couleur
avant de lire le texte.

**Manrope pour ce qui compte.** Titres, montants, noms. Inter pour le
reste. Un montant en Inter passe inaperçu.

**Les états explicites sont obligatoires** (§23) : chargement, vide,
hors ligne, erreur, synchronisation, validation en attente. `EmptyState`
existe des deux côtés pour cette raison.
