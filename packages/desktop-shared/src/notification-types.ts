/**
 * Types for native OS notifications and badge management.
 */

export interface NativeNotification {
  title: string
  body: string
  icon?: string
  sound?: boolean
  urgency?: "low" | "normal" | "critical"
  /** Internal route to navigate to when notification is clicked */
  link?: string
  /** Related entity ID (request, mail, etc.) */
  relatedId?: string
  /** Category for preference filtering */
  category?: NotificationCategory
}

export type NotificationCategory =
  | "mail"
  | "approval"
  | "appointment"
  | "payment"
  | "print"
  | "meeting"
  | "document"
  | "system"

export interface NotificationPreferences {
  enabled: boolean
  sound: boolean
  categories: Record<NotificationCategory, boolean>
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  categories: {
    mail: true,
    approval: true,
    appointment: true,
    payment: true,
    print: true,
    meeting: true,
    document: true,
    system: true,
  },
}

export interface NotificationClickData {
  link?: string
  relatedId?: string
  category?: NotificationCategory
}
