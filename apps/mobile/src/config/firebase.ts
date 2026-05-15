import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'
import { initializeFirestore, getFirestore }          from 'firebase/firestore'
import { getStorage }                                 from 'firebase/storage'
import AsyncStorage                                   from '@react-native-async-storage/async-storage'

// ─── Firebase client config ───────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY             ?? 'AIzaSyDIvEFsUNZvSaWwUNb8oeb9KxZqiZXOWyY',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN         ?? 'edu-school-bb515.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID          ?? 'edu-school-bb515',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET      ?? 'edu-school-bb515.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '59723582226',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID              ?? '1:59723582226:web:b983f55ea5d25d6801c1cb',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// ─── Auth — persistance via AsyncStorage (React Native) ───────────────────────
// getAuth() utilise IndexedDB (web) → crash en React Native.
// initializeAuth + getReactNativePersistence résout ce problème.
export const auth = getApps().length > 1
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : (() => {
      try {
        return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
      } catch {
        // Auth déjà initialisée (hot reload)
        const { getAuth } = require('firebase/auth')
        return getAuth(app)
      }
    })()

// ─── Firestore — long polling (pas d'IndexedDB en React Native) ───────────────
export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    })
  } catch {
    // Déjà initialisé (hot reload)
    return getFirestore(app)
  }
})()

export const storage = getStorage(app)

export default app
