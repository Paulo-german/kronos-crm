import { checkPlanQuota, type QuotaEntity } from '@/_lib/rbac/plan-limits'
import { cn } from '@/_lib/utils'

const ENTITY_LABELS: Record<QuotaEntity, string> = {
  contact: 'contatos',
  deal: 'negocios',
  product: 'produtos',
  member: 'membros',
  agent: 'agentes IA',
  inbox: 'caixas de entrada',
}

interface QuotaHintProps {
  orgId: string
  entity: QuotaEntity
}

export const QuotaHint = async ({ orgId, entity }: QuotaHintProps) => {
  const { current, limit } = await checkPlanQuota(orgId, entity)

  if (limit === 0) return null

  const pct = Math.round((current / limit) * 100)
  if (pct < 80) return null

  return (
    <span
      className={cn(
        'text-xs',
        pct >= 100
          ? 'text-destructive'
          : pct >= 90
            ? 'text-[hsl(var(--kronos-yellow))]'
            : 'text-muted-foreground',
      )}
    >
      {current} de {limit} {ENTITY_LABELS[entity]}
    </span>
  )
}
