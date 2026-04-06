'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Separator } from '@/_components/ui/separator'
import { Skeleton } from '@/_components/ui/skeleton'
import { previewPlanChange } from '@/_actions/billing/preview-plan-change'
import { updateSubscription } from '@/_actions/billing/update-subscription'
import type { PlanInfo } from '@/_lib/billing/plans-data'

interface PlanChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetPlan: PlanInfo | null
  interval: 'monthly' | 'yearly'
}

interface PreviewData {
  changeType: 'upgrade' | 'downgrade' | 'crossgrade'
  immediateCharge: number
  nextRenewalAmount: number
  currency: string
  nextBillingDate: string
  currentPlanName: string
  targetPlanName: string
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

function formatDate(dateString: string): string {
  return dateFormatter.format(new Date(dateString))
}

function resolveTargetPriceId(plan: PlanInfo, interval: 'monthly' | 'yearly'): string | null {
  if (interval === 'yearly' && plan.stripePriceIdAnnual) {
    return plan.stripePriceIdAnnual
  }
  return plan.stripePriceId ?? null
}

export function PlanChangeDialog({ open, onOpenChange, targetPlan, interval }: PlanChangeDialogProps) {
  const router = useRouter()
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSubmitting, startSubmitTransition] = useTransition()

  // Carrega o preview sempre que o dialog abre com um plano alvo válido
  useEffect(() => {
    if (!open || !targetPlan) {
      setPreview(null)
      return
    }

    const targetPriceId = resolveTargetPriceId(targetPlan, interval)
    if (!targetPriceId) return

    setIsLoadingPreview(true)
    setPreview(null)

    previewPlanChange({ targetPriceId })
      .then((result) => {
        if (result?.data) {
          setPreview(result.data)
        } else {
          toast.error('Não foi possível carregar o preview da mudança de plano.')
          onOpenChange(false)
        }
      })
      .catch(() => {
        toast.error('Erro ao carregar preview. Tente novamente.')
        onOpenChange(false)
      })
      .finally(() => {
        setIsLoadingPreview(false)
      })
  }, [open, targetPlan, interval, onOpenChange])

  function handleConfirm() {
    if (!targetPlan) return

    const targetPriceId = resolveTargetPriceId(targetPlan, interval)
    if (!targetPriceId) return

    startSubmitTransition(async () => {
      const result = await updateSubscription({ targetPriceId })

      if (result?.data?.success) {
        toast.success('Plano alterado com sucesso!')
        onOpenChange(false)
        router.refresh()
        return
      }

      const errorMessage =
        result?.serverError ?? 'Ocorreu um erro ao alterar o plano. Tente novamente.'
      toast.error(errorMessage)
    })
  }

  function getChangeTypeBadge(changeType: PreviewData['changeType']) {
    if (changeType === 'upgrade') {
      return (
        <Badge className="border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400">
          Upgrade
        </Badge>
      )
    }

    if (changeType === 'downgrade') {
      return (
        <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
          Downgrade
        </Badge>
      )
    }

    return (
      <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
        Alteração
      </Badge>
    )
  }

  const isLoading = isLoadingPreview
  const isBusy = isLoading || isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar plano</DialogTitle>
          <DialogDescription>
            Revise os detalhes da alteração antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        )}

        {!isLoading && preview && (
          <div className="space-y-4 py-2">
            {/* Indicador de transição de planos */}
            <div className="flex items-center gap-3">
              <span className="font-medium">{preview.currentPlanName}</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{preview.targetPlanName}</span>
              {getChangeTypeBadge(preview.changeType)}
            </div>

            <Separator />

            {/* Detalhes financeiros do upgrade/crossgrade */}
            {(preview.changeType === 'upgrade' || preview.changeType === 'crossgrade') && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cobrança agora (proporcional):</span>
                  <span className="font-medium">{formatCents(preview.immediateCharge)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Próxima renovação ({formatDate(preview.nextBillingDate)}):</span>
                  <span className="font-medium">{formatCents(preview.nextRenewalAmount)}</span>
                </div>
              </div>
            )}

            {/* Detalhes do downgrade */}
            {preview.changeType === 'downgrade' && (
              <div className="space-y-3 text-sm">
                <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-yellow-700 dark:text-yellow-300">
                  Os limites do novo plano se aplicam imediatamente. Não haverá cobrança agora.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Próxima renovação ({formatDate(preview.nextBillingDate)}):</span>
                  <span className="font-medium">{formatCents(preview.nextRenewalAmount)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isBusy || !preview}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirmar alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
