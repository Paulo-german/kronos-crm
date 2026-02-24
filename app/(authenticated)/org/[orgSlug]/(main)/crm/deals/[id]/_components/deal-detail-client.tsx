'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CircleIcon,
  CircleCheck,
  CircleX,
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
import { updateDeal } from '@/_actions/deal/update-deal'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { MemberRole } from '@prisma/client'

import TabSummary from './tab-summary'

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
  contactsSlot: ReactNode
  productsTabSlot: ReactNode
  tasksTabSlot: ReactNode
  appointmentsTabSlot: ReactNode
}

const priorityConfig = {
  low: {
    label: 'BAIXA',
    color:
      'bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20 hover:text-zinc-400',
  },
  medium: {
    label: 'MÉDIA',
    color: 'bg-primary/20 text-primary hover:bg-primary/20 hover:text-primary',
  },
  high: {
    label: 'ALTA',
    color:
      'bg-amber-500/20 text-amber-500 hover:bg-amber-500/20 hover:text-amber-500',
  },
  urgent: {
    label: 'URGENTE',
    color: 'bg-red-500/20 text-red-500 hover:bg-red-500/20 hover:text-red-500',
  },
}

const statusConfig = {
  OPEN: {
    label: 'NOVO',
    color:
      'bg-kronos-blue/10 text-kronos-blue border-kronos-blue/20 hover:bg-kronos-blue/20',
    variant: 'secondary' as const,
  },
  IN_PROGRESS: {
    label: 'EM ANDAMENTO',
    color:
      'bg-kronos-purple/10 text-kronos-purple border-kronos-purple/20 hover:bg-kronos-purple/20',
    variant: 'secondary' as const,
  },
  WON: {
    label: 'VENDIDO',
    color:
      'bg-kronos-green/10 text-kronos-green border-kronos-green/20 hover:bg-kronos-green/20',
    variant: 'secondary' as const,
  },
  LOST: {
    label: 'PERDIDO',
    color:
      'bg-kronos-red/10 text-kronos-red border-kronos-red/20 hover:bg-kronos-red/20',
    variant: 'secondary' as const,
  },
  PAUSED: {
    label: 'PAUSADO',
    color:
      'bg-kronos-yellow/10 text-kronos-yellow border-kronos-yellow/20 hover:bg-kronos-yellow/20',
    variant: 'secondary' as const,
  },
}

const DealDetailClient = ({
  deal,
  members,
  currentUserId,
  userRole,
  lostReasons,
  contactsSlot,
  productsTabSlot,
  tasksTabSlot,
  appointmentsTabSlot,
}: DealDetailClientProps) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('summary')

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

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateDeal,
    {
      onSuccess: () => {
        toast.success('Deal atualizado com sucesso!', {
          position: 'bottom-right',
        })
        setIsTransferOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar deal.', {
          position: 'bottom-right',
        })
      },
    },
  )

  const handleTransfer = () => {
    if (selectedMemberId) {
      executeUpdate({ id: deal.id, assignedTo: selectedMemberId })
    }
  }

  const { execute: executeMarkWon, isPending: isMarkingWon } = useAction(
    markDealWon,
    {
      onSuccess: () => {
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

  const isPending = isMarkingWon || isMarkingLost || isReopening || isUpdating

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
    deal.assigneeId === currentUserId

  const assignableMembers = members.filter((m) => m.user?.fullName)

  return (
    <div className="flex h-fit flex-col gap-6 bg-background p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
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
                    className={`h-6 gap-1.5 px-2 text-xs font-semibold transition-colors ${statusConfig[deal.status].color}`}
                  >
                    <CircleIcon className="h-1.5 w-1.5 fill-current" />
                    {statusConfig[deal.status].label}
                  </Badge>
                  <Badge
                    className={`h-6 gap-1.5 px-2 text-xs font-semibold transition-colors ${priorityConfig[deal.priority].color}`}
                  >
                    {priorityConfig[deal.priority].label}
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
                  variant="ghost"
                  className="bg-primary/30 text-primary hover:bg-primary/40 hover:text-primary"
                  onClick={() => setIsLostOpen(true)}
                  disabled={isPending}
                >
                  <CircleX className="h-4 w-4" />
                  Marcar perda
                </Button>
                <Button
                  variant="ghost"
                  className="text-primary-dark hover:text-primary-dark bg-primary hover:bg-primary/90"
                  onClick={handleMarkWon}
                  disabled={isPending}
                >
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
        <TabsList className="grid h-12 w-full grid-cols-4 rounded-md border border-border/50 bg-tab/30">
          <TabsTrigger
            value="summary"
            className="rounded-md py-2 data-[state=active]:bg-card/80"
          >
            Resumo
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="rounded-md py-2 data-[state=active]:bg-card/80"
          >
            Produtos
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="rounded-md py-2 data-[state=active]:bg-card/80"
          >
            Tarefas
          </TabsTrigger>
          <TabsTrigger
            value="appointments"
            className="rounded-md py-2 data-[state=active]:bg-card/80"
          >
            Agendamentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <TabSummary
            deal={deal}
            contactsSlot={contactsSlot}
            onTabChange={setActiveTab}
          />
          <div className="mt-6 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCog className="h-4 w-4" />
              <span>Responsável pelo Deal:</span>
              <span className="font-medium text-foreground">
                {members.find((m) => m.userId === deal.assigneeId)?.user
                  ?.fullName || 'Não atribuído'}
              </span>
            </div>
          </div>
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
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Negociação</DialogTitle>
            <DialogDescription>
              Selecione o novo responsável por esta negociação.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-owner-deal">Novo Responsável</Label>
            <Select onValueChange={setSelectedMemberId}>
              <SelectTrigger id="new-owner-deal" className="mt-2 w-full">
                <SelectValue placeholder="Selecione um membro..." />
              </SelectTrigger>
              <SelectContent>
                {assignableMembers.map((m) => (
                  <SelectItem key={m.id} value={m.userId as string}>
                    {m.user?.fullName} ({m.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransferOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedMemberId || isPending}
            >
              Transferir
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
