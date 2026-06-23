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
const PERMISSION_MATRIX: Record<
  RBACEntity,
  Record<RBACAction, MemberRole[]>
> = {
  contact: {
    create: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // MEMBER: só próprios (verificado em guards)
    update: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // MEMBER: só próprios (verificado em guards)
    delete: ['OWNER', 'ADMIN', 'SUPPORT'], // MEMBER não pode deletar
    transfer: ['OWNER', 'ADMIN', 'SUPPORT'], // Mudar assignedTo
  },
  deal: {
    create: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // MEMBER: só próprios
    update: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // MEMBER: só próprios
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: ['OWNER', 'ADMIN', 'SUPPORT'],
  },
  task: {
    create: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // MEMBER: só próprias
    update: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // MEMBER: só próprias
    delete: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // MEMBER pode deletar próprias
    transfer: ['OWNER', 'ADMIN', 'SUPPORT'],
  },
  product: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // Produtos são globais
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: [], // Produtos não têm ownership
  },
  pipeline: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // Pipeline é global
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: [], // Pipeline não tem ownership
  },
  company: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'], // Empresas são recursos administrativos
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // Todos podem ver (para vincular a contatos/deals)
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: [], // Empresas não têm ownership individual
  },
  organization: {
    create: [], // Criação de org é via fluxo separado (authActionClient)
    read: ['OWNER', 'ADMIN', 'MEMBER'], // SUPPORT não acessa settings da org
    update: ['OWNER', 'ADMIN'], // Configurações, convites, membros
    delete: ['OWNER'], // Apenas OWNER pode deletar a organização
    transfer: ['OWNER'], // Transferir ownership da org
  },
  billing: {
    create: ['OWNER', 'ADMIN'], // SUPPORT não acessa billing
    read: ['OWNER', 'ADMIN', 'MEMBER'], // SUPPORT não vê billing
    update: ['OWNER', 'ADMIN'], // Gerenciar assinatura (portal)
    delete: [], // Não se aplica
    transfer: [], // Não se aplica
  },
  appointment: {
    create: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: ['OWNER', 'ADMIN', 'SUPPORT'],
  },
  agent: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: [],
  },
  inbox: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: [],
  },
  conversation: {
    create: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: [],
  },
  integration: {
    create: ['OWNER', 'ADMIN', 'MEMBER'], // SUPPORT não acessa integrações
    read: ['OWNER', 'ADMIN', 'MEMBER'], // SUPPORT não vê credenciais
    update: ['OWNER', 'ADMIN', 'MEMBER'],
    delete: ['OWNER', 'ADMIN', 'MEMBER'],
    transfer: [],
  },
  notification: {
    // Criacao e backend-only (helper createNotification, nao exposto ao client)
    create: [],
    // Cada usuario ve apenas as proprias (filtro por userId no data-access)
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    // Marcar como lida
    update: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    // Deletar proprias notificacoes
    delete: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    // Nao se aplica a notificacoes
    transfer: [],
  },
  automation: {
    // Apenas ADMIN+ pode gerenciar automacoes (recurso estratégico da org)
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'SUPPORT'],
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: [],
  },
  agentGroup: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: [],
  },
  // Scheduling v2
  professional: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
  service: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
  serviceCategory: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
  workingHours: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'],
    transfer: [],
  },
  // Promoções são globais da org — sem ownership; SUPPORT não gerencia catálogo comercial
  promotion: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
  // Metas (Goals): leitura ampla (MEMBER vê metas próprias + ORG/PIPELINE — RBAC adicional nas queries)
  goal: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
  // Inbound Webhooks: configuram endpoints públicos que materializam dados na org
  // Restrito a OWNER/ADMIN — MEMBER não deve criar endpoints que afetam dados da org inteira
  webhookSource: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN'],
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER'], // Apenas OWNER deleta — endpoint público é asset crítico
    transfer: [],
  },
  // Squads: times de vendas/suporte/CS — recurso estratégico gerenciado por OWNER/ADMIN
  // MEMBER e SUPPORT têm leitura para ver em qual squad estão
  squad: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
  // Formulários de captura embeddable — configuração estratégica da org
  // MEMBER vê para saber quais forms existem; só ADMIN+ cria/edita/deleta
  captureForm: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'],
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
  // Disparos em massa: recurso de alto impacto (custo de provedor, risco de spam).
  // MEMBER NÃO cria — apenas vê os próprios (via createdBy) se um admin criar.
  broadcast: {
    create: ['OWNER', 'ADMIN', 'SUPPORT'],
    read: ['OWNER', 'ADMIN', 'MEMBER', 'SUPPORT'], // MEMBER: só próprios (filtro por createdBy)
    update: ['OWNER', 'ADMIN', 'SUPPORT'],
    delete: ['OWNER', 'ADMIN', 'SUPPORT'], // = cancelar
    transfer: [],
  },
}

/**
 * Verifica se um role tem permissão base para uma ação
 */
export function hasPermission(
  role: MemberRole,
  entity: RBACEntity,
  action: RBACAction,
): boolean {
  const allowedRoles = PERMISSION_MATRIX[entity]?.[action] ?? []
  return allowedRoles.includes(role)
}

/**
 * Retorna true se o role é elevado (ADMIN ou OWNER)
 * Roles elevados podem ver/editar todos os registros da organização
 */
export function isElevated(role: MemberRole): boolean {
  return role === 'ADMIN' || role === 'OWNER' || role === 'SUPPORT'
}

/**
 * Retorna true se o role é OWNER
 */
export function isOwner(role: MemberRole): boolean {
  return role === 'OWNER'
}
