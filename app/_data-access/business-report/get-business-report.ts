import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { costItemSchema } from '@/_actions/business-report/update-business-report/schema'
import type { BusinessReportDto } from './types'

const DEFAULT_TARGET_MARGIN = 30

const fetchBusinessReportFromDb = async (): Promise<BusinessReportDto> => {
  const report = await db.businessReport.findUnique({
    where: { singletonKey: 'singleton' },
  })

  if (!report) {
    // Primeira visita — devolve defaults sem gravar (a action grava no primeiro submit)
    return {
      id: '',
      costItems: [],
      aiMonthlyCostBrl: 0,
      targetMarginPct: DEFAULT_TARGET_MARGIN,
      updatedAt: new Date(0).toISOString(),
      updatedById: null,
    }
  }

  // `costItems` é Json no banco — validamos em runtime em vez de confiar num
  // cast cego. JSON legado/malformado cai em [] sem quebrar a UI.
  const parsedCostItems = costItemSchema.array().safeParse(report.costItems)

  return {
    id: report.id,
    costItems: parsedCostItems.success ? parsedCostItems.data : [],
    aiMonthlyCostBrl: report.aiMonthlyCostBrl.toNumber(),
    targetMarginPct: report.targetMarginPct.toNumber(),
    updatedAt: report.updatedAt.toISOString(),
    updatedById: report.updatedById,
  }
}

export const getBusinessReport = cache(async (): Promise<BusinessReportDto> => {
  const getCached = unstable_cache(
    () => fetchBusinessReportFromDb(),
    ['business-report-singleton'],
    // Sem TTL (revalidate infinito) — o conteúdo só muda via action explícita
    { tags: ['business-report'] },
  )
  return getCached()
})
