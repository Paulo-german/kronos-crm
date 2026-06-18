'use client'

import { useState, type ReactNode } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  ArrowRightLeft,
  SquareIcon,
  CircleCheck,
  CircleX,
  MoreVertical,
  RotateCcw,
  UserCog,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { BackButton } from '@/_components/layout/back-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { Badge } from '@/_components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'

import { markDealWon } from '@/_actions/deal/mark-deal-won'
import { reopenDeal } from '@/_actions/deal/reopen-deal'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { MemberRole } from '@prisma/client'

import TabSummary from './tab-summary'
import { useDealWonCelebration } from '../_hooks/use-deal-won-celebration'
import { STATUS_CONFIG } from '@/_lib/deal/deal-display-config'
import TransferDealDialog, {
  type MemberDto,
} from './dialogs/transfer-deal-dialog'
import TransferPipelineDialog from './dialogs/transfer-pipeline-dialog'
import MarkLostDialog from './dialogs/mark-lost-dialog'

interface DealDetailClientProps {
  deal: DealDetailsDto
  members: MemberDto[]
  currentUserId: string
  userRole: MemberRole
  lostReasons: { id: string; name: string }[]
  pipelineStageOptions: PipelineStageOption[]
  contactsSlot: ReactNode
  productsTabSlot: ReactNode
  tasksTabSlot: ReactNode
  appointmentsTabSlot: ReactNode
  orgSlug: string
}

const DealDetailClient = ({
  deal,
  members,
  currentUserId,
  userRole,
  lostReasons,
  pipelineStageOptions,
  contactsSlot,
  productsTabSlot,
  tasksTabSlot,
  appointmentsTabSlot,
  orgSlug,
}: DealDetailClientProps) => {
  const [activeTab, setActiveTab] = useState('summary')
  const { celebrate } = useDealWonCelebration()

  const [isLostOpen, setIsLostOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isPipelineTransferOpen, setIsPipelineTransferOpen] = useState(false)

  // Pipelines disponíveis como destino — exclui o pipeline atual e deduplica
  const availablePipelines = pipelineStageOptions.reduce<
    { pipelineId: string; pipelineName: string }[]
  >((acc, option) => {
    if (
      option.pipelineId !== deal.pipelineId &&
      !acc.find((pipeline) => pipeline.pipelineId === option.pipelineId)
    ) {
      acc.push({
        pipelineId: option.pipelineId,
        pipelineName: option.pipelineName,
      })
    }
    return acc
  }, [])

  const { execute: executeMarkWon, isPending: isMarkingWon } = useAction(
    markDealWon,
    {
      onSuccess: () => {
        celebrate()
        toast.success('🎉 Deal marcado como ganho!', {
          position: 'bottom-right',
        })
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao marcar como ganho.', {
          position: 'bottom-right',
        })
      },
    },
  )

  const { execute: executeReopen, isPending: isReopening } = useAction(
    reopenDeal,
    {
      onSuccess: () => {
        toast.success('Negociação retomada com sucesso!', {
          position: 'bottom-right',
        })
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao retomar negociação.', {
          position: 'bottom-right',
        })
      },
    },
  )

  const isPending = isMarkingWon || isReopening

  const handleMarkWon = () => {
    executeMarkWon({ dealId: deal.id })
  }

  const handleReopen = () => {
    executeReopen({ dealId: deal.id })
  }

  // Permissão: Admin, Owner ou se for o dono do deal
  const canTransfer =
    userRole === 'ADMIN' ||
    userRole === 'OWNER' ||
    userRole === 'SUPPORT' ||
    deal.assigneeId === currentUserId

  return (
    <div className="flex h-fit flex-col gap-6 bg-background p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <BackButton
            orgSlug={orgSlug}
            fallbackPath={`/org/${orgSlug}/crm/deals/pipeline`}
          />
        </div>

        <div className="flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{deal.title}</h1>
            <Badge
              variant="outline"
              className={`h-6 gap-1.5 px-2 text-[10px] font-semibold transition-colors ${STATUS_CONFIG[deal.status].textClassName}`}
            >
              <SquareIcon size={10} className="fill-current" />
              {STATUS_CONFIG[deal.status].label}
            </Badge>
          </div>
          <div className="flex items-center gap-2.5">
            {canTransfer &&
              (userRole !== 'MEMBER' || availablePipelines.length > 0) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" disabled={isPending}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {userRole !== 'MEMBER' && (
                      <DropdownMenuItem onClick={() => setIsTransferOpen(true)}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Transferir responsável
                      </DropdownMenuItem>
                    )}
                    {availablePipelines.length > 0 && (
                      <DropdownMenuItem
                        onClick={() => setIsPipelineTransferOpen(true)}
                      >
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Transferir pipeline
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            {deal.status === 'WON' || deal.status === 'LOST' ? (
              <Button
                onClick={handleReopen}
                disabled={isPending}
                variant="outline"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Retomar Negociação
              </Button>
            ) : (
              <>
                <Button
                  variant="soft"
                  onClick={() => setIsLostOpen(true)}
                  disabled={isPending}
                >
                  <CircleX className="h-4 w-4" />
                  Marcar perda
                </Button>
                <Button onClick={handleMarkWon} disabled={isPending}>
                  <CircleCheck className="h-4 w-4" />
                  Marcar venda
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-fit">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="products">
            Produtos
            {deal.counts.lineItems > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {deal.counts.lineItems}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tarefas
            {deal.counts.tasks > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {deal.counts.tasks}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="appointments">
            Agendamentos
            {deal.counts.appointments > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {deal.counts.appointments}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <TabSummary
            deal={deal}
            contactsSlot={contactsSlot}
            onTabChange={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          {productsTabSlot}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          {tasksTabSlot}
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          {appointmentsTabSlot}
        </TabsContent>
      </Tabs>

      <TransferDealDialog
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
        dealId={deal.id}
        contacts={deal.contacts}
        members={members}
      />

      <TransferPipelineDialog
        open={isPipelineTransferOpen}
        onOpenChange={setIsPipelineTransferOpen}
        dealId={deal.id}
        availablePipelines={availablePipelines}
        pipelineStageOptions={pipelineStageOptions}
      />

      <MarkLostDialog
        open={isLostOpen}
        onOpenChange={setIsLostOpen}
        dealId={deal.id}
        lostReasons={lostReasons}
      />
    </div>
  )
}

export default DealDetailClient
