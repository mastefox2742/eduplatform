# Projetto1 — ERP scolaire multi-tenant

Logiciel de gestion pour établissements scolaires du Congo et d'Afrique
francophone. Primaire, collège, lycée. Une seule installation sert
plusieurs écoles, chacune isolée des autres.

Web pour la direction et les enseignants, mobile pour les familles et
les élèves. Conçu pour une connexion instable : la saisie fonctionne
hors ligne et se synchronise ensuite.

---

## Ce que le logiciel fait

| Domaine | Ce qu'il remplace |
|---|---|
| Notes, évaluations, bulletins | Les classeurs Excel du directeur des études |
| Appel de présence | Le cahier d'appel, avec alerte au parent dès la première heure |
| Scolarité et caisse | Le carnet de reçus, avec paiement Mobile Money |
| Admissions | Les dossiers papier de la rentrée |
| Ressources humaines | Contrats, paie mensuelle, congés |
| Vie scolaire | Incidents, sanctions, autorisations de sortie |
| Communication | Les convocations écrites à la main |
| Examens d'État | Les inscriptions et résultats officiels |

Le détail par métier est dans [`docs/utilisateurs/`](docs/utilisateurs/) :
une fiche par rôle, lisible en dix minutes, distribuable telle quelle.

---

## Démarrer

Prérequis : Node 20, pnpm 11.

```bash
pnpm install
```

### Application web

```bash
pnpm --filter @school/web dev
```

Il faut `apps/web/.env.local` avec l'URL du projet Supabase et sa clé
`anon` — voir `apps/web/.env.example`.

**Sans backend**, pour parcourir les écrans avec des données de
démonstration :

```bash
VITE_PREVIEW_MODE=true pnpm --filter @school/web dev
```

Un bandeau permanent rappelle que rien n'est réel. Ce mode est désarmé
en production, sans condition.

### Application mobile

```bash
pnpm --filter @school/mobile start
```

### Base de données

```bash
npx supabase link --project-ref <ref-du-projet>
npx supabase db push
python supabase/seed/seed.py
```

Le seed crée un établissement complet — 24 élèves, quatre classes, la
facturation, un devoir noté. Il est idempotent : relancé, il efface le
précédent avant de reconstruire.

### Vérifications

```bash
pnpm type-check && pnpm lint
```

Les tests unitaires vivent dans le paquet `functions` et se lancent
depuis lui — il n'y a pas de tâche `test` a la racine :

```bash
cd functions && npx jest
```

25 tests, tous verts au 30 aout 2026. C'est peu : la couverture porte
sur le service IA et pas encore sur les regles metier (validation,
paiement, RLS). Le SQL d'acceptation de §26 est dans
`supabase/tests/acceptance_26.sql` et n'a jamais ete execute contre la
base.

---

## Architecture

```
apps/web        React 18 · Vite 6 · Tailwind 3 · React Router · Zustand
apps/mobile     React Native 0.74 · Expo SDK 51 · Expo Router
packages/       types et logique partagés entre les deux
supabase/       migrations SQL, politiques RLS, Edge Functions, seed
functions/      Cloud Functions Firebase — couche serveur historique
design/         maquettes sources et système de design
docs/           backlog, fiches utilisateur
```

Monorepo pnpm + Turborepo, TypeScript strict.

### L'autorisation vit dans la base

C'est la décision structurante du projet. Toute règle qui compte est une
politique Row Level Security sur la table concernée, jamais une
condition dans un écran. Un écran qui cache un bouton empêche un clic ;
il n'empêche pas une requête.

138 tables, toutes avec RLS active, 277 politiques.

[`SECURITY_ARCHITECTURE.md`](SECURITY_ARCHITECTURE.md) détaille le
modèle, les fonctions d'aide, et deux pièges rencontrés qui méritent
d'être connus de quiconque ajoute une table ou une vue.

### Bascule Firebase → Supabase

Le produit est né sur Firebase et migre vers Supabase. Les deux
coexistent pendant la transition, verticale par verticale, pilotées par
des variables d'environnement :

```
VITE_SB_REFERENTIEL   VITE_SB_IDENTITE   VITE_SB_VIE_SCOLAIRE
VITE_SB_PEDAGOGIE     VITE_SB_FINANCE
```

Chacune passe à `true` quand sa verticale est vérifiée sur Supabase.
Les basculer toutes d'un coup rendrait impossible de savoir laquelle
pose problème.

---

## Les rôles

Dix rôles, cumulables et limitables à un périmètre (un cycle, un niveau,
une classe). Un professeur principal est enseignant *et* responsable de
sa classe ; un directeur peut déléguer la fonction de directeur des
études pour un trimestre.

```
super_admin  directeur  de  sg  secretaire  gestionnaire
enseignant   parent     eleve  support
```

La console d'administration du parc (§4.2) est réservée à l'éditeur de
la plateforme. Un directeur d'établissement n'y a pas accès : lui montrer
les effectifs et le chiffre d'affaires des autres écoles clientes
romprait l'isolation qui fait la valeur du produit.

---

## État du projet

**Ce qui tourne réellement.** Les 17 migrations sont appliquées sur un
projet Supabase, et un jeu de données complet s'y trouve. La chaîne de
paiement a été exercée : 24 factures, 23 encaissements, statuts
recalculés par trigger.

**Ce qui reste.** Les cinq bascules `VITE_SB_*` sont encore à `false` :
l'application lit toujours Firebase. La verticale suivante à basculer est
le référentiel, puis l'identité.

Le suivi story par story est dans [`docs/BACKLOG.md`](docs/BACKLOG.md) :
54 stories, 31 faites, 14 partielles, 9 à faire — comptes établis en
relisant le document, pas estimés.

Quatre modules restent sans interface, sur décision du client :
bibliothèque, transport, infirmerie, stocks et maintenance. Leur schéma
existe.

---

## Reprendre le travail

*Écrit le 30 août 2026. Cette section s'adresse à qui reprend le projet
sans avoir suivi ce qui précède — elle contient tout le contexte
nécessaire.*

### 1. Terminer le push vers Alpha-tech-CG

Le code est commité localement sur la branche
`feat/erp-supabase-design-system` mais **n'est pas encore poussé** vers
<https://github.com/Alpha-tech-CG/gest_ecole>. Le dépôt distant est vide.

GitHub a refusé le push : le jeton `gh` de `mastefox2742` n'a pas la
portée `workflow`, et le dépôt contient `.github/workflows/ci.yml`.
GitHub interdit à une application OAuth de créer un fichier de workflow
sans cette portée — c'est une protection, pas un défaut de configuration.

```bash
gh auth refresh -h github.com -s workflow
```

La commande affiche un code à coller dans le navigateur. Ensuite :

```bash
git remote add alpha https://github.com/Alpha-tech-CG/gest_ecole.git
git push alpha feat/erp-supabase-design-system:main
```

Le remote `alpha` est peut-être déjà configuré ; `git remote -v` le dira.

### 2. Révoquer deux secrets

**Le jeton d'accès Supabase** utilisé pour appliquer les migrations a
transité par une conversation. Le révoquer sur
<https://supabase.com/dashboard/account/tokens>. Il n'est plus nécessaire :
les migrations sont appliquées.

**La clé Gemini** — c'est la plus urgente.
`EXPO_PUBLIC_GEMINI_API_KEY` a été committée dans `apps/mobile/eas.json`
au commit `b8396bd`, et le dépôt d'origine `mastefox2742/eduplatform` est
**public**. La clé a donc été exposée publiquement pendant des semaines ;
les robots qui scrutent GitHub la trouvent en minutes.

Elle a été retirée du fichier, mais **reste dans l'historique git**.
La retirer d'un fichier ne la désexpose pas.

Deux choses, dans cet ordre :

1. Révoquer la clé sur Google AI Studio et en générer une autre.
2. Ne pas remettre la nouvelle au même endroit. Le préfixe
   `EXPO_PUBLIC_` signifie qu'elle est embarquée dans l'application :
   elle est extractible de n'importe quel APK, dépôt public ou non. Le
   correctif de fond est de faire passer les appels à l'IA par une Edge
   Function qui détient la clé côté serveur. C'est aussi ce qu'exige
   §15.7 du cahier des charges, qui veut chaque appel tracé, limité par
   un quota et rattaché à un élève — trois choses impossibles depuis le
   téléphone.

### 3. Basculer les verticales Firebase → Supabase

C'est le vrai travail restant. La base Supabase est prête et peuplée,
mais l'application lit encore Firebase : les cinq bascules de
`apps/web/.env.local` sont à `false`.

```
VITE_SB_REFERENTIEL    classes, matières, années, périodes
VITE_SB_IDENTITE       profils, rôles, responsables
VITE_SB_VIE_SCOLAIRE   présences, discipline, sorties
VITE_SB_PEDAGOGIE      évaluations, notes, bulletins
VITE_SB_FINANCE        factures, échéances, paiements, caisse
```

Les passer à `true` **une par une**, en vérifiant les écrans concernés
entre chaque. Les basculer ensemble rendrait impossible de savoir
laquelle pose problème.

Ordre conseillé : référentiel d'abord — tout s'y rattache — puis
identité, puis les trois autres dans l'ordre qui arrange.

Se connecter avec les comptes de démonstration (voir plus bas) et
vérifier que les écrans affichent les données du seed, pas des tableaux
vides.

### 4. Ce qui reste sans interface

Quatre modules ont leur schéma et aucun écran, sur décision du client :
bibliothèque, transport, infirmerie, stocks et maintenance.

Trois dossiers d'Edge Functions sont vides et doivent être écrits ou
supprimés : `generate-receipt`, `payroll`, `send-alert`.

Le portail public de préinscription (§6) n'existe pas. Tant qu'on ignore
ce qu'il appellera, on ne peut pas retirer au rôle `anon` le droit
d'exécuter les fonctions `SECURITY DEFINER` — c'est le dernier
avertissement de sécurité non traité.

---

## La base de démonstration

Projet Supabase `niuuropuwxefctoulpml` (Alpha_school), PostgreSQL 17,
eu-central-1.

Les 17 migrations sont appliquées. Un établissement complet y est
peuplé par `supabase/seed/seed.py` :

```
Lycée La Référence, Brazzaville
24 élèves · 4 classes · 7 matières · 5 membres du personnel
Année 2025-2026 — T1 et T2 verrouillés, T3 ouvert
4 800 000 FCFA facturés · 3 581 800 encaissés · 75 % de recouvrement
13 factures soldées · 10 partielles · 1 impayée
```

Les valeurs sont écrites à la main, pas tirées au hasard. Junior
Bantsimba a 6/20 en mathématiques **et** aucun versement : c'est ce
croisement que l'écran « Élèves en difficulté » doit retrouver, et il ne
se vérifie pas avec des données aléatoires.

### Comptes

Mot de passe commun : `Demo2026!Alpha`

| Rôle | Adresse |
|---|---|
| Direction | `direction@lareference.cg` |
| Directeur des Études | `de@lareference.cg` |
| Enseignant (maths) | `okemba@lareference.cg` |
| Enseignante (français) | `mabiala@lareference.cg` |
| Enseignante (SVT) | `ngoma@lareference.cg` |
| Élève | `destin.moukoko@eleve.lareference.cg` |

Les élèves suivent le motif `prenom.nom@eleve.lareference.cg`.

Ces comptes n'ont de sens qu'en démonstration. Le jour où une vraie école
arrive, `seed.py` ne doit pas tourner sur sa base : il commence par
effacer l'établissement `la-reference` et tous les comptes en
`@lareference.cg`.

---

## Défauts trouvés en appliquant les migrations

Notés ici parce qu'ils sont instructifs pour la suite, et qu'aucun
n'était visible en relisant le SQL.

**Quatre vues contournaient l'isolation multi-tenant.** En PostgreSQL,
une vue s'exécute par défaut avec les droits de son créateur.
`validation_queue`, `bulletins_with_assessments`, `class_stats` et
`monthly_cashflow` renvoyaient donc les données de **toutes les écoles**
à n'importe quel utilisateur authentifié. Les 277 politiques RLS ne
servaient à rien dès qu'on passait par une vue. Corrigé par
`security_invoker = on` — **toute nouvelle vue doit porter cette
option**.

**Une table avec RLS et sans politique est fermée, pas ouverte.**
`bulletin_assessments` était invisible pour tous, direction comprise. Un
parent aurait vu l'en-tête du bulletin de son enfant et pas une seule
note, sans message d'erreur, puisque RLS filtre au lieu de refuser.
`ENABLE ROW LEVEL SECURITY` et l'écriture des politiques sont deux
gestes ; oublier le second se voit à l'usage, jamais à la lecture.

**`recompute_invoice()` faisait échouer tout paiement.** Ses branches de
`CASE` renvoyaient du texte non typé, inaffectable à une colonne
`invoice_status`. Le trigger étant `AFTER INSERT` sur `payments`, son
échec annulait l'insertion : le webhook CinetPay aurait renvoyé une
erreur à chaque encaissement, et la famille aurait payé sans que son
solde bouge. PostgreSQL ne vérifie le corps d'une fonction plpgsql qu'au
premier appel — ce défaut ne pouvait apparaître qu'à l'exécution.

Contrôle à relancer après toute migration :

```bash
npx supabase db advisors --linked --type security
```

Aucune alerte `ERROR` ne doit apparaître. Les avertissements restants
sont expliqués dans [`SECURITY_ARCHITECTURE.md`](SECURITY_ARCHITECTURE.md).

---

## Conventions

Le code et les commentaires sont en français : c'est la langue des
utilisateurs, du cahier des charges et de l'équipe. Les identifiants
techniques restent en anglais.

Les messages d'erreur destinés à un utilisateur disent quoi faire, pas ce
qui a échoué. « Reconnectez-vous pour rafraîchir vos droits » plutôt que
« jeton sans rôle ».

Les états sont explicites et distincts. « En attente d'envoi » n'est pas
« enregistré ». « Signé » n'est pas « publié ». « Admis » n'est pas
« inscrit ». Confondre deux de ces états coûte cher à quelqu'un.
