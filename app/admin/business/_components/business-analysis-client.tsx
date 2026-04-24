'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { updateBusinessReport } from '@/_actions/business-report/update-business-report'
import {
  updateBusinessReportSchema,
  type UpdateBusinessReportInput,
} from '@/_actions/business-report/update-business-report/schema'
import type { BusinessReportDto } from '@/_data-access/business-report/types'
import {
  computeBusinessMetrics,
  type PlanBaseline,
} from '@/admin/business/_lib/business-calculations'
import { BusinessParametersForm } from './business-parameters-form'
import { BusinessPlanDistribution } from './business-plan-distribution'
import { BusinessKpiCards } from './business-kpi-cards'

interface BusinessAnalysisClientProps {
  baseline: PlanBaseline[]
  report: BusinessReportDto
}

export function BusinessAnalysisClient({
  baseline,
  report,
}: BusinessAnalysisClientProps) {
  const form = useForm<UpdateBusinessReportInput>({
    resolver: zodResolver(updateBusinessReportSchema),
    defaultValues: {
      costItems: report.costItems,
      aiMonthlyCostBrl: report.aiMonthlyCostBrl,
      targetMarginPct: report.targetMarginPct,
    },
  })

  const { execute, isPending } = useAction(updateBusinessReport, {
    onSuccess: () => {
      toast.success('Parâmetros salvos com sucesso.')
      // Marca o form como limpo após salvar para desabilitar o botão
      form.reset(form.getValues())
    },
    onError: ({ error }) => {
      const message =
        error.serverError ?? 'Erro ao salvar parâmetros. Tente novamente.'
      toast.error(message)
    },
  })

  const values = form.watch()

  const metrics = useMemo(
    () =>
      computeBusinessMetrics(baseline, {
        costItems: (values.costItems ?? []).map((item) => ({
          name: item.name,
          amount: Number(item.amount) || 0,
        })),
        aiMonthlyCostBrl: Number(values.aiMonthlyCostBrl) || 0,
        targetMarginPct: Number(values.targetMarginPct) || 0,
      }),
    [baseline, values],
  )

  const handleSubmit = (data: UpdateBusinessReportInput) => {
    execute(data)
  }

  const lastUpdatedLabel = (() => {
    if (!report.id) return 'Nunca atualizado'
    const date = new Date(report.updatedAt)
    // Ignorar a data epoch (primeira visita sem registro)
    if (date.getTime() === 0) return 'Nunca atualizado'
    return `Última atualização: ${format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`
  })()

  return (
    <div className="flex flex-col gap-6">
      {/* Subtítulo de auditoria */}
      <p className="text-xs text-muted-foreground">{lastUpdatedLabel}</p>

      {/* Formulário inline de parâmetros */}
      <BusinessParametersForm
        form={form}
        onSubmit={handleSubmit}
        isPending={isPending}
      />

      {/* Tabela de distribuição por plano */}
      <BusinessPlanDistribution metrics={metrics} />

      {/* KPI cards — só renderiza quando há clientes ativos */}
      {metrics.totalCustomers > 0 && (
        <BusinessKpiCards metrics={metrics} baseline={baseline} />
      )}
    </div>
  )
}
