export interface CostItem {
  name: string
  amount: number
}

export interface BusinessReportDto {
  id: string
  costItems: CostItem[]
  aiMonthlyCostBrl: number
  targetMarginPct: number
  updatedAt: string // ISO 8601
  updatedById: string | null
}
