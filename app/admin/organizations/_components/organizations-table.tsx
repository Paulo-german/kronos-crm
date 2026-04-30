'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInDays, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Building2, Clock, Loader2, Pencil, Plus, RefreshCw, Send, Trash2, UserPlus, Users, X } from 'lucide-react'
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
import { Label } from '@/_components/ui/label'
import { Switch } from '@/_components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/_components/ui/avatar'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { extendTrial } from '@/_actions/admin/extend-trial'
import { syncStripeSubscription } from '@/_actions/admin/sync-stripe-subscription'
import { adminInviteOwner } from '@/_actions/admin/admin-invite-owner'
import { adminUpdateOrganization } from '@/_actions/admin/admin-update-organization'
import { adminDeleteOrganization } from '@/_actions/admin/admin-delete-organization'
import { fetchAdminOrganizationMembers } from '@/_actions/admin/fetch-admin-organization-members'
import { adminUpdateMemberRole } from '@/_actions/admin/admin-update-member-role'
import { adminRemoveMember } from '@/_actions/admin/admin-remove-member'
import { adminCancelInvite } from '@/_actions/admin/admin-cancel-invite'
import { adminResendInvite } from '@/_actions/admin/admin-resend-invite'
import type { AdminOrganizationDto } from '@/_data-access/admin/types'
import type { AdminPlanListItem } from '@/_data-access/admin/get-admin-plans-list'
import type {
  AdminMemberAcceptedDto,
  AdminMemberPendingDto,
} from '@/_data-access/admin/get-admin-organization-members'

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Membro',
}

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

interface EditFormState {
  name: string
  slug: string
  niche: string
  isReadOnly: boolean
  planOverrideId: string
}

interface OrganizationsTableProps {
  organizations: AdminOrganizationDto[]
  plans: AdminPlanListItem[]
}

export const OrganizationsTable = ({ organizations, plans }: OrganizationsTableProps) => {
  const router = useRouter()

  // Popovers existentes
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
  const [daysToAdd, setDaysToAdd] = useState('7')
  const [openSyncPopoverId, setOpenSyncPopoverId] = useState<string | null>(null)
  const [stripeSubInput, setStripeSubInput] = useState('')
  const [stripeCustomerInput, setStripeCustomerInput] = useState('')
  const [openInvitePopoverId, setOpenInvitePopoverId] = useState<string | null>(null)
  const [inviteEmailInput, setInviteEmailInput] = useState('')

  // Edit sheet
  const [editOrgId, setEditOrgId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    slug: '',
    niche: '',
    isReadOnly: false,
    planOverrideId: '',
  })
  const [editAdminKey, setEditAdminKey] = useState('')

  // Delete dialog
  const [deleteOrg, setDeleteOrg] = useState<AdminOrganizationDto | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleteAdminKey, setDeleteAdminKey] = useState('')

  // Members sheet
  const [membersOrg, setMembersOrg] = useState<AdminOrganizationDto | null>(null)
  const [membersData, setMembersData] = useState<{
    accepted: AdminMemberAcceptedDto[]
    pending: AdminMemberPendingDto[]
  } | null>(null)

  // Member action dialogs
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    memberId: string
    email: string
    newRole: 'ADMIN' | 'MEMBER'
  } | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{ memberId: string; email: string } | null>(null)
  const [cancelTarget, setCancelTarget] = useState<{ memberId: string; email: string } | null>(null)
  const [memberAdminKey, setMemberAdminKey] = useState('')

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

  const { execute: executeInvite, status: inviteStatus } = useAction(adminInviteOwner, {
    onSuccess: () => {
      toast.success('Convite enviado com sucesso.')
      setOpenInvitePopoverId(null)
      setInviteEmailInput('')
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao enviar convite.')
    },
  })

  const { execute: executeSync, status: syncStatus } = useAction(syncStripeSubscription, {
    onSuccess: ({ data }) => {
      toast.success(`Subscription sincronizada (plano: ${data?.planSlug}, status: ${data?.status}).`)
      setOpenSyncPopoverId(null)
      setStripeSubInput('')
      setStripeCustomerInput('')
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao sincronizar subscription.')
    },
  })

  const { execute: executeUpdate, status: updateStatus } = useAction(adminUpdateOrganization, {
    onSuccess: () => {
      toast.success('Organização atualizada com sucesso.')
      setEditOrgId(null)
      setEditAdminKey('')
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar organização.')
    },
  })

  const { execute: executeFetchMembers, status: fetchMembersStatus } = useAction(
    fetchAdminOrganizationMembers,
    {
      onSuccess: ({ data }) => {
        if (data) setMembersData(data)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao carregar membros.')
      },
    },
  )

  const { execute: executeUpdateRole, status: updateRoleStatus } = useAction(adminUpdateMemberRole, {
    onSuccess: () => {
      toast.success('Papel atualizado.')
      setRoleChangeTarget(null)
      setMemberAdminKey('')
      if (membersOrg) executeFetchMembers({ organizationId: membersOrg.id })
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar papel.')
    },
  })

  const { execute: executeRemoveMember, status: removeMemberStatus } = useAction(adminRemoveMember, {
    onSuccess: () => {
      toast.success('Membro removido.')
      setRemoveTarget(null)
      setMemberAdminKey('')
      if (membersOrg) executeFetchMembers({ organizationId: membersOrg.id })
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao remover membro.')
    },
  })

  const { execute: executeCancelInvite, status: cancelInviteStatus } = useAction(adminCancelInvite, {
    onSuccess: () => {
      toast.success('Convite cancelado.')
      setCancelTarget(null)
      if (membersOrg) executeFetchMembers({ organizationId: membersOrg.id })
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao cancelar convite.')
    },
  })

  const { execute: executeResendInvite, status: resendInviteStatus } = useAction(adminResendInvite, {
    onSuccess: () => {
      toast.success('Convite reenviado.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao reenviar convite.')
    },
  })

  const { execute: executeDelete, status: deleteStatus } = useAction(adminDeleteOrganization, {
    onSuccess: () => {
      toast.success('Organização deletada.')
      setDeleteOrg(null)
      setDeleteConfirmName('')
      setDeleteAdminKey('')
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao deletar organização.')
    },
  })

  const handleSync = (organizationId: string) => {
    const trimmedSub = stripeSubInput.trim()
    if (!trimmedSub.startsWith('sub_')) {
      toast.error('ID de subscription inválido (esperado sub_xxx).')
      return
    }
    const trimmedCustomer = stripeCustomerInput.trim()
    if (trimmedCustomer && !trimmedCustomer.startsWith('cus_')) {
      toast.error('Customer ID inválido (esperado cus_xxx).')
      return
    }
    executeSync({
      organizationId,
      stripeSubscriptionId: trimmedSub,
      stripeCustomerId: trimmedCustomer || undefined,
    })
  }

  const handleInvite = (organizationId: string) => {
    const email = inviteEmailInput.trim()
    if (!email) {
      toast.error('Informe um e-mail válido.')
      return
    }
    executeInvite({ organizationId, email })
  }

  const handleExtendTrial = (organizationId: string) => {
    const days = parseInt(daysToAdd, 10)
    if (isNaN(days) || days < 1) {
      toast.error('Informe um número válido de dias.')
      return
    }
    executeExtend({ organizationId, days })
  }

  const openMembersSheet = (org: AdminOrganizationDto) => {
    setMembersOrg(org)
    setMembersData(null)
    executeFetchMembers({ organizationId: org.id })
  }

  const openEditSheet = (org: AdminOrganizationDto) => {
    setEditForm({
      name: org.name,
      slug: org.slug,
      niche: org.niche ?? '',
      isReadOnly: org.isReadOnly,
      planOverrideId: org.planOverride?.id ?? '',
    })
    setEditAdminKey('')
    setEditOrgId(org.id)
  }

  const handleUpdate = () => {
    if (!editOrgId) return
    executeUpdate({
      organizationId: editOrgId,
      adminKey: editAdminKey,
      name: editForm.name,
      slug: editForm.slug,
      niche: editForm.niche || null,
      isReadOnly: editForm.isReadOnly,
      planOverrideId: editForm.planOverrideId || null,
    })
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
    <>
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
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-foreground">{org.name}</p>
                        {org.isReadOnly && (
                          <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400 text-[10px] py-0">
                            Read-only
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{org.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {org.planOverride ? (
                      <Badge variant="secondary" className="border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400">
                        {org.planOverride.name} ↑
                      </Badge>
                    ) : org.subscription ? (
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
                    <div className="flex items-center justify-end gap-1">
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

                      <Popover
                        open={openSyncPopoverId === org.id}
                        onOpenChange={(open) => {
                          setOpenSyncPopoverId(open ? org.id : null)
                          if (!open) {
                            setStripeSubInput('')
                            setStripeCustomerInput('')
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium">Sincronizar Stripe</p>
                              <p className="text-xs text-muted-foreground">{org.name}</p>
                            </div>
                            <Input
                              placeholder="sub_xxxxxxxxxxxx"
                              value={stripeSubInput}
                              onChange={(event) => setStripeSubInput(event.target.value)}
                              className="h-8 font-mono text-xs"
                            />
                            <Input
                              placeholder="cus_xxxxxxxxxxxx (opcional)"
                              value={stripeCustomerInput}
                              onChange={(event) => setStripeCustomerInput(event.target.value)}
                              className="h-8 font-mono text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                              Customer ID opcional — se omitido, é resolvido automaticamente pela subscription.
                            </p>
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={syncStatus === 'executing'}
                              onClick={() => handleSync(org.id)}
                            >
                              {syncStatus === 'executing' ? 'Sincronizando...' : 'Sincronizar'}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover
                        open={openInvitePopoverId === org.id}
                        onOpenChange={(open) => {
                          setOpenInvitePopoverId(open ? org.id : null)
                          if (!open) setInviteEmailInput('')
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium">Convidar OWNER</p>
                              <p className="text-xs text-muted-foreground">{org.name}</p>
                            </div>
                            <Input
                              type="email"
                              placeholder="email@empresa.com"
                              value={inviteEmailInput}
                              onChange={(event) => setInviteEmailInput(event.target.value)}
                              className="h-8"
                            />
                            <p className="text-xs text-muted-foreground">
                              O usuário receberá um e-mail e ao criar a conta entrará na organização como OWNER.
                            </p>
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={inviteStatus === 'executing'}
                              onClick={() => handleInvite(org.id)}
                            >
                              {inviteStatus === 'executing' ? 'Enviando...' : 'Enviar convite'}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditSheet(org)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteOrg(org)
                          setDeleteConfirmName('')
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openMembersSheet(org)}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Sheet de edição */}
      <Sheet open={editOrgId !== null} onOpenChange={(open) => { if (!open) setEditOrgId(null) }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar organização</SheetTitle>
          </SheetHeader>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={editForm.slug}
                onChange={(event) => setEditForm((prev) => ({ ...prev, slug: event.target.value }))}
              />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Mudar o slug altera todas as URLs da organização.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-niche">Nicho</Label>
              <Input
                id="edit-niche"
                placeholder="Ex: imobiliária, saúde..."
                value={editForm.niche}
                onChange={(event) => setEditForm((prev) => ({ ...prev, niche: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-plan-override">Plano forçado</Label>
              <Select
                value={editForm.planOverrideId || 'none'}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, planOverrideId: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger id="edit-plan-override">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Read-only</p>
                <p className="text-xs text-muted-foreground">Bloqueia mutações dentro da organização.</p>
              </div>
              <Switch
                checked={editForm.isReadOnly}
                onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, isReadOnly: checked }))}
              />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="edit-admin-key">Senha de autorização</Label>
            <Input
              id="edit-admin-key"
              type="password"
              placeholder="••••••••"
              value={editAdminKey}
              onChange={(event) => setEditAdminKey(event.target.value)}
              autoComplete="off"
            />
          </div>

          <SheetFooter className="mt-6 flex justify-end">
            <Button
              disabled={updateStatus === 'executing' || !editAdminKey}
              onClick={handleUpdate}
            >
              {updateStatus === 'executing' ? 'Salvando...' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet de membros */}
      <Sheet
        open={membersOrg !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMembersOrg(null)
            setMembersData(null)
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Membros — {membersOrg?.name}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {fetchMembersStatus === 'executing' && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {membersData && (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Membros ({membersData.accepted.length})
                  </p>
                  {membersData.accepted.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum membro ativo.</p>
                  ) : (
                    <div className="space-y-2">
                      {membersData.accepted.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 rounded-lg border border-border p-3"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={member.user?.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {(member.user?.fullName ?? member.email).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {member.user?.fullName ?? '—'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {ROLE_LABEL[member.role] ?? member.role}
                          </Badge>
                          {member.role !== 'OWNER' && (
                            <Select
                              value={member.role}
                              onValueChange={(value) => {
                                setRoleChangeTarget({
                                  memberId: member.id,
                                  email: member.email,
                                  newRole: value as 'ADMIN' | 'MEMBER',
                                })
                                setMemberAdminKey('')
                              }}
                            >
                              <SelectTrigger className="h-7 w-24 shrink-0 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                                <SelectItem value="MEMBER">Membro</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                            disabled={member.role === 'OWNER'}
                            onClick={() => {
                              setRemoveTarget({ memberId: member.id, email: member.email })
                              setMemberAdminKey('')
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {membersData.pending.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Convites pendentes ({membersData.pending.length})
                    </p>
                    <div className="space-y-2">
                      {membersData.pending.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center gap-3 rounded-lg border border-border p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{invite.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {ROLE_LABEL[invite.role] ?? invite.role} · Convidado em{' '}
                              {format(new Date(invite.invitedAt), "d 'de' MMM", { locale: ptBR })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            disabled={resendInviteStatus === 'executing'}
                            onClick={() => {
                              if (!membersOrg) return
                              executeResendInvite({
                                organizationId: membersOrg.id,
                                memberId: invite.id,
                              })
                            }}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                            onClick={() =>
                              setCancelTarget({ memberId: invite.id, email: invite.email })
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* AlertDialog: alterar papel */}
      <AlertDialog
        open={roleChangeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRoleChangeTarget(null)
            setMemberAdminKey('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar papel</AlertDialogTitle>
            <AlertDialogDescription>
              Alterar o papel de <strong>{roleChangeTarget?.email}</strong> para{' '}
              <strong>{roleChangeTarget?.newRole === 'ADMIN' ? 'Admin' : 'Membro'}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="role-admin-key">Senha de autorização</Label>
            <Input
              id="role-admin-key"
              type="password"
              placeholder="••••••••"
              value={memberAdminKey}
              onChange={(event) => setMemberAdminKey(event.target.value)}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!memberAdminKey || updateRoleStatus === 'executing'}
              onClick={() => {
                if (!roleChangeTarget || !membersOrg) return
                executeUpdateRole({
                  organizationId: membersOrg.id,
                  memberId: roleChangeTarget.memberId,
                  role: roleChangeTarget.newRole,
                  adminKey: memberAdminKey,
                })
              }}
            >
              {updateRoleStatus === 'executing' ? 'Salvando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: remover membro */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null)
            setMemberAdminKey('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Remover <strong>{removeTarget?.email}</strong> da organização. O acesso será revogado
              imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="remove-admin-key">Senha de autorização</Label>
            <Input
              id="remove-admin-key"
              type="password"
              placeholder="••••••••"
              value={memberAdminKey}
              onChange={(event) => setMemberAdminKey(event.target.value)}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!memberAdminKey || removeMemberStatus === 'executing'}
              onClick={() => {
                if (!removeTarget || !membersOrg) return
                executeRemoveMember({
                  organizationId: membersOrg.id,
                  memberId: removeTarget.memberId,
                  adminKey: memberAdminKey,
                })
              }}
            >
              {removeMemberStatus === 'executing' ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: cancelar convite */}
      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite</AlertDialogTitle>
            <AlertDialogDescription>
              Cancelar o convite de <strong>{cancelTarget?.email}</strong>. O link de convite
              deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelInviteStatus === 'executing'}
              onClick={() => {
                if (!cancelTarget || !membersOrg) return
                executeCancelInvite({
                  organizationId: membersOrg.id,
                  memberId: cancelTarget.memberId,
                })
              }}
            >
              {cancelInviteStatus === 'executing' ? 'Cancelando...' : 'Cancelar convite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de deleção */}
      <AlertDialog
        open={deleteOrg !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteOrg(null)
            setDeleteConfirmName('')
            setDeleteAdminKey('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar organização</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os dados da organização serão
              permanentemente apagados: membros, deals, contatos, conversas, agentes e subscription.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="delete-admin-key">Senha de autorização</Label>
              <Input
                id="delete-admin-key"
                type="password"
                placeholder="••••••••"
                value={deleteAdminKey}
                onChange={(event) => setDeleteAdminKey(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                Digite <strong className="text-foreground">{deleteOrg?.name}</strong> para confirmar:
              </p>
              <Input
                value={deleteConfirmName}
                onChange={(event) => setDeleteConfirmName(event.target.value)}
                placeholder={deleteOrg?.name}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                !deleteAdminKey ||
                deleteConfirmName !== deleteOrg?.name ||
                deleteStatus === 'executing'
              }
              onClick={() => {
                if (!deleteOrg) return
                executeDelete({
                  organizationId: deleteOrg.id,
                  adminKey: deleteAdminKey,
                  confirmName: deleteConfirmName,
                })
              }}
            >
              {deleteStatus === 'executing' ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
