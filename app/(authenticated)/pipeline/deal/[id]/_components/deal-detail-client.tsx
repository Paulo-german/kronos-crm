'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ArrowLeft, CircleIcon, Trophy, XCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { Badge } from '@/_components/ui/badge'
import { markDealWon } from '@/_actions/deal/mark-deal-won'
import { markDealLost } from '@/_actions/deal/mark-deal-lost'
import { reopenDeal } from '@/_actions/deal/reopen-deal'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import { formatCurrency } from '@/_helpers/format-currency'
import type { ProductDto } from '@/_data-access/product/get-products'
import TabSummary from '@/(authenticated)/pipeline/deal/[id]/_components/tab-summary'
import TabProducts from '@/(authenticated)/pipeline/deal/[id]/_components/tab-products'
import TabTasks from '@/(authenticated)/pipeline/deal/[id]/_components/tab-tasks'

interface DealDetailClientProps {
  deal: DealDetailsDto
  products: ProductDto[]
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

const DealDetailClient = ({ deal, products }: DealDetailClientProps) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('summary')

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

  const isPending = isMarkingWon || isMarkingLost || isReopening

  const formattedValue = formatCurrency(deal.totalValue)

  const handleMarkWon = () => {
    executeMarkWon({ dealId: deal.id })
  }

  const handleMarkLost = () => {
    executeMarkLost({ dealId: deal.id })
  }

  const handleReopen = () => {
    executeReopen({ dealId: deal.id })
  }

  return (
    <div className="flex h-fit flex-col gap-6 bg-background p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/pipeline')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="mt-4 flex gap-2.5">
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
                  className="bg-kronos-green text-white hover:bg-kronos-green/80 hover:text-white/80"
                  onClick={handleMarkWon}
                  disabled={isPending}
                >
                  <Trophy className="h-4 w-4" />
                  Ganhou
                </Button>
                <Button
                  variant="destructive"
                  className="bg-kronos-red text-white hover:bg-kronos-red/80 hover:text-white/80"
                  onClick={handleMarkLost}
                  disabled={isPending}
                >
                  <XCircle className="h-4 w-4" />
                  Perdeu
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{deal.title}</h1>
          <div className="flex flex-wrap items-center justify-between gap-2">
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
            <span className="text-lg font-semibold text-primary">
              {formattedValue}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-fit">
        <TabsList className="grid h-12 w-full grid-cols-3 border border-border/50 bg-tab/30">
          <TabsTrigger
            value="summary"
            className="py-2 data-[state=active]:bg-card/80"
          >
            Resumo
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="py-2 data-[state=active]:bg-card/80"
          >
            Produtos
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="py-2 data-[state=active]:bg-card/80"
          >
            Tarefas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <TabSummary deal={deal} />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <TabProducts deal={deal} products={products} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TabTasks deal={deal} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DealDetailClient
