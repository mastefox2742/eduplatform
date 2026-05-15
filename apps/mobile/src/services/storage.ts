/**
 * Firebase Storage helpers for photo uploads
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/config/firebase'

// ── Soumission d'exercice ────────────────────────────────────────────────────

export async function uploadSubmissionPhoto(
  schoolId:    string,
  exerciseId:  string,
  studentId:   string,
  localUri:    string
): Promise<string> {
  try {
    const response = await fetch(localUri)
    const blob     = await response.blob()
    const path     = `submissions/${schoolId}/${exerciseId}/${studentId}_${Date.now()}.jpg`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
    return await getDownloadURL(storageRef)
  } catch (e) {
    console.warn('Storage upload failed, returning local URI as fallback', e)
    return localUri
  }
}

// ── Photo de profil utilisateur ──────────────────────────────────────────────

export async function uploadProfilePhoto(
  userId:    string,
  localUri:  string
): Promise<string> {
  const response = await fetch(localUri)
  const blob     = await response.blob()
  // On écrase toujours le même fichier (pas d'accumulation dans Storage)
  const path     = `users/${userId}/avatar.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
  return await getDownloadURL(storageRef)
}
