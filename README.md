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
pnpm type-check && pnpm lint && pnpm test
```

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

## Deux points ouverts

**La clé Gemini doit être révoquée.** `EXPO_PUBLIC_GEMINI_API_KEY` a été
committée dans `apps/mobile/eas.json`. Elle est retirée du fichier mais
reste dans l'historique git. Le préfixe `EXPO_PUBLIC_` signifie qu'elle
était de toute façon embarquée dans l'application et extractible de tout
APK. Le correctif de fond est de faire passer les appels à l'IA par une
Edge Function qui détient la clé côté serveur — ce qu'exige aussi §15.7,
qui veut chaque appel tracé et rattaché à un élève.

**Le portail public de préinscription** (§6) n'existe pas encore. Tant
qu'on ignore ce qu'il appellera, on ne peut pas retirer au rôle `anon` le
droit d'exécuter les fonctions `SECURITY DEFINER`.

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
