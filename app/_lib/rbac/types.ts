import type { MemberRole } from '@prisma/client'

/**
 * Contexto RBAC para funções do Data Access Layer
 * Usado para aplicar filtros de visibilidade baseados no role
 */
export interface RBACContext {
  orgId: string
  userId: string
  userRole: MemberRole
}

/**
 * Entidades do sistema que são controladas por RBAC
 */
export type RBACEntity =
  | 'contact'
  | 'deal'
  | 'task'
  | 'product'
  | 'pipeline'
  | 'company'
  | 'organization'
  | 'billing'
  | 'appointment'

/**
 * Ações possíveis em cada entidade
 */
export type RBACAction = 'create' | 'read' | 'update' | 'delete' | 'transfer'

/**
 * Contexto de permissão extraído do orgActionClient
 */
export interface PermissionContext {
  userId: string
  orgId: string
  userRole: MemberRole
}

/**
 * Resultado de uma verificação de permissão
 */
export interface PermissionResult {
  allowed: boolean
  reason?: string
}

/**
 * Dados de ownership de um registro
 */
export interface OwnershipData {
  assignedTo: string | null
  organizationId?: string
}
