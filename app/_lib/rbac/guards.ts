import type { RBACEntity, RBACAction, PermissionContext, PermissionResult, OwnershipData } from './types'
import { hasPermission, isElevated } from './permissions'

/**
 * Verifica se o usuário tem permissão base para executar uma ação
 * Esta é a primeira verificação - não considera ownership
 */
export function canPerformAction(
  ctx: PermissionContext,
  entity: RBACEntity,
  action: RBACAction
): PermissionResult {
  const allowed = hasPermission(ctx.userRole, entity, action)

  if (!allowed) {
    return {
      allowed: false,
      reason: `Você não tem permissão para ${getActionLabel(action)} ${getEntityLabel(entity)}.`,
    }
  }

  return { allowed: true }
}

/**
 * Verifica se o usuário pode acessar um registro específico
 * - ADMIN/OWNER: acessa qualquer registro da org
 * - MEMBER: só acessa registros atribuídos a ele
 * - Se assignedTo for null (legado): visível para todos
 */
export function canAccessRecord(
  ctx: PermissionContext,
  ownership: OwnershipData
): PermissionResult {
  // ADMIN e OWNER podem acessar qualquer registro
  if (isElevated(ctx.userRole)) {
    return { allowed: true }
  }

  // Registro legado sem assignedTo: visível para todos (temporário)
  if (ownership.assignedTo === null) {
    return { allowed: true }
  }

  // MEMBER só pode acessar registros atribuídos a ele
  if (ownership.assignedTo === ctx.userId) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: 'Você só pode acessar registros atribuídos a você.',
  }
}

/**
 * Verifica se o usuário pode transferir ownership de um registro
 * - Apenas ADMIN/OWNER podem transferir
 * - Usado quando assignedTo está sendo alterado
 */
export function canTransferOwnership(ctx: PermissionContext): PermissionResult {
  // ADMIN e OWNER podem transferir qualquer registro
  if (isElevated(ctx.userRole)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: 'Apenas administradores podem transferir registros para outros usuários.',
  }
}

/**
 * Resolve o assignedTo para criação de registros
 * - ADMIN/OWNER: pode especificar qualquer userId ou deixar vazio (fica com ele mesmo)
 * - MEMBER: sempre forçado para si mesmo
 */
export function resolveAssignedTo(
  ctx: PermissionContext,
  requestedAssignedTo?: string | null
): string {
  // MEMBER sempre é forçado para si mesmo
  if (!isElevated(ctx.userRole)) {
    return ctx.userId
  }

  // ADMIN/OWNER: usa o valor solicitado ou defaulta para si mesmo
  return requestedAssignedTo ?? ctx.userId
}

/**
 * Lança erro se a permissão foi negada
 * Use para parar a execução da action imediatamente
 */
export function requirePermission(result: PermissionResult): void {
  if (!result.allowed) {
    throw new Error(result.reason ?? 'Permissão negada.')
  }
}

/**
 * Helper: verifica se houve tentativa de mudança de ownership
 */
export function isOwnershipChange(
  newAssignedTo: string | undefined | null,
  currentAssignedTo: string | null
): boolean {
  // Se não está tentando mudar, não é uma mudança
  if (newAssignedTo === undefined) {
    return false
  }

  return newAssignedTo !== currentAssignedTo
}

// --- Labels para mensagens de erro ---

function getActionLabel(action: RBACAction): string {
  const labels: Record<RBACAction, string> = {
    create: 'criar',
    read: 'visualizar',
    update: 'editar',
    delete: 'excluir',
    transfer: 'transferir',
  }
  return labels[action]
}

function getEntityLabel(entity: RBACEntity): string {
  const labels: Record<RBACEntity, string> = {
    contact: 'contatos',
    deal: 'negócios',
    task: 'tarefas',
    product: 'produtos',
    pipeline: 'pipeline',
    company: 'empresas',
    organization: 'organização',
    billing: 'faturamento',
    appointment: 'agendamentos',
    agent: 'agentes IA',
    conversation: 'conversas',
  }
  return labels[entity]
}
