/**
 * useNotifications — hook for push notification setup and handling
 * Call this once at the root layout level
 */
import { useState, useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import {
  initNotificationHandler,
  registerForPushNotificationsAsync,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  clearBadge,
} from '@/services/notifications'

export interface NotificationState {
  pushToken:    string | null
  notification: Notifications.Notification | null
  permGranted:  boolean
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    pushToken:    null,
    notification: null,
    permGranted:  false,
  })

  const notifListener    = useRef<Notifications.Subscription>()
  const responseListener = useRef<Notifications.Subscription>()

  useEffect(() => {
    // Initialise le handler DANS un useEffect, pas au niveau module (crash Android)
    initNotificationHandler()

    // Request permission and get token
    registerForPushNotificationsAsync().then(token => {
      setState(prev => ({ ...prev, pushToken: token, permGranted: !!token }))
    })

    // Listen for notifications received while app is foregrounded
    notifListener.current = addNotificationReceivedListener(notification => {
      setState(prev => ({ ...prev, notification }))
    })

    // Listen for user tapping a notification
    responseListener.current = addNotificationResponseListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown>
      console.log('Notification tapped:', data)
      // Navigation based on type can be added here
    })

    // Clear badge on app open
    clearBadge()

    return () => {
      notifListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  return state
}
