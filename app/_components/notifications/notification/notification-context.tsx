'use client'

import { createContext, useContext } from 'react'
import type {
  NotificationVariant,
  NotificationVariantConfig,
} from '@/_lib/notifications/notification-variant'
import type { NotificationDto } from '@/_data-access/notification/types'

/**
 * Estado compartilhado por todos os subcomponentes de uma notificação.
 * Derivado uma única vez no Root — evita re-resolver variant/config em cada
 * átomo e elimina prop-drilling de `notification`.
 */
export interface NotificationContextValue {
  notification: NotificationDto
  variant: NotificationVariant
  config: NotificationVariantConfig
  isUnread: boolean
  /** Densidade compacta (sino): body em 1 linha, paddings menores. */
  compact: boolean
  /** Marca como lida (handler já fiado no Root). */
  markAsRead: () => void
  /** Remove a notificação (handler já fiado no Root). */
  remove: () => void
  isPendingRead: boolean
  isPendingDelete: boolean
  /** Avisa a superfície que o item deve sair da lista (ex.: convite aceito). */
  onDismiss: () => void
  /** Disparado ao selecionar o card (ex.: sino fecha o popover). */
  onSelect: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export const NotificationProvider = NotificationContext.Provider

/**
 * Lê o contexto da notificação. Lança se usado fora de `Notification.Root`.
 */
export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error(
      'Os subcomponentes de Notification devem ser usados dentro de <Notification.Root>.',
    )
  }
  return context
}
