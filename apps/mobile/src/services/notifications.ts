/**
 * Notifications service — stubs pour la démo
 * expo-notifications retiré car il nécessite des credentials FCM dans EAS.
 * Ces fonctions sont des no-ops pour éviter les crashs.
 */

export function initNotificationHandler() {}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  return null
}

export async function sendLocalNotification(_title: string, _body: string) {}

export async function notifyNewExercise(_title: string, _subject: string, _due: string) {}
export async function notifyExerciseReviewed(_title: string, _grade: number) {}
export async function notifyNewCourse(_title: string, _subject: string) {}
export async function notifyFeeReminder(_label: string, _amount: number, _due: string) {}
export async function notifySubmissionReceived(_student: string, _exercise: string) {}

export async function setBadgeCount(_count: number) {}
export async function clearBadge() {}

export function addNotificationReceivedListener(_handler: unknown) {
  return { remove: () => {} }
}
export function addNotificationResponseListener(_handler: unknown) {
  return { remove: () => {} }
}
