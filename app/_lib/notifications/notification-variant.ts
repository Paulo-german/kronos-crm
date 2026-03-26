import type { NotificationType } from '@prisma/client'
import { AlertTriangle, ArrowRightLeft, Info, UserPlus, type LucideIcon } from 'lucide-react'

/**
 * As 4 variantes visuais derivadas dos campos existentes do Notification.
 * - actionable: convites que exigem aceite/rejeicao (ex: invite para org)
 * - assignment: atribuicoes/transferencias de entidades (deal, task, contact, appointment, conversation)
 * - alert: alertas de sistema que exigem atencao (WhatsApp desconectado, falha pagamento, creditos esgotados)
 * - info: informativos sem acao obrigatoria (novo membro, anuncios de plataforma)
 */
export type NotificationVariant = 'actionable' | 'assignment' | 'alert' | 'info'

export interface NotificationVariantConfig {
  variant: NotificationVariant
  /** Classe Tailwind para a borda esquerda do card */
  borderColor: string
  /** Texto do badge (ex: "Ação necessária", "Nova", "Urgente") */
  badgeLabel: string
  /** Variante do Badge shadcn (destructive, default, secondary, outline) */
  badgeVariant: 'destructive' | 'default' | 'secondary' | 'outline'
  /** Ícone principal do Lucide */
  icon: LucideIcon
  /** Classe Tailwind para a cor do ícone */
  iconColor: string
}

/** Input mínimo para o resolver — subconjunto de NotificationDto */
export interface NotificationVariantInput {
  type: NotificationType
  resourceType: string | null
  actionUrl: string | null
}

// ---------------------------------------------------------------------------
// Mapa constante de variantes — encapsulado (não exportado)
// ---------------------------------------------------------------------------

const VARIANT_CONFIG_MAP: Record<NotificationVariant, NotificationVariantConfig> = {
  actionable: {
    variant: 'actionable',
    borderColor: 'border-l-blue-600',
    badgeLabel: 'Ação necessária',
    badgeVariant: 'default',
    icon: UserPlus,
    iconColor: 'text-blue-600',
  },
  assignment: {
    variant: 'assignment',
    borderColor: 'border-l-blue-500',
    badgeLabel: 'Nova',
    badgeVariant: 'default',
    icon: ArrowRightLeft,
    iconColor: 'text-blue-500',
  },
  alert: {
    variant: 'alert',
    borderColor: 'border-l-amber-500',
    badgeLabel: 'Urgente',
    badgeVariant: 'destructive',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  info: {
    variant: 'info',
    borderColor: 'border-l-purple-500',
    badgeLabel: 'Nova',
    badgeVariant: 'secondary',
    icon: Info,
    iconColor: 'text-purple-500',
  },
}

// ---------------------------------------------------------------------------
// Mapa de labels de resourceType para uso nos botões de ação
// ---------------------------------------------------------------------------

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  deal: 'negócio',
  task: 'tarefa',
  contact: 'contato',
  appointment: 'agendamento',
  conversation: 'conversa',
  member: 'membro',
  inbox: 'inbox',
  subscription: 'assinatura',
  credit: 'créditos',
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Resolve a variante visual de uma notificação a partir dos seus campos de origem.
 * Função pura — sem side effects, sem acesso ao banco.
 *
 * Regra de resolução (por prioridade):
 * 1. SYSTEM                                               → alert
 * 2. PLATFORM_ANNOUNCEMENT                               → info
 * 3. USER_ACTION + resourceType=member + actionUrl=/invite/ → actionable
 * 4. USER_ACTION + resourceType=member + sem invite URL  → info
 * 5. USER_ACTION + qualquer outro resourceType           → assignment
 */
export function resolveNotificationVariant(input: NotificationVariantInput): NotificationVariant {
  if (input.type === 'SYSTEM') {
    return 'alert'
  }

  if (input.type === 'PLATFORM_ANNOUNCEMENT') {
    return 'info'
  }

  // A partir daqui: type === 'USER_ACTION'
  if (input.resourceType === 'member') {
    const isInviteUrl = input.actionUrl?.includes('/invite/') ?? false
    return isInviteUrl ? 'actionable' : 'info'
  }

  return 'assignment'
}

/**
 * Retorna o objeto de configuração visual completo (ícone, cores, badge) para uma variante.
 */
export function getNotificationVariantConfig(variant: NotificationVariant): NotificationVariantConfig {
  return VARIANT_CONFIG_MAP[variant]
}

/**
 * Convenience function: compõe resolveNotificationVariant + getNotificationVariantConfig.
 * Esta é a função que os componentes UI devem consumir diretamente.
 */
export function getNotificationConfig(input: NotificationVariantInput): NotificationVariantConfig {
  const variant = resolveNotificationVariant(input)
  return getNotificationVariantConfig(variant)
}

/**
 * Retorna o label em português do resourceType para uso nos botões de ação.
 * Ex: "deal" → "negócio", null → "recurso"
 */
export function getResourceTypeLabel(resourceType: string | null): string {
  if (!resourceType) return 'recurso'
  return RESOURCE_TYPE_LABELS[resourceType] ?? 'recurso'
}
