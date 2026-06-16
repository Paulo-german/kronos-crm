'use client'

import { ActionableActions } from '../_components/actionable-actions'
import { AssignmentActions } from '../_components/assignment-actions'
import { AlertActions } from '../_components/alert-actions'
import { useNotification } from './notification-context'

/**
 * Região de ações da notificação. Lê a variant do context e renderiza o
 * conjunto de ações adequado. Heterogênea por natureza — por isso é um switch
 * inteligente, não uma composição manual.
 */
export const NotificationActions = () => {
  const { notification, variant, onDismiss } = useNotification()

  if (variant === 'actionable') {
    const token = notification.actionUrl?.split('/invite/')[1] ?? null
    if (!token) return null

    return (
      <ActionableActions
        token={token}
        onAccepted={onDismiss}
        onDeclined={onDismiss}
      />
    )
  }

  if (variant === 'assignment') {
    return (
      <AssignmentActions
        actionUrl={notification.actionUrl}
        resourceType={notification.resourceType}
      />
    )
  }

  if (variant === 'alert') {
    return <AlertActions actionUrl={notification.actionUrl} />
  }

  return null
}
