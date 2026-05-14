/**
 * Firebase Storage helpers for photo uploads
 */
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { firebaseApp } from './firestore'

const storage = getStorage(firebaseApp)

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
    await uploadBytes(storageRef, blob)
    return await getDownloadURL(storageRef)
  } catch (e) {
    console.warn('Storage upload failed, returning local URI as fallback', e)
    return localUri
  }
}
