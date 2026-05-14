import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

// ─── Configuration Firebase ───────────────────────────────────────────────────
// Copier .env.example → .env.local et renseigner vos vraies valeurs.
// Voir FIREBASE_SETUP.md pour les instructions complètes.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             ?? 'REPLACE_ME',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         ?? 'REPLACE_ME',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          ?? 'REPLACE_ME',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      ?? 'REPLACE_ME',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? 'REPLACE_ME',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              ?? 'REPLACE_ME',
}

const app = initializeApp(firebaseConfig)

export const auth      = getAuth(app)
export const db        = getFirestore(app)
export const storage   = getStorage(app)
export const functions = getFunctions(app, 'europe-west1')

// ─── Émulateurs locaux (développement) ───────────────────────────────────────
// Décommenter pour utiliser les émulateurs Firebase au lieu de la prod.
// Lancer d'abord : firebase emulators:start
//
// import { connectAuthEmulator }      from 'firebase/auth'
// import { connectFirestoreEmulator } from 'firebase/firestore'
// import { connectStorageEmulator }   from 'firebase/storage'
// import { connectFunctionsEmulator } from 'firebase/functions'
//
// if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
//   connectAuthEmulator(auth,      'http://localhost:9099', { disableWarnings: true })
//   connectFirestoreEmulator(db,   'localhost', 8080)
//   connectStorageEmulator(storage,'localhost', 9199)
//   connectFunctionsEmulator(functions, 'localhost', 5001)
//   console.info('[Firebase] 🔧 Émulateurs actifs')
// }

export default app
