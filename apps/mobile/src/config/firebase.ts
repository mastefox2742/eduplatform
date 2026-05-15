import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, getAuth, inMemoryPersistence } from 'firebase/auth'
import { initializeFirestore, getFirestore }            from 'firebase/firestore'
import { getStorage }                                   from 'firebase/storage'

// Les variables EXPO_PUBLIC_* sont visibles dans le bundle compilé.
// Ne jamais y mettre de secrets. Les clés Firebase sont publiques par design
// mais doivent être fournies par les variables d'env (EAS Secrets en CI/CD).
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Auth — inMemoryPersistence : pas de localStorage/IndexedDB → sûr en React Native
let auth: ReturnType<typeof getAuth>
try {
  auth = initializeAuth(app, { persistence: inMemoryPersistence })
} catch {
  auth = getAuth(app)
}

// Firestore — experimentalForceLongPolling évite le crash WebChannel/IndexedDB
let db: ReturnType<typeof getFirestore>
try {
  db = initializeFirestore(app, { experimentalForceLongPolling: true })
} catch {
  db = getFirestore(app)
}

const storage = getStorage(app)

export { auth, db, storage }
export default app
