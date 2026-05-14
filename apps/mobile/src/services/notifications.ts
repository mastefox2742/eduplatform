/**
 * Push Notifications service — Expo Notifications
 * Handles: permission request, push token registration, local notifications
 */
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
})

// ── Token registration ────────────────────────────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions denied.')
    return null
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID ?? 'school-demo',
    })
    console.log('Push token:', token.data)

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:       'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a73e8',
      })
    }

    return token.data
  } catch (e) {
    console.warn('Could not get push token:', e)
    return null
  }
}

// ── Local notifications ───────────────────────────────────────────────────────
export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {} },
    trigger: null, // immediate
  })
}

// ── School-specific notification helpers ─────────────────────────────────────
export async function notifyNewExercise(exerciseTitle: string, subject: string, dueDate: string) {
  return sendLocalNotification(
    `📝 Nouvel exercice — ${subject}`,
    `${exerciseTitle} · À rendre le ${dueDate}`,
    { type: 'new_exercise' }
  )
}

export async function notifyExerciseReviewed(exerciseTitle: string, grade: number) {
  const emoji = grade >= 14 ? '🎉' : grade >= 10 ? '✅' : '📋'
  return sendLocalNotification(
    `${emoji} Correction disponible`,
    `${exerciseTitle} — Note: ${grade}/20`,
    { type: 'exercise_reviewed', grade }
  )
}

export async function notifyNewCourse(courseTitle: string, subject: string) {
  return sendLocalNotification(
    `📚 Nouveau cours — ${subject}`,
    courseTitle,
    { type: 'new_course' }
  )
}

export async function notifyFeeReminder(label: string, amount: number, dueDate: string) {
  return sendLocalNotification(
    '💳 Rappel de paiement',
    `${label} — ${amount.toLocaleString()} GNF · Échéance: ${dueDate}`,
    { type: 'fee_reminder' }
  )
}

export async function notifySubmissionReceived(studentName: string, exerciseTitle: string) {
  return sendLocalNotification(
    '📬 Nouvelle soumission',
    `${studentName} a soumis sa solution pour: ${exerciseTitle}`,
    { type: 'new_submission' }
  )
}

// ── Badge management ─────────────────────────────────────────────────────────
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count)
}

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0)
}

// ── Listener helpers (return unsubscribe functions) ──────────────────────────
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler)
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler)
}
