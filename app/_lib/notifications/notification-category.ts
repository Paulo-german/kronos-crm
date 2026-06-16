import type { NotificationCategory, NotificationType } from '@prisma/client'
import {
  AlertTriangle,
  ArrowRightLeft,
  Clock,
  Info,
  MessageSquare,
  Megaphone,
  Sparkles,
  Tag,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'

/**
 * Categoria editorial da notificação — eixo de assunto, usado para filtro,
 * chip e (futuramente) preferências granulares.
 *
 * Diferente da `variant` (notification-variant.ts), que descreve a aparência/
 * urgência. Category é "sobre o que é"; variant é "como se parece".
 *
 * A coluna é nullable durante a transição: registros antigos ficam null até o
 * backfill (prisma/backfill/notification-category-backfill.sql).
 */
export interface CategoryConfig {
  /** Label em português exibido no chip e nas tabs de filtro */
  label: string
  /** Ícone do Lucide */
  icon: LucideIcon
  /** Classes Tailwind do chip (fundo + texto) */
  chipColor: string
  /** Ordem de exibição nas tabs de filtro */
  order: number
}

/** Input mínimo para derivar a categoria — espelha NotificationVariantInput */
export interface CategorySourceInput {
  type: NotificationType
  resourceType: string | null
  actionUrl: string | null
}

// ---------------------------------------------------------------------------
// Mapa constante de configuração — encapsulado (não exportado)
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG_MAP: Record<NotificationCategory, CategoryConfig> = {
  ASSIGNMENTS: {
    label: 'Atribuições',
    icon: ArrowRightLeft,
    chipColor: 'bg-blue-500/10 text-blue-600',
    order: 1,
  },
  ACTIONS: {
    label: 'Ações',
    icon: UserPlus,
    chipColor: 'bg-blue-600/10 text-blue-700',
    order: 2,
  },
  ALERTS: {
    label: 'Alertas',
    icon: AlertTriangle,
    chipColor: 'bg-amber-500/10 text-amber-600',
    order: 3,
  },
  ANNOUNCEMENTS: {
    label: 'Comunicados',
    icon: Megaphone,
    chipColor: 'bg-purple-500/10 text-purple-600',
    order: 4,
  },
  NEWS: {
    label: 'Novidades',
    icon: Sparkles,
    chipColor: 'bg-violet-500/10 text-violet-600',
    order: 5,
  },
  OFFERS: {
    label: 'Ofertas',
    icon: Tag,
    chipColor: 'bg-emerald-500/10 text-emerald-600',
    order: 6,
  },
  FEEDBACK: {
    label: 'Feedback',
    icon: MessageSquare,
    chipColor: 'bg-sky-500/10 text-sky-600',
    order: 7,
  },
  REMINDERS: {
    label: 'Lembretes',
    icon: Clock,
    chipColor: 'bg-orange-500/10 text-orange-600',
    order: 8,
  },
  GENERAL: {
    label: 'Geral',
    icon: Info,
    chipColor: 'bg-muted text-muted-foreground',
    order: 9,
  },
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Retorna a configuração visual (label, ícone, cor) de uma categoria.
 */
export function getCategoryConfig(
  category: NotificationCategory,
): CategoryConfig {
  return CATEGORY_CONFIG_MAP[category]
}

/**
 * Deriva a categoria a partir dos campos de origem da notificação.
 * ÚNICA fonte de verdade da derivação — espelhada pelo backfill SQL e usada na
 * criação de notificações que não informam category explícita.
 *
 * Regra (alinhada com resolveNotificationVariant):
 * 1. SYSTEM                                                  → ALERTS
 * 2. PLATFORM_ANNOUNCEMENT                                   → ANNOUNCEMENTS
 * 3. USER_ACTION + resourceType=member + actionUrl=/invite/  → ACTIONS
 * 4. USER_ACTION + resourceType=member (sem invite)          → ANNOUNCEMENTS
 * 5. USER_ACTION + qualquer outro resourceType               → ASSIGNMENTS
 */
export function resolveCategoryFromSource(
  input: CategorySourceInput,
): NotificationCategory {
  if (input.type === 'SYSTEM') {
    return 'ALERTS'
  }

  if (input.type === 'PLATFORM_ANNOUNCEMENT') {
    return 'ANNOUNCEMENTS'
  }

  // A partir daqui: type === 'USER_ACTION'
  if (input.resourceType === 'member') {
    const isInviteUrl = input.actionUrl?.includes('/invite/') ?? false
    return isInviteUrl ? 'ACTIONS' : 'ANNOUNCEMENTS'
  }

  return 'ASSIGNMENTS'
}

/**
 * Lista de categorias ordenada — usada para montar as tabs de filtro.
 */
export function getOrderedCategories(): NotificationCategory[] {
  return (Object.keys(CATEGORY_CONFIG_MAP) as NotificationCategory[]).sort(
    (first, second) =>
      CATEGORY_CONFIG_MAP[first].order - CATEGORY_CONFIG_MAP[second].order,
  )
}
