'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInDays, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Building2, Clock, Plus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { extendTrial } from '@/_actions/admin/extend-trial'
import type { AdminOrganizationDto } from '@/_data-access/admin/types'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Ativo',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  trialing: {
    label: 'Trial',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  past_due: {
    label: 'Inadimplente',
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400',
  },
  canceled: {
    label: 'Cancelado',
    className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
  },
  unpaid: {
    label: 'Não pago',
    className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
  },
}

function getTrialInfo(trialEndsAt: Date | null) {
  if (!trialEndsAt) return null

  const now = new Date()
  const expired = isPast(trialEndsAt)
  const daysRemaining = differenceInDays(trialEndsAt, now)

  return { expired, daysRemaining, endsAt: trialEndsAt }
}

interface OrganizationsTableProps {
  organizations: AdminOrganizationDto[]
}

export const OrganizationsTable = ({ organizations }: OrganizationsTableProps) => {
  const router = useRouter()
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
  const [daysToAdd, setDaysToAdd] = useState('7')

  const { execute: executeExtend, status: extendStatus } = useAction(extendTrial, {
    onSuccess: () => {
      toast.success('Trial estendido com sucesso.')
      setOpenPopoverId(null)
      setDaysToAdd('7')
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao estender trial.')
    },
  })

  const handleExtendTrial = (organizationId: string) => {
    const days = parseInt(daysToAdd, 10)
    if (isNaN(days) || days < 1) {
      toast.error('Informe um número válido de dias.')
      return
    }
    executeExtend({ organizationId, days })
  }

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-16 text-center transition-all duration-200">
        <Building2 className="mb-4 h-10 w-10 text-muted-foreground/40" />
        <h3 className="text-sm font-semibold text-foreground">Nenhuma organização encontrada</h3>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Organização</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trial</TableHead>
            <TableHead className="text-right">Membros</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => {
            const statusInfo = org.subscription
              ? STATUS_MAP[org.subscription.status] ?? {
                  label: org.subscription.status,
                  className: '',
                }
              : null

            const trialInfo = getTrialInfo(org.trialEndsAt)

            return (
              <TableRow key={org.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{org.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{org.slug}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {org.subscription ? (
                    <Badge variant="secondary">{org.subscription.planName}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Sem plano
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {statusInfo ? (
                    <Badge variant="outline" className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
                  ) : org.trialEndsAt ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    >
                      Trial
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {trialInfo ? (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {trialInfo.expired ? (
                        <span className="text-sm text-red-600 dark:text-red-400">Expirado</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          <strong className="text-foreground">{trialInfo.daysRemaining}</strong>{' '}
                          {trialInfo.daysRemaining === 1 ? 'dia' : 'dias'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {org.memberCount}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {format(new Date(org.createdAt), "d 'de' MMM, yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Popover
                    open={openPopoverId === org.id}
                    onOpenChange={(open) => {
                      setOpenPopoverId(open ? org.id : null)
                      if (open) setDaysToAdd('7')
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium">Estender trial</p>
                          <p className="text-xs text-muted-foreground">{org.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            value={daysToAdd}
                            onChange={(event) => setDaysToAdd(event.target.value)}
                            className="h-8"
                            placeholder="Dias"
                          />
                          <span className="shrink-0 text-sm text-muted-foreground">dias</span>
                        </div>
                        {trialInfo && !trialInfo.expired && (
                          <p className="text-xs text-muted-foreground">
                            Trial atual até{' '}
                            {format(new Date(trialInfo.endsAt), "d 'de' MMM", { locale: ptBR })}
                          </p>
                        )}
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={extendStatus === 'executing'}
                          onClick={() => handleExtendTrial(org.id)}
                        >
                          {extendStatus === 'executing' ? 'Estendendo...' : 'Estender'}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
