'use client'

import { useState, type ReactNode } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useSmartNavigation } from '@/_hooks/use-smart-navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRightLeft,
  CircleIcon,
  CircleCheck,
  CircleX,
  Loader2,
  RotateCcw,
  UserCog,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { Badge } from '@/_components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Label } from '@/_components/ui/label'

import { markDealWon } from '@/_actions/deal/mark-deal-won'
import { markDealLost } from '@/_actions/deal/mark-deal-lost'
import { reopenDeal } from '@/_actions/deal/reopen-deal'
import { transferDeal } from '@/_actions/deal/transfer-deal'
import { transferDealToPipeline } from '@/_actions/deal/transfer-deal-to-pipeline'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { MemberRole } from '@prisma/client'
import { Checkbox } from '@/_components/ui/checkbox'

import TabSummary from './tab-summary'
import { useDealWonCelebration } from '../_hooks/use-deal-won-celebration'
import { PRIORITY_CONFIG, STATUS_CONFIG } from '@/_lib/deal/deal-display-config'

interface MemberDto {
  id: string
  userId: string | null
  email: string
  user: {
    fullName: string | null
    avatarUrl: string | null
  } | null
}

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
  const { handleBack } = useSmartNavigation({
    fallbackPath: `/org/${orgSlug}/crm/deals/pipeline`,
  })
  const [activeTab, setActiveTab] = useState('summary')
  const { celebrate } = useDealWonCelebration()

  // Lost Logic
  const [isLostOpen, setIsLostOpen] = useState(false)
  const [selectedLostReason, setSelectedLostReason] = useState<
    string | undefined
  >(undefined)

  // Transfer Logic
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(
    undefined,
  )
  const [cascadeContacts, setCascadeContacts] = useState(true)

  const { execute: executeTransfer, isPending: isTransferring } = useAction(
    transferDeal,
    {
      onSuccess: () => {
        toast.success('Negociação transferida com sucesso!', {
          position: 'bottom-right',
        })
        setIsTransferOpen(false)
        setSelectedMemberId(undefined)
        setCascadeContacts(true)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao transferir negociação.', {
          position: 'bottom-right',
        })
      },
    },
  )

  const handleTransfer = () => {
    if (selectedMemberId) {
      executeTransfer({
        dealId: deal.id,
        newAssigneeId: selectedMemberId,
        cascadeContacts,
      })
    }
  }

  const handleCloseTransferDialog = (open: boolean) => {
    if (!open) {
      setSelectedMemberId(undefined)
      setCascadeContacts(true)
    }
    setIsTransferOpen(open)
  }

  // Pipeline Transfer Logic
  const [isPipelineTransferOpen, setIsPipelineTransferOpen] = useState(false)
  const [selectedTargetPipelineId, setSelectedTargetPipelineId] = useState<
    string | undefined
  >(undefined)
  const [selectedTargetStageId, setSelectedTargetStageId] = useState<
    string | undefined
  >(undefined)

  const {
    execute: executePipelineTransfer,
    isPending: isTransferringPipeline,
  } = useAction(transferDealToPipeline, {
    onSuccess: () => {
      toast.success('Negociação transferida para outro pipeline!', {
        position: 'bottom-right',
      })
      setIsPipelineTransferOpen(false)
      setSelectedTargetPipelineId(undefined)
      setSelectedTargetStageId(undefined)
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Erro ao transferir para outro pipeline.',
        { position: 'bottom-right' },
      )
    },
  })

  const handlePipelineTransfer = () => {
    if (selectedTargetPipelineId && selectedTargetStageId) {
      executePipelineTransfer({
        dealId: deal.id,
        targetPipelineId: selectedTargetPipelineId,
        targetStageId: selectedTargetStageId,
      })
    }
  }

  const handleClosePipelineTransferDialog = (open: boolean) => {
    if (!open) {
      setSelectedTargetPipelineId(undefined)
      setSelectedTargetStageId(undefined)
    }
    setIsPipelineTransferOpen(open)
  }

  // Pipelines disponíveis como destino — exclui o pipeline atual e deduplica
  const availablePipelines = pipelineStageOptions.reduce<
    { pipelineId: string; pipelineName: string }[]
  >((acc, opt) => {
    if (
      opt.pipelineId !== deal.pipelineId &&
      !acc.find((pipeline) => pipeline.pipelineId === opt.pipelineId)
    ) {
      acc.push({ pipelineId: opt.pipelineId, pipelineName: opt.pipelineName })
    }
    return acc
  }, [])

  // Etapas do pipeline de destino selecionado
  const availableTargetStages = pipelineStageOptions.filter(
    (opt) => opt.pipelineId === selectedTargetPipelineId,
  )

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

  const { execute: executeMarkLost, isPending: isMarkingLost } = useAction(
    markDealLost,
    {
      onSuccess: () => {
        toast.success('Deal marcado como perdido.', {
          position: 'bottom-right',
        })
        setIsLostOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao marcar como perdido.', {
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

  const isPending =
    isMarkingWon ||
    isMarkingLost ||
    isReopening ||
    isTransferring ||
    isTransferringPipeline

  const handleMarkWon = () => {
    executeMarkWon({ dealId: deal.id })
  }

  const handleMarkLost = () => {
    if (selectedLostReason) {
      executeMarkLost({ dealId: deal.id, lossReasonId: selectedLostReason })
    }
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

  const assignableMembers = members.filter((member) => member.user?.fullName)

  return (
    <div className="flex h-fit flex-col gap-6 bg-background p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex justify-between">
            <div>
              <h1 className="text-2xl font-bold">{deal.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <div className="mt-4 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`h-6 gap-1.5 px-2 text-xs font-semibold transition-colors ${STATUS_CONFIG[deal.status].badgeClassName}`}
                  >
                    <CircleIcon className="h-1.5 w-1.5 fill-current" />
                    {STATUS_CONFIG[deal.status].label}
                  </Badge>
                  <Badge
                    className={`h-6 gap-1.5 px-2 text-xs font-semibold transition-colors ${PRIORITY_CONFIG[deal.priority].badgeClassName}`}
                  >
                    {PRIORITY_CONFIG[deal.priority].label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2.5">
            {canTransfer && userRole !== 'MEMBER' && (
              <Button
                variant="outline"
                onClick={() => setIsTransferOpen(true)}
                disabled={isPending}
              >
                <UserCog className="mr-2 h-4 w-4" />
                Transferir Negociação
              </Button>
            )}

            {canTransfer && availablePipelines.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsPipelineTransferOpen(true)}
                disabled={isPending}
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transferir Pipeline
              </Button>
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
        <TabsList className="grid h-12 w-full grid-cols-4 border border-border/50 bg-tab/30">
          <TabsTrigger value="summary" className="rounded-md py-2">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5 rounded-md py-2">
            Produtos
            {deal.counts.lineItems > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {deal.counts.lineItems}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 rounded-md py-2">
            Tarefas
            {deal.counts.tasks > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {deal.counts.tasks}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="appointments" className="gap-1.5 rounded-md py-2">
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

      {/* Dialog de Transferência */}
      <Dialog open={isTransferOpen} onOpenChange={handleCloseTransferDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir Negociação</DialogTitle>
            <DialogDescription>
              Selecione o novo responsável por esta negociação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-owner-deal">Novo Responsável</Label>
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger id="new-owner-deal" className="w-full">
                  <SelectValue placeholder="Selecione um membro..." />
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.userId as string}>
                      {member.user?.fullName} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Checkbox de cascade para contatos vinculados */}
            <div
              className={`flex items-start gap-3 rounded-md border p-3 transition-opacity ${
                deal.contacts.length === 0 ? 'opacity-60' : ''
              }`}
            >
              <Checkbox
                id="cascade-contacts"
                checked={deal.contacts.length > 0 ? cascadeContacts : false}
                disabled={deal.contacts.length === 0}
                onCheckedChange={(checked) =>
                  setCascadeContacts(checked === true)
                }
                className="mt-0.5"
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="cascade-contacts"
                  className="cursor-pointer text-sm font-medium"
                >
                  Transferir também os contatos vinculados
                </Label>
                {deal.contacts.length > 0 ? (
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {deal.contacts.map((contact) => (
                      <li
                        key={contact.contactId}
                        className="flex items-center gap-1.5"
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                        {contact.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nenhum contato vinculado a este negócio.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleCloseTransferDialog(false)}
              disabled={isTransferring}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedMemberId || isTransferring}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferindo...
                </>
              ) : (
                'Transferir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Transferência de Pipeline */}
      <Dialog
        open={isPipelineTransferOpen}
        onOpenChange={handleClosePipelineTransferDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir para outro Pipeline</DialogTitle>
            <DialogDescription>
              Selecione o pipeline de destino e a etapa inicial para esta
              negociação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-pipeline">Pipeline de Destino</Label>
              <Select
                value={selectedTargetPipelineId}
                onValueChange={(value) => {
                  setSelectedTargetPipelineId(value)
                  setSelectedTargetStageId(undefined)
                }}
              >
                <SelectTrigger id="target-pipeline" className="w-full">
                  <SelectValue placeholder="Selecione um pipeline..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePipelines.map((pipeline) => (
                    <SelectItem
                      key={pipeline.pipelineId}
                      value={pipeline.pipelineId}
                    >
                      {pipeline.pipelineName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-stage">Etapa de Entrada</Label>
              <Select
                value={selectedTargetStageId}
                onValueChange={setSelectedTargetStageId}
                disabled={!selectedTargetPipelineId}
              >
                <SelectTrigger id="target-stage" className="w-full">
                  <SelectValue
                    placeholder={
                      selectedTargetPipelineId
                        ? 'Selecione uma etapa...'
                        : 'Selecione um pipeline primeiro...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableTargetStages.map((opt) => (
                    <SelectItem key={opt.stageId} value={opt.stageId}>
                      {opt.stageName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleClosePipelineTransferDialog(false)}
              disabled={isTransferringPipeline}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePipelineTransfer}
              disabled={!selectedTargetStageId || isTransferringPipeline}
            >
              {isTransferringPipeline ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferindo...
                </>
              ) : (
                'Transferir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Perda */}
      <Dialog open={isLostOpen} onOpenChange={setIsLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Perdido</DialogTitle>
            <DialogDescription>
              Por que esta negociação foi perdida?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="loss-reason">Motivo da Perda</Label>
            <Select onValueChange={setSelectedLostReason}>
              <SelectTrigger id="loss-reason" className="mt-2 w-full">
                <SelectValue placeholder="Selecione um motivo..." />
              </SelectTrigger>
              <SelectContent>
                {lostReasons.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    Nenhum motivo cadastrado.
                    <br />
                    Vá em Configurações para adicionar.
                  </div>
                ) : (
                  lostReasons.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLostOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleMarkLost}
              disabled={!selectedLostReason || isPending}
            >
              Confirmar Perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DealDetailClient
