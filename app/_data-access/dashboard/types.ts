import type { ActivityType, TaskType } from '@prisma/client'

export interface DateRange {
  start: Date
  end: Date
}

export interface KpiMetrics {
  totalPipelineValue: number
  wonDealsValue: number
  avgTicket: number
  newLeadsCount: number
  prevPipelineValue: number
  prevWonDealsValue: number
  prevAvgTicket: number
  prevNewLeadsCount: number
}

export interface DealsByStatus {
  status: string
  count: number
}

export interface RevenueByMonth {
  month: string
  label: string
  revenue: number
  count: number
}

export interface FunnelStage {
  stageId: string
  stageName: string
  stageColor: string | null
  position: number
  count: number
  value: number
}

export interface RecentActivity {
  id: string
  type: ActivityType
  content: string
  createdAt: Date
  dealId: string
  dealTitle: string
  performerName: string | null
  performerAvatar: string | null
}

export interface PendingTask {
  id: string
  title: string
  type: TaskType
  dueDate: Date
  dealId: string
  dealTitle: string
}
