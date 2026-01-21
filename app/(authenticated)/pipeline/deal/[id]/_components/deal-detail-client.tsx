'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ArrowLeft, Trophy, XCircle } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { Badge } from '@/_components/ui/badge'
import { markDealWon } from '@/_actions/deal/mark-deal-won'
import { markDealLost } from '@/_actions/deal/mark-deal-lost'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import { formatCurrency } from '@/_helpers/format-currency'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { ProductDto } from '@/_data-access/product/get-products'
import TabSummary from '@/(authenticated)/pipeline/deal/[id]/_components/tab-summary'
import TabProducts from '@/(authenticated)/pipeline/deal/[id]/_components/tab-products'
import TabActivities from '@/(authenticated)/pipeline/deal/[id]/_components/tab-activities'
import TabTasks from '@/(authenticated)/pipeline/deal/[id]/_components/tab-tasks'

interface DealDetailClientProps {
  deal: DealDetailsDto
  contacts: ContactDto[]
  products: ProductDto[]
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-zinc-500/20 text-zinc-400' },
  medium: { label: 'Média', color: 'bg-primary/20 text-primary' },
  high: { label: 'Alta', color: 'bg-amber-500/20 text-amber-500' },
  urgent: { label: 'Urgente', color: 'bg-red-500/20 text-red-500' },
}

const DealDetailClient = ({
  deal,
  contacts,
  products,
}: DealDetailClientProps) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('summary')

  const { execute: executeMarkWon, isPending: isMarkingWon } = useAction(
    markDealWon,
    {
      onSuccess: () => {
        toast.success('🎉 Deal marcado como ganho!')
        router.push('/pipeline')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao marcar como ganho.')
      },
    },
  )

  const { execute: executeMarkLost, isPending: isMarkingLost } = useAction(
    markDealLost,
    {
      onSuccess: () => {
        toast.success('Deal marcado como perdido.')
        router.push('/pipeline')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao marcar como perdido.')
      },
    },
  )

  const isPending = isMarkingWon || isMarkingLost

  const formattedValue = formatCurrency(deal.totalValue)

  const handleMarkWon = () => {
    if (!deal.wonStageId) {
      toast.error('Nenhuma etapa de ganho configurada no pipeline.')
      return
    }
    executeMarkWon({ dealId: deal.id })
  }

  const handleMarkLost = () => {
    if (!deal.lostStageId) {
      toast.error('Nenhuma etapa de perda configurada no pipeline.')
      return
    }
    executeMarkLost({ dealId: deal.id })
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-background p-6">
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

          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-[#00b37e] text-white hover:bg-[#04d361] hover:shadow-[0_0_20px_-5px_#00b37e]"
              onClick={handleMarkWon}
              disabled={isPending || deal.stageId === deal.wonStageId}
            >
              <Trophy className="mr-2 h-4 w-4" />
              Ganhou
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={handleMarkLost}
              disabled={isPending || deal.stageId === deal.lostStageId}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Perdeu
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{deal.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={priorityConfig[deal.priority].color}>
              {priorityConfig[deal.priority].label}
            </Badge>
            <Badge
              variant="outline"
              style={{ borderColor: deal.stageColor || '#6b7280' }}
            >
              {deal.stageName}
            </Badge>
            {deal.contactName && (
              <span className="text-sm text-muted-foreground">
                {deal.contactName}
              </span>
            )}
            {deal.companyName && (
              <span className="text-sm text-muted-foreground">
                • {deal.companyName}
              </span>
            )}
            <span className="ml-auto text-lg font-semibold text-primary">
              {formattedValue}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <TabSummary deal={deal} contacts={contacts} />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <TabProducts deal={deal} products={products} />
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <TabActivities deal={deal} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TabTasks deal={deal} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DealDetailClient
