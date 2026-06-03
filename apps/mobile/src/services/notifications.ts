/**
 * Notifications service — stubs pour la démo
 * expo-notifications retiré car il nécessite des credentials FCM dans EAS.
 * Ces fonctions sont des no-ops pour éviter les crashs.
 */

import { Alert } from 'react-native'

export function initNotificationHandler() {}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  return "expo-push-token-demo"
}

export async function sendLocalNotification(title: string, body: string) {
  Alert.alert(`🔔 ${title}`, body)
}

export async function notifyNewExercise(title: string, subject: string, due: string) {
  Alert.alert('📝 Nouvel Exercice', `Le professeur a publié un exercice en ${subject} : "${title}". À rendre pour le ${due}.`)
}

export async function notifyExerciseReviewed(title: string, grade: number) {
  Alert.alert('✅ Exercice Corrigé', `Ton exercice "${title}" a été noté : ${grade}/100.`)
}

export async function notifyNewCourse(title: string, subject: string) {
  Alert.alert('📚 Nouveau Cours', `Un nouveau cours est disponible en ${subject} : "${title}".`)
}

export async function notifyFeeReminder(label: string, amount: number, due: string) {
  Alert.alert('💳 Frais de Scolarité', `Rappel : La ${label} de ${amount} FCFA est à payer avant le ${due}.`)
}

export async function notifySubmissionReceived(student: string, exercise: string) {
  Alert.alert('📥 Nouvelle Soumission', `${student} a rendu l'exercice "${exercise}".`)
}

export async function setBadgeCount(_count: number) {}
export async function clearBadge() {}

export function addNotificationReceivedListener(_handler: unknown) {
  return { remove: () => {} }
}
export function addNotificationResponseListener(_handler: unknown) {
  return { remove: () => {} }
}
