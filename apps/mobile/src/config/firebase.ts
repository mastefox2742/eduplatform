import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth }      from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage }   from 'firebase/storage'

// ─── Firebase client config (safe to expose in client bundles) ─────────────
// Ces clés sont publiques — Firebase sécurise l'accès via les règles Firestore
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? 'AIzaSyDIvEFsUNZvSaWwUNb8oeb9KxZqiZXOWyY',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? 'edu-school-bb515.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? 'edu-school-bb515',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? 'edu-school-bb515.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '59723582226',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? '1:59723582226:web:b983f55ea5d25d6801c1cb',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth    = getAuth(app)
export const db      = getFirestore(app)
export const storage = getStorage(app)

export default app
