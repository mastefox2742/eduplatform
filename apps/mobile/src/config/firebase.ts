import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, getAuth, inMemoryPersistence } from 'firebase/auth'
import { initializeFirestore, getFirestore }            from 'firebase/firestore'
import { getStorage }                                   from 'firebase/storage'

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY             ?? 'AIzaSyDIvEFsUNZvSaWwUNb8oeb9KxZqiZXOWyY',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN         ?? 'edu-school-bb515.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID          ?? 'edu-school-bb515',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET      ?? 'edu-school-bb515.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '59723582226',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID              ?? '1:59723582226:web:b983f55ea5d25d6801c1cb',
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
