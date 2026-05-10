// Tipos
export type {
  RBACContext,
  RBACEntity,
  RBACAction,
  PermissionContext,
  PermissionResult,
  OwnershipData,
} from './types'

// Permissões base
export { hasPermission, isElevated, isOwner } from './permissions'

// Guards de autorização
export {
  canPerformAction,
  canAccessRecord,
  canTransferOwnership,
  resolveAssignedTo,
  requirePermission,
  isOwnershipChange,
} from './guards'

// Verificação de quota do plano
export { checkPlanQuota, requireQuota, getPlanLimits } from './plan-limits'

// Helpers para busca com RBAC
export { findDealWithRBAC, findTaskWithRBAC, findContactWithRBAC, findAppointmentWithRBAC, findConversationWithRBAC } from './helpers'

// Guards de contexto de profissional (Professional Access — sistema paralelo ao CRM)
export { requireProfessionalContext } from './professional-guards'
