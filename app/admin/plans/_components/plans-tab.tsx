'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  CircleIcon,
  Users,
  Building2,
  Box,
  Layers,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { deletePlan } from '@/_actions/admin/delete-plan'
import type { AdminPlanDto } from '@/_data-access/admin/types'

interface PlansTabProps {
  plans: AdminPlanDto[]
}

export const PlansTab = ({ plans }: PlansTabProps) => {
  const router = useRouter()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const { execute: executeDelete, status: deleteStatus } = useAction(deletePlan, {
    onSuccess: () => {
      toast.success('Plano excluído com sucesso.')
      setPendingDeleteId(null)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir plano.')
      setPendingDeleteId(null)
    },
  })

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return
    executeDelete({ planId: pendingDeleteId })
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {plans.length} {plans.length === 1 ? 'plano cadastrado' : 'planos cadastrados'}
          </p>
          <Button asChild size="sm">
            <Link href="/admin/plans/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo Plano
            </Link>
          </Button>
        </div>

        {/* Cards */}
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-16 text-center transition-all duration-200">
            <Layers className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <h3 className="text-sm font-semibold text-foreground">Nenhum plano cadastrado</h3>
            <p className="mt-1 text-xs text-muted-foreground/50">
              Crie um plano para começar a definir módulos e limites.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/admin/plans/new">
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro plano
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-none transition-all hover:bg-card/80 ${
                  !plan.isActive ? 'opacity-50' : ''
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-col gap-3 p-3.5">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    {plan.isActive ? (
                      <Badge
                        variant="outline"
                        className="h-6 gap-1.5 border-kronos-green/20 bg-kronos-green/10 px-2 text-[10px] font-semibold text-kronos-green transition-colors hover:bg-kronos-green/20"
                      >
                        <CircleIcon className="h-1.5 w-1.5 fill-current" />
                        ATIVO
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-6 gap-1.5 border-muted-foreground/30 px-2 text-[10px] font-semibold text-muted-foreground"
                      >
                        <CircleIcon className="h-1.5 w-1.5 fill-current" />
                        INATIVO
                      </Badge>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <Link href={`/admin/plans/${plan.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setPendingDeleteId(plan.id)}
                            disabled={deleteStatus === 'executing'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Plan Name */}
                  <Link
                    href={`/admin/plans/${plan.id}`}
                    className="line-clamp-2 text-base font-semibold leading-tight text-foreground hover:text-primary"
                  >
                    {plan.name}
                  </Link>

                  {plan.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {plan.description}
                    </p>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center gap-4">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-kronos-purple">
                            <Users className="h-3 w-3" />
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {plan.activeSubscriptions}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {plan.activeSubscriptions}{' '}
                        {plan.activeSubscriptions === 1 ? 'assinante ativo' : 'assinantes ativos'}
                      </TooltipContent>
                    </Tooltip>

                    {plan.grantedOrganizations > 0 && (
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-kronos-purple">
                              <Building2 className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              {plan.grantedOrganizations}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {plan.grantedOrganizations}{' '}
                          {plan.grantedOrganizations === 1
                            ? 'org com override'
                            : 'orgs com override'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Modules Section */}
                <div className="flex flex-col gap-2 border-t border-border/50 p-3.5 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Módulos
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.modules.map((module) => (
                      <Badge
                        key={module.slug}
                        variant="outline"
                        className="h-6 gap-1.5 border-kronos-purple/20 bg-kronos-purple/10 px-2 text-[10px] font-semibold text-kronos-purple transition-colors hover:bg-kronos-purple/20"
                      >
                        <Box className="h-3 w-3" />
                        {module.name}
                      </Badge>
                    ))}
                    {plan.modules.length === 0 && (
                      <span className="text-xs italic text-muted-foreground/50">
                        Nenhum módulo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AlertDialog de confirmação */}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os limites e vínculos de módulos deste plano
              serão removidos. Planos com assinaturas ativas ou orgs com override não podem ser
              excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStatus === 'executing'}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteStatus === 'executing'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStatus === 'executing' ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
