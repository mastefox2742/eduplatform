/**
 * useNotifications — désactivé pour la démo (expo-notifications retiré)
 * expo-notifications nécessite des credentials FCM configurés dans EAS
 * ce qui peut crasher l'app au démarrage sans cette config.
 */
export interface NotificationState {
  pushToken:    string | null
  notification: null
  permGranted:  boolean
}

export function useNotifications(): NotificationState {
  return { pushToken: null, notification: null, permGranted: false }
}
