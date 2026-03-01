import type { MemberRole } from '@prisma/client'
import type { RBACEntity, RBACAction } from './types'

/**
 * Matriz de permissões: define quais roles podem executar quais ações
 *
 * Regras:
 * - 'ALL': qualquer role pode executar a ação
 * - 'ADMIN+': apenas ADMIN e OWNER
 * - 'OWNER': apenas OWNER
 *
 * Nota: Esta é a permissão BASE. Para entidades com ownership (contact, deal, task),
 * MEMBER ainda precisa passar pela verificação de ownership em guards.ts
 */
const PERMISSION_MATRIX: Record<RBACEntity, Record<RBACAction, MemberRole[]>> = {
  contact: {
    create: ['OWNER', 'ADMIN', 'MEMBER'],
    read: ['OWNER', 'ADMIN', 'MEMBER'], // MEMBER: só próprios (verificado em guards)
    update: ['OWNER', 'ADMIN', 'MEMBER'], // MEMBER: só próprios (verificado em guards)
    delete: ['OWNER', 'ADMIN'], // MEMBER não pode deletar
    transfer: ['OWNER', 'ADMIN'], // Mudar assignedTo
  },
  deal: {
    create: ['OWNER', 'ADMIN', 'MEMBER'],
    read: ['OWNER', 'ADMIN', 'MEMBER'], // MEMBER: só próprios
    update: ['OWNER', 'ADMIN', 'MEMBER'], // MEMBER: só próprios
    delete: ['OWNER', 'ADMIN'],
    transfer: ['OWNER', 'ADMIN'],
  },
  task: {
    create: ['OWNER', 'ADMIN', 'MEMBER'],
    read: ['OWNER', 'ADMIN', 'MEMBER'], // MEMBER: só próprias
    update: ['OWNER', 'ADMIN', 'MEMBER'], // MEMBER: só próprias
    delete: ['OWNER', 'ADMIN', 'MEMBER'], // MEMBER pode deletar próprias
    transfer: ['OWNER', 'ADMIN'],
  },
  product: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN', 'MEMBER'], // Produtos são globais
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [], // Produtos não têm ownership
  },
  pipeline: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN', 'MEMBER'], // Pipeline é global
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [], // Pipeline não tem ownership
  },
  company: {
    create: ['OWNER', 'ADMIN'], // Empresas são recursos administrativos
    read: ['OWNER', 'ADMIN', 'MEMBER'], // Todos podem ver (para vincular a contatos/deals)
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [], // Empresas não têm ownership individual
  },
  organization: {
    create: [], // Criação de org é via fluxo separado (authActionClient)
    read: ['OWNER', 'ADMIN', 'MEMBER'], // Todos podem ver info básica da org
    update: ['OWNER', 'ADMIN'], // Configurações, convites, membros
    delete: ['OWNER'], // Apenas OWNER pode deletar a organização
    transfer: ['OWNER'], // Transferir ownership da org
  },
  billing: {
    create: ['OWNER', 'ADMIN'], // Criar checkout session / assinar plano
    read: ['OWNER', 'ADMIN', 'MEMBER'], // Ver plano atual
    update: ['OWNER', 'ADMIN'], // Gerenciar assinatura (portal)
    delete: [], // Não se aplica
    transfer: [], // Não se aplica
  },
  appointment: {
    create: ['OWNER', 'ADMIN', 'MEMBER'],
    read: ['OWNER', 'ADMIN', 'MEMBER'], // MEMBER: só próprios
    update: ['OWNER', 'ADMIN', 'MEMBER'], // MEMBER: só próprios
    delete: ['OWNER', 'ADMIN'],
    transfer: ['OWNER', 'ADMIN'],
  },
  agent: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN', 'MEMBER'],
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
  inbox: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN', 'MEMBER'],
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
  conversation: {
    create: ['OWNER', 'ADMIN', 'MEMBER'],
    read: ['OWNER', 'ADMIN', 'MEMBER'],
    update: ['OWNER', 'ADMIN', 'MEMBER'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
}

/**
 * Verifica se um role tem permissão base para uma ação
 */
export function hasPermission(
  role: MemberRole,
  entity: RBACEntity,
  action: RBACAction
): boolean {
  const allowedRoles = PERMISSION_MATRIX[entity]?.[action] ?? []
  return allowedRoles.includes(role)
}

/**
 * Retorna true se o role é elevado (ADMIN ou OWNER)
 * Roles elevados podem ver/editar todos os registros da organização
 */
export function isElevated(role: MemberRole): boolean {
  return role === 'ADMIN' || role === 'OWNER'
}

/**
 * Retorna true se o role é OWNER
 */
export function isOwner(role: MemberRole): boolean {
  return role === 'OWNER'
}
