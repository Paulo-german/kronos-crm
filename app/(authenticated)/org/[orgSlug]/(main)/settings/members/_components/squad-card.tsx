'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { MoreHorizontal, Trash2, Users } from 'lucide-react'
import { Card, CardContent } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { deleteSquad } from '@/_actions/squad/delete-squad'
import type { SquadDto } from '@/_data-access/squad/get-squads'
import type { SquadType, SalesDistributionModel } from '@prisma/client'

interface SquadCardProps {
  squad: SquadDto
  canManage: boolean
  orgSlug: string
}

const SQUAD_TYPE_LABELS: Record<SquadType, string> = {
  SALES: 'Vendas',
  SUPPORT: 'Suporte',
  CS: 'Customer Success',
  GENERAL: 'Geral',
}

const DISTRIBUTION_MODEL_LABELS: Record<SalesDistributionModel, string> = {
  ROUND_ROBIN: 'Round Robin',
  LOYALTY: 'Fidelidade',
  UTILIZATION: 'Maior disponibilidade',
  MANUAL: 'Manual',
  PERFORMANCE_WEIGHTED: 'Por Performance',
  WEIGHTED: 'Round Robin Ponderado',
}

export function SquadCard({ squad, canManage, orgSlug }: SquadCardProps) {
  const router = useRouter()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteSquad,
    {
      onSuccess: () => {
        toast.success('Time excluído com sucesso.')
        setIsDeleteOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao excluir time.')
      },
    },
  )

  return (
    <>
      <div
        className="group cursor-pointer"
        onClick={() =>
          router.push(`/org/${orgSlug}/settings/members/squads/${squad.id}`)
        }
      >
        <Card className="flex min-h-[180px] flex-col transition-colors hover:border-primary/50">
          <CardContent className="flex flex-1 flex-col gap-3 p-5">
            {/* Header: tipo + dropdown */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {SQUAD_TYPE_LABELS[squad.type]}
              </Badge>

              {canManage && (
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mr-1 -mt-1 h-7 w-7 shrink-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setIsDeleteOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir equipe
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Nome + badge padrão + descrição */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold leading-tight">
                  {squad.name}
                </h3>
                {squad.isDefault && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Padrão
                  </Badge>
                )}
              </div>
              {squad.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {squad.description}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="mt-auto flex items-center gap-3 border-t pt-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {squad._count.members}{' '}
                  {squad._count.members === 1 ? 'membro' : 'membros'}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="ml-auto text-xs font-normal"
              >
                {DISTRIBUTION_MODEL_LABELS[squad.distributionModel]}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Excluir equipe?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a excluir
            <br />
            <span className="font-semibold text-foreground">
              a equipe &ldquo;{squad.name}&rdquo;
            </span>{' '}
            e remover todos os seus membros.
          </p>
        }
        icon={<Trash2 />}
        variant="destructive"
        onConfirm={() => executeDelete({ id: squad.id })}
        isLoading={isDeleting}
        confirmLabel="Excluir equipe"
      />
    </>
  )
}
