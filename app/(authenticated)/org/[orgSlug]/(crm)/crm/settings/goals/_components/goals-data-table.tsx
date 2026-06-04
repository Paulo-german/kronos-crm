'use client'

import { useState, useCallback } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/_components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { deleteGoal } from '@/_actions/goal/delete-goal'
import type { GoalWithProgressDto } from '@/_data-access/goal/shared/goal-types'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import { GoalProgressCell } from './goal-progress-cell'
import { GoalTableDropdownMenu } from './goal-table-dropdown-menu'
import { GoalUpsertSheet } from './goal-upsert-sheet'

const GOAL_TYPE_LABELS: Record<string, string> = {
  REVENUE: 'Receita',
  DEALS_CLOSED: 'Negócios fechados',
  DEALS_OPENED: 'Negócios abertos',
  ACTIVITIES: 'Atividades',
  CONVERSATIONS: 'Conversas',
}

const GOAL_PERIOD_LABELS: Record<string, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
}

const GOAL_TYPE_BADGE_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'outline'
> = {
  REVENUE: 'default',
  DEALS_CLOSED: 'secondary',
  DEALS_OPENED: 'secondary',
  ACTIVITIES: 'outline',
  CONVERSATIONS: 'outline',
}

function formatTargetValue(goal: GoalWithProgressDto): string {
  if (goal.type === 'REVENUE') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(goal.targetValue)
  }
  return new Intl.NumberFormat('pt-BR').format(goal.targetValue)
}

function getScopeLabel(goal: GoalWithProgressDto): string {
  if (goal.scope === 'PIPELINE' && goal.targetPipelineName) {
    return `Funil: ${goal.targetPipelineName}`
  }
  if (goal.scope === 'MEMBER' && goal.targetUserName) {
    return `Vendedor: ${goal.targetUserName}`
  }
  return 'Organização'
}

function getPeriodLabel(goal: GoalWithProgressDto): string {
  const periodLabel = GOAL_PERIOD_LABELS[goal.period] ?? goal.period
  const month = format(goal.periodStart, 'MMM yyyy', { locale: ptBR })
  const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1)
  return `${periodLabel} • ${monthCapitalized}`
}

interface GoalsDataTableProps {
  data: GoalWithProgressDto[]
  pipelines: OrgPipelineDto[]
  members: AcceptedMemberDto[]
}

export function GoalsDataTable({
  data,
  pipelines,
  members,
}: GoalsDataTableProps) {
  const [editingGoal, setEditingGoal] = useState<GoalWithProgressDto | null>(
    null,
  )
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  const deleteAction = useAction(deleteGoal, {
    onSuccess: () => {
      toast.success('Meta excluída com sucesso!')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir meta.')
    },
  })

  const handleEdit = useCallback((goal: GoalWithProgressDto) => {
    setEditingGoal(goal)
    setIsEditSheetOpen(true)
  }, [])

  const handleEditSheetChange = (open: boolean) => {
    setIsEditSheetOpen(open)
    if (!open) {
      setEditingGoal(null)
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Meta</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((goal) => (
              <TableRow key={goal.id}>
                <TableCell>
                  <Badge variant={GOAL_TYPE_BADGE_VARIANTS[goal.type] ?? 'secondary'}>
                    {GOAL_TYPE_LABELS[goal.type] ?? goal.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getScopeLabel(goal)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getPeriodLabel(goal)}
                </TableCell>
                <TableCell className="font-medium">
                  {formatTargetValue(goal)}
                </TableCell>
                <TableCell>
                  <GoalProgressCell progress={goal.progress} />
                </TableCell>
                <TableCell>
                  <GoalTableDropdownMenu
                    goal={goal}
                    onEdit={handleEdit}
                    deleteAction={deleteAction}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Sheet de edição — estado elevado para fora da tabela */}
      <GoalUpsertSheet
        mode="edit"
        isOpen={isEditSheetOpen}
        onOpenChange={handleEditSheetChange}
        goal={editingGoal}
        pipelines={pipelines}
        members={members}
      />
    </>
  )
}
