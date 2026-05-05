'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Shield, Phone, Mail, Loader2, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { Switch } from '@/_components/ui/switch'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { toggleSuperAdmin } from '@/_actions/admin/toggle-super-admin'
import { toggleSupportAgent } from '@/_actions/admin/toggle-support-agent'
import { resendVerificationEmail } from '@/_actions/admin/resend-verification-email'
import type { AdminUserDto } from '@/_data-access/admin/types'

const CONFIRMATION_WORD = 'CONFIRMAR'

const ROLE_MAP: Record<string, { label: string; className: string }> = {
  OWNER: {
    label: 'Owner',
    className: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400',
  },
  ADMIN: {
    label: 'Admin',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  MEMBER: {
    label: 'Membro',
    className: '',
  },
}

function getInitials(fullName: string | null, email: string): string {
  const name = fullName ?? email
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface UsersTableProps {
  users: AdminUserDto[]
  isOwner: boolean
}

export const UsersTable = ({ users, isOwner }: UsersTableProps) => {
  const router = useRouter()

  // Estado do dialog de super admin
  const [pendingToggle, setPendingToggle] = useState<{
    userId: string
    userName: string
    newValue: boolean
  } | null>(null)
  const [adminKey,     setAdminKey]     = useState('')
  const [confirmation, setConfirmation] = useState('')

  // Estado do dialog de agente de suporte
  const [pendingSupportToggle, setPendingSupportToggle] = useState<{
    userId: string
    userName: string
    newValue: boolean
  } | null>(null)
  const [supportAgentKey,      setSupportAgentKey]      = useState('')
  const [supportConfirmation,  setSupportConfirmation]  = useState('')
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)

  const { execute, status } = useAction(toggleSuperAdmin, {
    onSuccess: ({ data }) => {
      toast.success(
        data?.isSuperAdmin
          ? 'Usuário promovido a super admin.'
          : 'Super admin removido do usuário.',
      )
      closeDialog()
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao alterar permissão.')
    },
  })

  const { execute: executeResend } = useAction(resendVerificationEmail, {
    onSuccess: () => {
      toast.success('E-mail de verificação reenviado com sucesso.')
      setResendingEmail(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao reenviar e-mail de verificação.')
      setResendingEmail(null)
    },
  })

  const handleResendVerification = (email: string) => {
    setResendingEmail(email)
    executeResend({ email })
  }

  const { execute: executeSupportToggle, status: supportStatus } = useAction(toggleSupportAgent, {
    onSuccess: ({ data }) => {
      toast.success(
        data?.isSupportAgent
          ? 'Usuário habilitado como agente de suporte.'
          : 'Acesso de agente de suporte removido.',
      )
      closeSupportDialog()
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao alterar permissão de suporte.')
    },
  })

  const openDialog = (userId: string, userName: string, newValue: boolean) => {
    setAdminKey('')
    setConfirmation('')
    setPendingToggle({ userId, userName, newValue })
  }

  const closeDialog = () => {
    if (status === 'executing') return
    setPendingToggle(null)
    setAdminKey('')
    setConfirmation('')
  }

  const openSupportDialog = (userId: string, userName: string, newValue: boolean) => {
    setSupportAgentKey('')
    setSupportConfirmation('')
    setPendingSupportToggle({ userId, userName, newValue })
  }

  const closeSupportDialog = () => {
    if (supportStatus === 'executing') return
    setPendingSupportToggle(null)
    setSupportAgentKey('')
    setSupportConfirmation('')
  }

  const handleConfirm = () => {
    if (!pendingToggle) return
    execute({
      userId:       pendingToggle.userId,
      adminKey,
      confirmation,
    })
  }

  const canConfirm =
    adminKey.length > 0 &&
    confirmation === CONFIRMATION_WORD &&
    status !== 'executing'

  const handleSupportConfirm = () => {
    if (!pendingSupportToggle) return
    executeSupportToggle({
      userId:       pendingSupportToggle.userId,
      adminKey:     supportAgentKey,
      confirmation: supportConfirmation,
    })
  }

  const canConfirmSupport =
    supportAgentKey.length > 0 &&
    supportConfirmation === CONFIRMATION_WORD &&
    supportStatus !== 'executing'

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-16 text-center transition-all duration-200">
        <Users className="mb-4 h-10 w-10 text-muted-foreground/40" />
        <h3 className="text-sm font-semibold text-foreground">Nenhum usuário encontrado</h3>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Usuário</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Organizações</TableHead>
              <TableHead>Super Admin</TableHead>
              <TableHead>Agente de Suporte</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage
                        src={user.avatarUrl ?? undefined}
                        alt={user.fullName ?? user.email}
                      />
                      <AvatarFallback className="text-xs font-medium">
                        {getInitials(user.fullName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {user.fullName ?? '—'}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            {user.emailVerifiedAt ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                            ) : (
                              <Clock className="h-3 w-3 shrink-0 text-amber-500" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            {user.emailVerifiedAt
                              ? `Verificado em ${format(user.emailVerifiedAt, "d 'de' MMM, yyyy", { locale: ptBR })}`
                              : 'Aguardando verificação'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {user.phone ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {user.phone}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.organizations.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Nenhuma</span>
                    ) : (
                      user.organizations.map((org) => {
                        const roleInfo = ROLE_MAP[org.role] ?? { label: org.role, className: '' }
                        return (
                          <Tooltip key={org.slug} delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className={`cursor-default text-xs ${roleInfo.className}`}
                              >
                                {org.name}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{roleInfo.label}</TooltipContent>
                          </Tooltip>
                        )
                      })
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <Switch
                        checked={user.isSuperAdmin}
                        onCheckedChange={(checked) =>
                          openDialog(
                            user.id,
                            user.fullName ?? user.email,
                            checked,
                          )
                        }
                        disabled={status === 'executing'}
                      />
                    ) : (
                      user.isSuperAdmin && (
                        <span className="text-xs text-muted-foreground">Super Admin</span>
                      )
                    )}
                    {user.isSuperAdmin && (
                      <Shield className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <Switch
                        checked={user.isSupportAgent}
                        onCheckedChange={(checked) =>
                          openSupportDialog(
                            user.id,
                            user.fullName ?? user.email,
                            checked,
                          )
                        }
                        disabled={supportStatus === 'executing'}
                      />
                    ) : (
                      user.isSupportAgent && (
                        <span className="text-xs text-muted-foreground">Agente de Suporte</span>
                      )
                    )}
                    {user.isSupportAgent && (
                      <Shield className="h-3.5 w-3.5 text-blue-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger>
                      {formatDistanceToNow(new Date(user.updatedAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </TooltipTrigger>
                    <TooltipContent>
                      {format(new Date(user.updatedAt), "d 'de' MMM, yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {format(new Date(user.createdAt), "d 'de' MMM, yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={resendingEmail === user.email}
                        onClick={() => handleResendVerification(user.email)}
                      >
                        {resendingEmail === user.email
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Mail className="h-4 w-4 text-muted-foreground" />
                        }
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reenviar e-mail de verificação</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={pendingToggle !== null} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingToggle?.newValue ? 'Promover a super admin?' : 'Remover super admin?'}
            </DialogTitle>
            <DialogDescription>
              {pendingToggle?.newValue
                ? `${pendingToggle.userName} terá acesso completo ao painel Delfos e poderá gerenciar toda a plataforma.`
                : `${pendingToggle?.userName} perderá acesso ao painel Delfos.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-key">Senha de autorização</Label>
              <Input
                id="admin-key"
                type="password"
                placeholder="••••••••"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                autoComplete="off"
                disabled={status === 'executing'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Digite <span className="font-mono font-semibold">{CONFIRMATION_WORD}</span> para prosseguir
              </Label>
              <Input
                id="confirmation"
                placeholder={CONFIRMATION_WORD}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
                disabled={status === 'executing'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={status === 'executing'}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              {status === 'executing' ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingSupportToggle !== null} onOpenChange={(open) => { if (!open) closeSupportDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingSupportToggle?.newValue ? 'Habilitar agente de suporte?' : 'Remover acesso de suporte?'}
            </DialogTitle>
            <DialogDescription>
              {pendingSupportToggle?.newValue
                ? `${pendingSupportToggle.userName} poderá ser convidado como agente de suporte em organizações de clientes.`
                : `${pendingSupportToggle?.userName} perderá a habilitação de agente de suporte.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="support-agent-key">Senha de autorização</Label>
              <Input
                id="support-agent-key"
                type="password"
                placeholder="••••••••"
                value={supportAgentKey}
                onChange={(e) => setSupportAgentKey(e.target.value)}
                autoComplete="off"
                disabled={supportStatus === 'executing'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-confirmation">
                Digite <span className="font-mono font-semibold">{CONFIRMATION_WORD}</span> para prosseguir
              </Label>
              <Input
                id="support-confirmation"
                placeholder={CONFIRMATION_WORD}
                value={supportConfirmation}
                onChange={(e) => setSupportConfirmation(e.target.value)}
                autoComplete="off"
                disabled={supportStatus === 'executing'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeSupportDialog}
              disabled={supportStatus === 'executing'}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSupportConfirm}
              disabled={!canConfirmSupport}
            >
              {supportStatus === 'executing' ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
