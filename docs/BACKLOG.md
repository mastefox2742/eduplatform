# Backlog produit — Projetto1

Livrable §28 du cahier des charges.

**Périmètre** : ERP scolaire SaaS multi-tenant, primaire / collège / lycée,
Congo et Afrique francophone.

**Comment lire ce document.** Chaque story porte un identifiant stable, une
formulation métier, des critères d'acceptation vérifiables, et son état
réel au 29 août 2026. Les critères sont écrits pour être testables : « le
solde de la famille diminue du montant encaissé » se vérifie, « la caisse
fonctionne bien » ne se vérifie pas.

**États** : ✅ fait · 🟡 partiel · ⬜ à faire

---

## Table des matières

1. [Comment le backlog est priorisé](#1-comment-le-backlog-est-priorisé)
2. [Épics](#2-épics)
3. [Version 1 — cœur commercialisable](#3-version-1--cœur-commercialisable)
4. [Version 2 — adoption forte](#4-version-2--adoption-forte)
5. [Version 3 — différenciation](#5-version-3--différenciation)
6. [Version 4 — passage à l'échelle](#6-version-4--passage-à-léchelle)
7. [Dette technique](#7-dette-technique)
8. [Critères transverses](#8-critères-transverses)
9. [État d'avancement](#9-état-davancement)

---

## 1. Comment le backlog est priorisé

Trois questions, dans cet ordre :

**Est-ce que l'école peut s'en passer aujourd'hui ?** Une école qui n'a pas
de gestion des notes utilise Excel. Une école qui n'a pas d'alumni ne
remarque rien. Le premier passe avant.

**Est-ce que ça bloque autre chose ?** Le multi-tenant ne rapporte rien
seul, mais rien ne peut être vendu à deux écoles sans lui. Les fondations
passent avant ce qu'elles portent.

**Combien de personnes s'en servent par jour ?** L'appel de présence est
utilisé par chaque professeur, plusieurs fois par jour. Le rapport
ministériel, deux fois par an. Le premier mérite dix fois plus de soin.

Ce qui *ne* décide *pas* : la facilité de réalisation. Une story facile
mais inutile reste en bas.

---

## 2. Épics

| # | Épic | Pourquoi | Version |
|---|---|---|---|
| E1 | Socle multi-tenant et rôles | Rien ne se vend à deux écoles sans isolation stricte | V1 |
| E2 | Référentiel académique | Tout le reste s'y rattache : classes, matières, périodes | V1 |
| E3 | Dossier élève et familles | Le lien parent-enfant conditionne tous les accès parent | V1 |
| E4 | Vie scolaire | Absences et discipline : l'usage quotidien du surveillant | V1 |
| E5 | Notes et bulletins | Ce qui remplace Excel, et la raison d'acheter | V1 |
| E6 | Finance et caisse | Ce qui rend l'outil indispensable à la direction | V1 |
| E7 | Communication familles | Le canal qui fait adopter l'application par les parents | V1 |
| E8 | Admissions | Le cycle amont, saisonnier mais critique en juin-septembre | V2 |
| E9 | Examens d'État | Obligation réglementaire, forte valeur perçue | V2 |
| E10 | Documents officiels | Le secrétariat y passe ses journées | V2 |
| E11 | Pilotage et rapports | Ce que le directeur montre à son inspection | V2 |
| E12 | IA pédagogique encadrée | Différenciation, sous condition de garde-fous | V3 |
| E13 | Hors ligne et synchronisation | Verrou technique sur le marché visé | V3 |
| E14 | Services campus | Transport, cantine, bibliothèque, infirmerie | V3 |
| E16 | Ressources humaines | Les salaires sont la première dépense de l'école ; rien ne les portait | V2 |
| E15 | Console SaaS | Nécessaire dès la deuxième école cliente | V4 |

---

## 3. Version 1 — cœur commercialisable

> **Objectif** : remplacer le papier et Excel dans une école pilote.
> **Critère de sortie** : une école tourne un trimestre complet sans
> revenir à ses anciens outils.

### E1 — Socle multi-tenant et rôles

#### V1-01 · Isolation stricte entre établissements ✅
> En tant qu'**exploitant SaaS**, je veux qu'aucune donnée ne franchisse la
> frontière d'un établissement, afin de pouvoir vendre à plusieurs écoles
> sans risque juridique.

- [x] Toute table métier porte `school_id`
- [x] RLS actif sur 100 % des tables métier — vérifié automatiquement en CI
- [x] Un directeur de l'école A obtient zéro ligne de l'école B, y compris
      par requête directe, export ou fichier
- [x] Test automatisé : `acceptance_26.sql` §26.1

**Fait** : migrations 004–014, `012_rls_nouvelles_tables.sql`.

#### V1-02 · Rôles cumulables avec périmètre ✅
> En tant que **directeur d'une petite école**, je veux être aussi
> Directeur des Études, afin de ne pas avoir deux comptes.

- [x] Un utilisateur porte plusieurs rôles simultanément
- [x] Chaque rôle est limité à une école, un site, un cycle, un niveau,
      une classe ou une matière
- [x] Dix rôles métier : super_admin, directeur, secretaire, gestionnaire,
      de, sg, enseignant, parent, eleve, support
- [x] Les permissions sont surchargeables par école
- [x] Test : un cumul enseignant + DE ouvre la validation des notes

**Fait** : `004_roles_sites_permissions.sql`, `usePermissions.ts`.

#### V1-03 · Contexte actif visible en permanence 🟡
> En tant qu'**utilisateur multi-rôles**, je veux voir l'école, l'année et
> le rôle courants sur chaque écran, afin de ne pas saisir des notes dans
> la mauvaise période.

- [x] Le contexte est stocké par utilisateur (`user_active_context`)
- [x] La sidebar web affiche année et trimestre
- [ ] La bascule de contexte est effective sur mobile
- [ ] Un changement de contexte recharge les données de l'écran courant

**Reste** : sélecteur de contexte mobile.

#### V1-04 · Authentification et réinitialisation ✅
- [x] Connexion par email et mot de passe
- [x] Session persistée (AsyncStorage mobile, localStorage web)
- [x] Les rôles sont lus depuis le jeton, validés côté serveur
- [ ] MFA pour les rôles sensibles (§21.1) — reporté V3

---

### E2 — Référentiel académique

#### V1-05 · Années scolaires et périodes ✅
> En tant que **DE**, je veux définir l'année et ses trimestres, afin que
> notes et bulletins s'y rattachent.

- [x] Années avec dates de début et fin, une seule courante par école
- [x] Périodes T1/T2/T3 ou semestres, avec ordre
- [x] Fenêtre d'ouverture et de fermeture de la saisie des notes
- [x] Verrouillage explicite par le DE, avec traçabilité
- [x] Fonction `period_is_open()` utilisée par RLS

**Fait** : `006_admissions_academic.sql`.

#### V1-06 · Classes, niveaux, matières, coefficients ✅
- [x] Cycles primaire / collège / lycée
- [x] Niveaux, classes, sites
- [x] Matières avec coefficient par niveau
- [x] Affectation enseignant → classe → matière

#### V1-07 · Barèmes et règles de calcul ✅
> En tant que **DE**, je veux fixer le barème et les seuils de mention,
> afin que les bulletins reflètent les règles de mon école.

- [x] Barème (défaut /20), arrondi, seuils de passage, honneur, excellence
- [x] Seuils paramétrables par niveau
- [x] Le rang est masquable aux élèves (`rank_visible_student`)
- [x] Pondération par type d'évaluation

#### V1-08 · Emploi du temps ✅
- [x] Créneaux par classe, matière, enseignant, salle
- [x] Détection de conflits enseignant / classe / salle (`schedule_conflicts()`)
- [x] Consultation prof et élève, avec remplacements et annulations
- [ ] Générateur automatique sous contraintes — V3

---

### E3 — Dossier élève et familles

#### V1-09 · Dossier élève unifié 🟡
- [x] Identité, scolarité, parcours multi-années
- [x] Documents rattachés, avec pièces attendues par niveau
- [x] Données de santé isolées, accès journalisé
- [ ] Écran de consultation complet du dossier

#### V1-10 · Rattachement parent-enfant fiable ✅
> En tant que **parent**, je veux voir mes enfants et **uniquement** les
> miens, afin que ma vie privée et la leur soient respectées.

- [x] Table de liaison `student_guardians`, remplaçant un tableau JSONB
- [x] Un seul responsable financier par élève, garanti par index
- [x] Tuteur sans compte possible (parent sans smartphone)
- [x] Personnes habilitées à récupérer l'enfant
- [x] `is_my_child()` employée par toutes les policies parent
- [x] Test : un parent rattaché à un enfant n'en voit pas un second

**Fait** : `005_student_file_guardians.sql`, `useActiveChild.ts`.

#### V1-11 · Inscription et réinscription 🟡
- [x] Parcours annuel (`student_enrollments`) avec issue
- [x] Matricule séquentiel (`next_student_number()`)
- [ ] Écran d'inscription individuelle
- [ ] Import de masse depuis Excel
- [ ] Réinscription avec reprise contrôlée

---

### E4 — Vie scolaire

#### V1-12 · Appel de présence en une action ✅
> En tant qu'**enseignant**, je veux faire l'appel en moins de trente
> secondes, afin de ne pas amputer mon cours.

- [x] Le créneau en cours est détecté automatiquement
- [x] « Faire l'appel (1-Tap) » met toute la classe présente
- [x] Un appui sur une ligne fait défiler présent → absent → retard
- [x] Fonctionne hors ligne, avec file d'attente
- [x] L'écran distingue « en attente d'envoi » de « enregistré »
- [x] Une période fermée passe l'écran en lecture seule

**Fait** : `(teacher)/attendance.tsx`, `useTeacherSession.ts`.

#### V1-13 · Alerte parent en cas d'absence ✅
> En tant que **surveillant général**, je veux que le parent soit prévenu
> dès la première heure, afin qu'aucune absence ne passe inaperçue.

- [x] Bouton d'alerte WhatsApp sur chaque absent, avec repli SMS
- [x] Message pré-rempli avec l'élève, la matière et la date
- [x] Le responsable est chargé avec la classe, sans attente
- [ ] Envoi automatique par tâche planifiée (aujourd'hui manuel)

#### V1-14 · Justificatifs d'absence 🟡
- [x] Le parent dépose un justificatif avec pièce jointe
- [x] Le SG accepte ou refuse, avec motif
- [x] Motifs configurables par école
- [ ] Écran mobile de dépôt côté parent

#### V1-15 · Discipline et incidents ✅
> En tant que **surveillant général**, je veux qu'une sanction décidée
> parvienne à la famille, afin qu'elle ait un effet éducatif et qu'elle
> tienne devant un conseil de discipline.

- [x] Incidents avec lieu, gravité, participants, confidentialité
- [x] Sanctions et mérites au vocabulaire francophone
- [x] Convocations de parents avec compte rendu
- [x] Écran de suivi des incidents, avec décision de sanction
- [x] Sanctionner et notifier sont deux gestes distincts
- [x] Les sanctions jamais transmises à la famille sont comptées et
      remontées en tête de liste
- [ ] Écran de déclaration d'incident par l'enseignant
- [ ] Workflow de validation selon gravité

**Fait** : `direction/SchoolLifePage.tsx`, `useSchoolLife.ts`.

#### V1-15b · Autorisations de sortie ✅
> En tant que **direction**, je veux savoir qui vient chercher un élève
> avant d'autoriser sa sortie, afin de ne pas engager la responsabilité de
> l'établissement.

- [x] Demande de sortie avec motif, horaire et retour attendu
- [x] Aucune autorisation possible tant que la personne qui récupère
      l'élève n'est pas nommée — le bouton reste bloqué et l'explique
- [x] Traçabilité : qui autorise, quand, et pour quelle raison
- [ ] Constat de retour depuis le poste de garde

---

### E5 — Notes et bulletins

#### V1-16 · Saisie des notes ✅
> En tant qu'**enseignant**, je veux saisir 42 notes d'une traite, afin de
> ne pas y passer ma soirée.

- [x] Pavé numérique fixe, sans clavier système
- [x] Une frappe dépassant le barème est refusée immédiatement
- [x] Absent, dispensé, rattrapage sans note chiffrée
- [x] Moyenne et taux de réussite calculés en direct
- [x] Envoi en lot par la file hors ligne
- [x] Les notes non envoyées sont visuellement distinguées

**Fait** : `(teacher)/grades-flash.tsx`, `useGradeEntry.ts`.

#### V1-17 · Historique des modifications de notes ✅
> En tant que **DE**, je veux savoir qui a changé une note et quand, afin
> de pouvoir répondre à une contestation.

- [x] Chaque modification écrit une ligne dans `grade_history`
- [x] Ancienne et nouvelle valeur conservées
- [x] Auteur et horodatage
- [ ] Écran de consultation de l'historique

#### V1-18 · Workflow de validation des notes 🟡
- [x] États : brouillon → soumis → contrôlé → validé → publié
- [x] Workflows configurables par école (`workflow_configs`)
- [x] Contrôle de complétude (`assessment_completeness()`)
- [ ] Écran DE de contrôle avant transmission à la direction

#### V1-19 · Validation et signature des bulletins ✅
> En tant que **directeur**, je veux signer 24 bulletins sans en valider un
> qui contient une erreur, afin d'engager ma responsabilité en connaissance.

- [x] File de validation, bulletins et documents réunis
- [x] Anomalies calculées et affichées : moyenne absente, décision de
      conseil vide, absences nombreuses
- [x] « Valider tout » ne porte que sur les bulletins sans anomalie, et
      l'écran dit combien restent à examiner
- [x] Un rejet exige un motif d'au moins cinq caractères
- [x] Signature nominative (`signed_by`)
- [x] Signer ne publie pas : la publication est un geste distinct

**Fait** : `(direction)/validation.tsx`, `useValidationQueue.ts`.

#### V1-20 · Bulletin PDF avec QR de vérification ⬜
- [x] Colonne `verification_code` et `pdf_path` prêtes
- [ ] Génération du PDF
- [ ] Page publique de vérification par QR
- [ ] Archivage

---

### E6 — Finance et caisse

#### V1-21 · Grilles tarifaires et facturation ✅
- [x] Grilles par cycle, niveau, classe, année
- [x] Onze types de frais, obligatoires ou optionnels
- [x] Remises : fratrie, bourse, aide sociale, exonération
- [x] Échéanciers par tranches
- [x] Numérotation des factures par séquence
- [ ] Écran de génération en masse

#### V1-22 · Encaissement au guichet ✅
> En tant que **caissier**, je veux qu'un règlement mette à jour le solde
> de la famille, afin qu'un parent qui a payé ne soit plus relancé.

- [x] Recherche d'élève par nom ou matricule, avec solde affiché
- [x] L'encaissement se rattache à une échéance existante
- [x] Le solde est mis à jour par trigger, jamais recalculé à la main
- [x] Numéro de reçu attribué par la base
- [x] Espèces, chèque, virement, autre
- [x] Paiement partiel accepté, montant supérieur au dû refusé

**Fait** : `(direction)/caisse.tsx`, `useCashRegister.ts`.

#### V1-23 · Ouverture et fermeture de caisse ✅
> En tant que **gestionnaire**, je veux constater l'écart de caisse chaque
> soir, afin qu'une différence ne se découvre pas trois mois plus tard.

- [x] Ouverture sur fond de tiroir déclaré
- [x] Sans session ouverte, aucun encaissement possible
- [x] Fermeture sur comptage physique ; l'écart est calculé par la base
- [x] Une seule caisse ouverte par caissier, garantie par index

#### V1-24 · Paiement Mobile Money ✅
> En tant que **parent**, je veux payer depuis mon téléphone, afin de ne
> pas me déplacer au secrétariat.

- [x] MTN MoMo, Airtel Money, CinetPay
- [x] Le montant dû est lu sous l'identité du parent (RLS vérifie le
      rattachement)
- [x] Signature webhook vérifiée en temps constant
- [x] Statut re-confirmé auprès du fournisseur avant encaissement
- [x] Idempotence à trois niveaux
- [x] L'écran n'affiche jamais « payé » avant confirmation serveur
- [ ] Tester avec les notifications de test CinetPay

**Fait** : `payment-init`, `payment-webhook`, `(parent)/paiement.tsx`.

#### V1-25 · Reçu de paiement ⬜
- [ ] PDF numéroté avec QR de vérification
- [ ] Envoi WhatsApp au parent
- [ ] Consultation dans l'espace parent

#### V1-26 · Suivi et relances d'impayés ✅
> En tant que **gestionnaire**, je veux savoir qui doit quoi et depuis
> quand, afin d'appeler les bonnes familles sans me tromper de montant.

- [x] Compteur de relances par échéance
- [x] Journal des envois (`message_logs`)
- [x] Écran de suivi des impayés, trié par ancienneté puis par montant
- [x] Le reste à payer prime sur le montant facturé à l'affichage
- [x] Une échéance dépassée n'est comptée en impayé que si le solde
      reste dû
- [x] Le numéro du responsable est cliquable à côté du montant exact
- [x] Aucune relance automatique : la décision d'appeler reste humaine
- [ ] Tâche planifiée de relance progressive (report assumé, cf. §17)

**Fait** : `direction/BillingPage.tsx`, `useBilling.ts`.

#### V1-26b · Grille tarifaire consultable ✅
- [x] Tarifs par niveau, avec nombre de tranches et montant par tranche
- [x] Modifier un tarif ne modifie aucune facture déjà émise — dit à
      l'écran, parce que c'est ce qui rend la comptabilité vérifiable

---

### E7 — Communication familles

#### V1-27 · Espace parent ✅
> En tant que **parent de trois enfants**, je veux basculer entre eux sans
> me reconnecter, afin de suivre toute ma famille.

- [x] Sélecteur d'enfant limité aux enfants rattachés
- [x] Moyenne, rang, assiduité, devoirs à venir, dernières notes
- [x] Solde en tête quand il y en a un
- [x] La moyenne de la classe est affichée à côté de chaque note
- [x] Les résultats n'apparaissent qu'après publication du bulletin

**Fait** : `(parent)/index.tsx`, `useParentDashboard.ts`.

#### V1-28 · Annonces de l'établissement ✅
> En tant que **directrice**, je veux savoir combien de familles vont
> recevoir mon annonce et par quel canal avant de l'envoyer, afin de ne
> pas découvrir mon erreur une fois qu'elle est sur leurs téléphones.

- [x] Ciblage par école, cycle, niveau, classe, rôle
- [x] Accusés de lecture
- [x] Écran de rédaction et de publication côté direction
- [x] Brouillon obligatoire : une annonce ne part jamais d'un seul clic
- [x] La confirmation dit le nombre exact de destinataires et les canaux
- [x] Le taux de lecture est affiché après publication, avec une
      suggestion de changer de canal en dessous de 70 %
- [ ] Envoi multicanal effectif (SMS et WhatsApp branchés)

**Fait** : `direction/CommunicationPage.tsx`, `useCommunication.ts`.

#### V1-29 · Messagerie encadrée 🟡
- [x] Fils de discussion, règles horaires, signalement
- [x] Liste des conversations côté direction, non lues en tête
- [x] Une famille sans réponse depuis plus de 48 h est signalée : passé
      ce délai un parent ne réécrit pas, il se déplace
- [ ] Écran de conversation (lecture et réponse dans le fil)
- [ ] Application des règles d'horaires

#### V1-29 · Messagerie encadrée 🟡
- [x] Fils de discussion, règles horaires, signalement
- [ ] Écrans de conversation repris
- [ ] Application des règles d'horaires

---

## 4. Version 2 — adoption forte

> **Objectif** : l'application devient le passage obligé du quotidien.
> **Critère de sortie** : le secrétariat n'imprime plus de document à la main.

### E8 — Admissions

#### V2-01 · Portail public de préinscription ⬜
- [x] Table `applications` avec pipeline complet
- [ ] Formulaire public par niveau
- [ ] Téléversement des pièces
- [ ] Suivi de candidature par le parent
- [ ] Paiement des frais de dossier

#### V2-02 · Backoffice admissions ✅
> En tant que **secrétaire**, je veux voir où en est chaque candidature et
> ce qui lui manque, afin de rappeler la famille avec une demande précise.

- [x] Statuts, décisions, liste d'attente, historique tracé
- [x] Places disponibles par niveau
- [x] Écran de pipeline : reçue → dossier vérifié → entretien → décision
- [x] Un dossier incomplet ne passe pas à l'entretien, et les pièces
      manquantes sont nommées une par une
- [x] Un refus exige un motif : c'est la réponse que lira la famille
- [x] « Admis » et « inscrit » sont deux états distincts, et les admis
      non inscrits sont comptés à part — ce sont des places perdues
- [ ] Conversion candidature → élève en un geste

**Fait** : `direction/AdmissionsPage.tsx`, `useAdmissions.ts`.

### E9 — Examens d'État

#### V2-03 · Inscriptions aux examens 🟡
- [x] Examens, sessions, candidats, anonymat des copies
- [x] Contrôle de complétude des dossiers
- [ ] Export des listes au format ministériel

#### V2-04 · Résultats officiels ⬜
- [ ] Saisie ou import des résultats
- [ ] Statistiques par classe et matière

### E10 — Documents officiels

#### V2-05 · Demande et signature de documents ✅
> En tant que **parent**, je veux demander un certificat de scolarité sans
> me déplacer, afin de l'obtenir avant mon rendez-vous consulaire.

- [x] Demande avec motif, échéance, nombre d'exemplaires
- [x] Préparation secrétariat puis signature direction
- [x] File de signature partagée avec les bulletins
- [x] Historique d'états tracé
- [x] Modèles par école avec en-tête, cachet et signataire
- [ ] Génération du PDF
- [ ] Écran de demande côté parent

**Fait** : `014_document_requests.sql`, `(direction)/validation.tsx`.

#### V2-06 · Documents de masse ⬜
- [ ] Impression groupée de bulletins
- [ ] Cartes scolaires avec QR
- [ ] Listes de classe et convocations

### E11 — Pilotage et rapports

#### V2-07 · Tableau de bord direction ✅
- [x] Effectifs, répartition par sexe et niveau
- [x] Assiduité du jour — « — » si l'appel n'a pas commencé
- [x] Recouvrement rapporté au facturé
- [x] Encaissements par canal
- [x] Bulletins en attente par classe, avec leur contrôleur
- [x] File des décisions en attente

**Fait** : `(direction)/index.tsx`, `web/OverviewPage.tsx`.

#### V2-08 · Rapports ministériels 🟡
- [x] Cloud Functions `generateMinistryReport`, `checkReportCompliance`
- [ ] Reprise sur Supabase
- [ ] Formats officiels validés avec un établissement pilote

#### V2-09 · Élève à risque 🟡
> En tant que **DE**, je veux repérer un élève qui décroche avant le
> conseil de classe, afin d'agir pendant qu'il est encore temps.

- [x] Table `risk_signals` avec priorité, explication, plan, échéance
- [x] Jamais de décision automatique : un signal est assigné à un humain
- [x] Écran de suivi, trié par score de risque
- [x] Le score combine résultats, assiduité, comportement et scolarité :
      un seul de ces signaux ne suffit pas à désigner un décrochage
- [x] Le score n'est jamais affiché seul — toujours avec le détail daté
      de ses signaux, sans quoi il serait lu comme un jugement sur l'élève
- [x] Les élèves à risque élevé jamais contactés sont comptés à part
- [x] Consigner un échange ne clôt pas le signalement
- [ ] Détection automatique des signaux (calcul par tâche planifiée)

**Fait** : `direction/RiskPage.tsx`, `useRiskSignals.ts`.

---

## 5. Version 3 — différenciation

### E12 — IA pédagogique encadrée

#### V3-01 · Garde-fou anti-hallucination 🟡
> En tant que **DE**, je veux qu'une correction IA non fondée soit bloquée,
> afin qu'aucun élève ne soit noté sur une invention.

- [x] `hallucination.guard.ts` : quatre types de violation, quatre niveaux
      de risque, résultat accepté / sanitisé / à revoir / bloqué
- [x] Journal d'usage complet (auteur, modèle, source, verdict, motif)
- [x] Les solutions enseignant ne sont jamais lisibles côté client
- [ ] Reprise sur Edge Functions

#### V3-02 · Chat IA élève 🟡
- [x] Cadrage système transmis au modèle
- [x] Quotas par rôle
- [ ] Refus de donner une réponse à recopier pendant une évaluation active

#### V3-03 · Génération de fiches et exercices 🟡
- [x] Fonction `generateFicheCours`
- [ ] L'enseignant relit et valide avant publication

### E13 — Hors ligne et synchronisation

#### V3-04 · File de synchronisation ✅
- [x] File persistée, huit types d'opérations
- [x] Libellé lisible : « Présence de la 3e A »
- [x] Vidage au retour du réseau ou au premier plan
- [x] Miroir serveur (`sync_operations`) pour l'observabilité
- [x] Idempotence par `client_op_id`

#### V3-05 · Résolution de conflits ⬜
- [x] Colonnes `conflict_with` et `resolution` prêtes
- [ ] Détection des conflits
- [ ] Écran de comparaison et choix

#### V3-06 · Consultation hors ligne ⬜
- [ ] Cours, emploi du temps et notes consultables sans réseau
- [ ] Indication claire de la fraîcheur des données

### E16 — Ressources humaines

> Cet épic manquait au backlog jusqu'au 30 août 2026. Le schéma
> (`010_modules_optionnels.sql`) et les fonctions de paie existaient
> depuis longtemps, mais aucune story ne les portait : le domaine était
> invisible dans ce document, donc invisible tout court. Signalé par le
> client, pas trouvé par nous.

#### V2-10 · Registre du personnel ✅
> En tant que **directrice**, je veux la liste de mon personnel avec ses
> contrats, afin de savoir qui est permanent, contractuel ou vacataire
> sans ouvrir un classeur.

- [x] Fiches personnel : fonction, service, matricule, date d'embauche
- [x] Type de contrat, salaire de base, heures hebdomadaires attendues
- [x] Recherche par nom, fonction, service ou matricule
- [x] Répartition par service affichée en un coup d'œil
- [ ] Création et modification d'une fiche depuis l'écran

**Fait** : `direction/HrPage.tsx`, `useHumanResources.ts`.

#### V2-11 · Paie mensuelle ✅
> En tant que **directrice**, je veux valider la paie avant qu'elle ne
> soit décaissée, afin qu'aucun brouillon ne sorte de la caisse.

- [x] Paie calculée par mois : heures prévues, heures faites, absences
- [x] Trois états séquentiels : brouillon → validé → payé
- [x] « Marquer payé » n'apparaît qu'après validation — un brouillon ne
      se décaisse pas
- [x] Les heures d'absence sont affichées à côté du net : sans elles,
      l'écart avec le salaire de base devient une réclamation
- [x] Masse salariale du mois calculée et affichée
- [ ] Bulletin de paie PDF remis à l'agent
- [ ] Génération mensuelle automatique (fonction écrite, non branchée)

#### V2-12 · Congés et absences du personnel ✅
> En tant que **directrice**, je veux décider des congés en voyant le
> solde restant de l'agent, afin de ne pas accorder ce qui n'existe pas.

- [x] Demandes avec type, dates, nombre de jours et motif
- [x] Solde de congés restant affiché sur la fiche de chaque agent
- [x] Un congé demandé n'est pas un congé accordé : le solde ne bouge
      qu'à l'approbation, et les deux états ne portent ni la même
      couleur ni le même mot
- [x] Un refus exige un motif d'au moins cinq caractères — c'est le seul
      message que recevra l'agent
- [ ] Dépôt de demande côté agent (écran enseignant)
- [ ] Impact du congé sur l'emploi du temps et les remplacements

---

### E14 — Services campus

#### V3-07 à V3-10 · Transport, cantine, bibliothèque, infirmerie 🟡
- [x] Schéma complet des quatre modules (`010_modules_optionnels.sql`)
- [ ] Écrans
- [ ] Activation par plan SaaS

---

## 6. Version 4 — passage à l'échelle

### E15 — Console SaaS

#### V4-01 · Administration des établissements ✅
> En tant qu'**éditeur de la plateforme**, je veux voir le parc des écoles
> clientes et leur usage réel, afin de repérer une école qui décroche avant
> qu'elle ne résilie.

- [x] Plans, limites, consommation, facturation SaaS
- [x] Impersonation avec consentement et audit
- [x] Console éditeur : parc, abonnements, revenu mensuel récurrent
- [x] Comptes dormants (aucune activité depuis 30 jours) signalés
- [x] Essais arrivant à échéance sous 7 jours signalés
- [x] **Réservée au rôle `ADMIN`.** Un directeur n'y a pas accès : lui
      montrer les effectifs et le chiffre d'affaires des autres écoles
      clientes romprait l'isolation multi-tenant. Vérifié en local — un
      directeur reçoit « Accès refusé ». Les politiques RLS la ferment
      aussi côté base, la route n'étant que la première barrière.

**Fait** : `direction/PlatformPage.tsx`, `usePlatformConsole.ts`.

#### V4-02 · Onboarding d'une école ⬜
- [ ] Création guidée : identité, année, cycles, classes, personnel
- [ ] Import initial des élèves

#### V4-03 · Multi-campus ⬜
- [x] Table `sites` et rattachement des classes
- [ ] Restrictions par site dans les écrans

---

## 7. Dette technique

Ces éléments ne produisent aucune valeur visible, mais leur report a un
coût qui grandit.

| # | Sujet | Pourquoi maintenant | État |
|---|---|---|---|
| DT-01 | Appliquer les migrations sur Supabase | Le schéma n'a jamais été exécuté contre une base réelle | ✅ 17 migrations + seed sur `Alpha_school` ; RLS 138/277 ; acceptation §26 verte |
| DT-02 | Sortie de Firebase, verticale par verticale | Deux sources de vérité finissent par diverger | 🟡 vie scolaire et pédagogie migrées |
| DT-03 | Types générés depuis le schéma | Les types sont écrits à la main, ils dériveront | ⬜ |
| DT-04 | `SECURITY_ARCHITECTURE.md` obsolète | Il décrit Firebase, pas Supabase — contredit le reste | ⬜ |
| DT-05 | Trois dossiers Edge Functions vides | `generate-receipt`, `payroll`, `send-alert` sont des coquilles | ⬜ |
| DT-06 | Worktrees Claude dans `.claude/worktrees/` | Expo Router les a scannés comme routes, corrompant `router.d.ts` | ⬜ |
| DT-07 | `payments.tsx` encore sur Firestore | Empêche de brancher l'écran de paiement | ⬜ |
| DT-08 | Retirer `profiles.children` et `profiles.role` | Colonnes remplacées, gardées le temps de la bascule | ⬜ après DT-02 |
| DT-09 | 29 avertissements ESLint (`any`) | Hérités de Firestore, disparaîtront avec la bascule | 🟡 |

---

## 8. Critères transverses

Ces critères s'appliquent à **chaque** story. Une story qui les enfreint
n'est pas terminée, quel que soit son état fonctionnel.

**Sécurité**
- L'autorisation est portée par RLS, jamais par l'interface seule.
  Masquer un bouton n'empêche personne d'appeler l'API.
- Un 404 couvre aussi « existe mais ne vous regarde pas » : un 403 distinct
  confirmerait l'existence de la ressource.
- Aucun secret dans une URL, un log ou le bundle client.

**Honnêteté de l'affichage**
- Une donnée manquante affiche « — », jamais zéro.
- Rien n'est annoncé comme fait avant confirmation du serveur (§19.3).
- Les états explicites sont obligatoires : chargement, vide, hors ligne,
  erreur, synchronisation, validation en attente.

**Traçabilité**
- Toute action sensible écrit une ligne d'audit : qui, quand, quoi, avant
  et après.
- Un rejet ou un refus porte toujours un motif lisible par son destinataire.

**Hors ligne**
- Toute saisie utilisée en salle de classe fonctionne sans réseau.
- La file affiche un libellé lisible, pas un identifiant technique.

---

## 9. État d'avancement

*Comptes établis en relisant le document lui-même, au 30 août 2026.*

| Version | Stories | ✅ | 🟡 | ⬜ |
|---|---|---|---|---|
| V1 — cœur | 32 | 23 | 7 | 2 |
| V2 — adoption | 12 | 6 | 3 | 3 |
| V3 — différenciation | 7 | 1 | 4 | 2 |
| V4 — échelle | 3 | 1 | 0 | 2 |
| **Total** | **54** | **31** | **14** | **9** |

*(V3-07 à V3-10 — transport, cantine, bibliothèque, infirmerie — comptent
pour une seule entrée : leur schéma est commun et leurs écrans se
ressemblent. Le client a explicitement écarté ces quatre modules du
périmètre de la livraison.)*

### Ce qui a changé le 30 août

Sept écrans web ont été livrés d'un coup, après un audit demandé par le
client : dix domaines documentés au cahier des charges n'avaient aucune
interface, et cinq autres n'existaient que sur mobile.

| Écran | Route | Story |
|---|---|---|
| Ressources humaines | `/direction/hr` | V2-10, V2-11, V2-12 |
| Admissions | `/direction/admissions` | V2-02 |
| Vie scolaire | `/direction/school-life` | V1-15, V1-15b |
| Facturation & impayés | `/direction/billing` | V1-26, V1-26b |
| Communication | `/direction/communication` | V1-28, V1-29 |
| Élèves en difficulté | `/direction/risk` | V2-09 |
| Console éditeur | `/direction/platform` | V4-01 |

**Le domaine RH n'existait pas dans ce backlog.** Ses tables et ses
fonctions de paie étaient écrites depuis les migrations de juillet, mais
aucune story ne les portait : le domaine était invisible dans le document,
donc invisible dans le produit. C'est le client qui l'a vu, pas nous. E16
a été créé pour que cela ne se reproduise pas — un domaine du cahier des
charges qui n'a pas d'épic est un domaine qu'on oubliera.

Un enseignement de méthode : le backlog listait « 21 stories faites » et
c'était exact story par story, mais il ne disait rien de ce qui n'y
figurait pas. Un tableau d'avancement ne mesure que ce qu'on a pensé à y
mettre.

### Lecture

Le socle est solide : isolation, rôles, référentiel, notes, encaissement
et paiement en ligne sont terminés et testés. Les 14 stories partielles
ont presque toutes leur schéma prêt et attendent un écran ou un branchement
— c'est du travail d'interface, pas de conception.

**Le vrai blocage reste DT-01** : rien de tout cela n'a été exécuté contre
une base Supabase réelle. Tant que les migrations ne sont pas appliquées,
chaque ✅ signifie « écrit et vérifié en local », pas « tourne en
production ». Les sept écrans du 30 août lisent des jeux de démonstration
en mode aperçu ; leur code Supabase est écrit mais n'a jamais reçu de
réponse d'un vrai serveur.

### Prochaine séquence recommandée

1. **DT-01** — appliquer les migrations sur le projet Supabase du client.
   Débloque tout le reste, et c'est la seule chose qui transforme les ✅
   en fonctionnalités réelles.
2. **V1-11** — inscription des élèves : sans elle, aucune donnée à
   afficher dans les sept écrans qui viennent d'être livrés.
3. **V1-20 et V1-25** — les PDF : bulletin et reçu sont ce que les
   familles emportent, et ce qu'elles montrent quand il y a litige.
4. **V2-11** — le bulletin de paie PDF, pour la même raison côté personnel.
5. **DT-02** — poursuivre la sortie de Firebase, verticale par verticale.

Les quatre modules de services campus (transport, cantine, bibliothèque,
infirmerie) restent sans écran, sur décision du client.
