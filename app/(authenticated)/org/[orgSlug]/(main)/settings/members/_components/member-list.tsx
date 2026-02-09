'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  MoreHorizontal,
  RefreshCw,
  X,
  Loader2,
  Trash2,
  UserCog,
  TrashIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { Badge } from '@/_components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from '@/_components/ui/dropdown-menu'
import { cancelInvite } from '@/_actions/organization/cancel-invite'
import { resendInvite } from '@/_actions/organization/resend-invite'
import { removeMember } from '@/_actions/organization/remove-member'
import { updateMemberRole } from '@/_actions/organization/update-member-role'
import type { MemberRole, MemberStatus } from '@prisma/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogTrigger,
} from '@/_components/ui/alert-dialog'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'

interface Member {
  id: string
  email: string
  role: MemberRole
  status: MemberStatus
  user?: {
    fullName: string | null
    avatarUrl: string | null
  } | null
  joinedAt?: Date
  invitedAt?: Date
}

interface MemberListProps {
  title: string
  members: Member[]
  type: 'ACCEPTED' | 'PENDING'
  currentUserRole: MemberRole
}

const roleMap: Record<MemberRole, string> = {
  OWNER: 'Dono',
  ADMIN: 'Admin',
  MEMBER: 'Membro',
}

export function MemberList({
  title,
  members,
  type,
  currentUserRole,
}: MemberListProps) {
  const isAdminOrOwner =
    currentUserRole === 'ADMIN' || currentUserRole === 'OWNER'

  const { execute: executeCancel, isPending: isCanceling } = useAction(
    cancelInvite,
    {
      onSuccess: () => {
        toast.success('Convite cancelado.')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao cancelar convite.')
      },
    },
  )

  const { execute: executeResend, isPending: isResending } = useAction(
    resendInvite,
    {
      onSuccess: () => {
        toast.success('Convite reenviado.')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao reenviar convite.')
      },
    },
  )

  const { execute: executeRemove, isPending: isRemoving } = useAction(
    removeMember,
    {
      onSuccess: () => {
        toast.success('Membro removido com sucesso.')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao remover membro.')
      },
    },
  )

  const { execute: executeUpdateRole, isPending: isUpdatingRole } = useAction(
    updateMemberRole,
    {
      onSuccess: () => {
        toast.success('Função alterada com sucesso.')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao alterar função.')
      },
    },
  )

  const isLoading = isCanceling || isResending || isRemoving || isUpdatingRole
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                {type === 'ACCEPTED' ? 'Entrou em' : 'Convidado em'}
              </TableHead>
              {isAdminOrOwner && <TableHead className="w-[50px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user?.avatarUrl || ''} />
                      <AvatarFallback>
                        {member.user?.fullName?.[0]?.toUpperCase() ||
                          member.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {member.user?.fullName || '---'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {member.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{roleMap[member.role]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={type === 'ACCEPTED' ? 'default' : 'secondary'}
                  >
                    {type === 'ACCEPTED' ? 'Ativo' : 'Pendente'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(
                    type === 'ACCEPTED' ? member.joinedAt! : member.invitedAt!,
                  ).toLocaleDateString('pt-BR')}
                </TableCell>
                {isAdminOrOwner && (
                  <TableCell>
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {type === 'PENDING' ? (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  executeResend({ memberId: member.id })
                                }
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reenviar convite
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  executeCancel({ memberId: member.id })
                                }
                              >
                                <X className="mr-2 h-4 w-4" />
                                Cancelar convite
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger
                                  disabled={member.role === 'OWNER'}
                                >
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Alterar função
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem
                                    disabled={member.role === 'MEMBER'}
                                    onClick={() =>
                                      executeUpdateRole({
                                        memberId: member.id,
                                        role: 'MEMBER',
                                      })
                                    }
                                  >
                                    Membro
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={member.role === 'ADMIN'}
                                    onClick={() =>
                                      executeUpdateRole({
                                        memberId: member.id,
                                        role: 'ADMIN',
                                      })
                                    }
                                  >
                                    Admin
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />

                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  disabled={member.role === 'OWNER'}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remover membro
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ConfirmationDialogContent
                        title="Excluir membro selecionado?"
                        description={
                          <p>
                            Esta ação não pode ser desfeita. Você está prestes a
                            remover
                            <br />
                            <span className="font-semibold text-foreground">
                              o membro {member.user?.fullName} permanentemente
                              do sistema.
                            </span>
                          </p>
                        }
                        icon={<TrashIcon />}
                        variant="destructive"
                      >
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => executeRemove({ memberId: member.id })}
                        >
                          Sim, excluir
                        </AlertDialogAction>
                      </ConfirmationDialogContent>
                    </AlertDialog>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
