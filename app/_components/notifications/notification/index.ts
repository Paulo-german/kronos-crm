import { NotificationRoot } from './notification-root'
import { NotificationContent } from './notification-content'
import { NotificationIcon } from './notification-icon'
import { NotificationText } from './notification-text'
import { NotificationActions } from './notification-actions'
import { NotificationAction } from './notification-action'

/**
 * Compound component da notificação (dot-notation).
 * Os tijolos são surface-agnostic: o sino e a página dedicada compõem os mesmos
 * primitivos em arranjos diferentes.
 *
 *   <Notification.Root notification={n}>
 *     <Notification.Icon />
 *     <Notification.Content>
 *       <Notification.Text />
 *       <Notification.Actions />
 *     </Notification.Content>
 *   </Notification.Root>
 */
export const Notification = {
  Root: NotificationRoot,
  Content: NotificationContent,
  Icon: NotificationIcon,
  Text: NotificationText,
  Actions: NotificationActions,
  Action: NotificationAction,
}

export { useNotification } from './notification-context'
