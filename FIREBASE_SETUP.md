# 🔥 Guide de connexion Firebase — EduPlatform

## Vue d'ensemble

L'application fonctionne en **deux modes** :
- **Mode démo local** — pas de Firebase requis, données dans le navigateur
- **Mode Firestore live** — données réelles, multi-utilisateurs, temps-réel

---

## Étape 1 — Créer un projet Firebase

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com)
2. Cliquer **Ajouter un projet**
3. Nom : `eduplatform-prod` (ou votre choix)
4. Activer Google Analytics (optionnel)

---

## Étape 2 — Configurer les services Firebase

### 2.1 Authentication
- **Build → Authentication → Commencer**
- Activer le provider **Email/Mot de passe**

### 2.2 Firestore Database
- **Build → Firestore Database → Créer une base de données**
- Choisir la région : `europe-west1` (Frankfurt) ← proche de l'Afrique de l'Ouest
- Commencer en **mode production** (les règles `.rules` seront déployées)

### 2.3 Storage
- **Build → Storage → Commencer**
- Même région que Firestore

---

## Étape 3 — Récupérer les clés de configuration

1. **Paramètres du projet** (⚙️ en haut à gauche)
2. **Vos applications → Ajouter une application → Web**
3. Nom : `eduplatform-web`
4. Copier le bloc `firebaseConfig`

---

## Étape 4 — Configurer l'application web

```bash
# Dans apps/web/
cp .env.example .env.local
```

Ouvrir `.env.local` et remplir avec vos valeurs :

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=mon-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mon-projet
VITE_FIREBASE_STORAGE_BUCKET=mon-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Étape 5 — Déployer les règles Firestore

```bash
# Installer Firebase CLI (si pas déjà fait)
npm install -g firebase-tools

# Se connecter
firebase login

# Initialiser dans le dossier racine du projet
firebase use --add   # sélectionner votre projet

# Déployer les règles et indexes
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Étape 6 — Initialiser les données de démonstration

### Option A — Via l'interface (recommandé)
1. Lancer l'app : `pnpm dev`
2. Ouvrir `http://localhost:5173?demo=direction`
3. Une bannière bleue apparaît : **"Firebase connecté — base de données vide"**
4. Cliquer **"Initialiser les données"**
5. Attendre ~5 secondes → toutes les pages se remplissent automatiquement

### Option B — Via la console (développeurs)
```typescript
// Dans la console du navigateur (DevTools → Console)
import('/src/services/seed.service.ts').then(m => m.seedDemoData())
```

---

## Étape 7 — Créer les comptes utilisateurs de démonstration

Dans **Firebase Console → Authentication → Ajouter un utilisateur** :

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `direction@demo.fr` | `demo1234` | Direction |
| `prof@demo.fr` | `demo1234` | Professeur |
| `prof2@demo.fr` | `demo1234` | Professeur |

> ⚠️ Après création, allez dans **Firestore → users** et vérifiez que le document `{uid}` contient `schoolId: "demo-school"` et `role: "direction"` (ou "teacher").
>
> Si pas automatique, créez manuellement le document `users/{uid}` :
> ```json
> {
>   "id": "{uid}",
>   "email": "direction@demo.fr",
>   "displayName": "Marie Kourouma",
>   "role": "direction",
>   "schoolId": "demo-school",
>   "isActive": true,
>   "createdAt": 1234567890000,
>   "updatedAt": 1234567890000
> }
> ```

---

## Architecture des données Firestore

```
firestore/
├── users/                       ← Profils utilisateurs (racine)
│   └── {uid}                    ← UserProfile
│
└── schools/
    └── {schoolId}/              ← École (multi-tenant)
        ├── [meta]               ← School info
        ├── students/            ← StudentMember[]
        ├── teachers/            ← TeacherMember[]
        ├── classes/             ← SchoolClass[]
        ├── assessments/         ← Assessment[] (devoirs/examens)
        ├── attendance/          ← TeacherAttendanceRecord[]
        ├── schedule/            ← ScheduleSlot[] (emplois du temps)
        ├── courses/             ← Course[]
        ├── exercises/           ← Exercise[]
        └── progress/            ← StudentProgress[]
```

---

## Comportement automatique de l'app

| Situation | Comportement |
|-----------|-------------|
| Pas de `.env.local` | Mode démo locale (données hardcodées) |
| `.env.local` configuré + Firestore vide | Bannière bleue "Initialiser" visible |
| `.env.local` configuré + données présentes | Badge vert "Firestore live" + données réelles |
| Erreur réseau | Fallback automatique sur données démo |

---

## Développement local avec émulateurs Firebase

```bash
# Lancer les émulateurs
firebase emulators:start

# Dans un second terminal, lancer l'app
pnpm dev
```

Pour utiliser les émulateurs, ajouter dans `.env.local` :
```env
VITE_USE_FIREBASE_EMULATORS=true
```

Et décommenter dans `apps/web/src/config/firebase.ts` :
```typescript
// if (import.meta.env.VITE_USE_FIREBASE_EMULATORS) {
//   connectFirestoreEmulator(db, 'localhost', 8080)
//   connectAuthEmulator(auth, 'http://localhost:9099')
//   connectStorageEmulator(storage, 'localhost', 9199)
// }
```
