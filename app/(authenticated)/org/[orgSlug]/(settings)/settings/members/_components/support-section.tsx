'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Headset, Loader2, MoreHorizontal, Trash2, TrashIcon } from 'lucide-react'
import { useState } from 'react'
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
} from '@/_components/ui/dropdown-menu'
import { removeMember } from '@/_actions/organization/remove-member'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { InviteSupportDialog } from './invite-support-dialog'
import type { MemberStatus } from '@prisma/client'

interface SupportMember {
  id: string
  email: string
  status: MemberStatus
  user?: {
    fullName: string | null
    avatarUrl: string | null
  } | null
  joinedAt?: Date
  invitedAt?: Date
}

interface SupportSectionProps {
  members: SupportMember[]
}

export function SupportSection({ members }: SupportSectionProps) {
  const [removingMember, setRemovingMember] = useState<SupportMember | null>(null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)

  const { execute: executeRemove, isPending: isRemoving } = useAction(removeMember, {
    onSuccess: () => {
      toast.success('Acesso de suporte revogado.')
      setIsRemoveDialogOpen(false)
      setRemovingMember(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao revogar acesso.')
    },
  })

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Headset className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Acesso de Suporte</CardTitle>
          </div>
          <InviteSupportDialog />
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum agente de suporte com acesso a esta organização.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.user?.avatarUrl ?? ''} />
                          <AvatarFallback>
                            {member.user?.fullName?.[0]?.toUpperCase() ??
                              member.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {member.user?.fullName ?? '—'}
                          </span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'ACCEPTED' ? 'default' : 'secondary'}>
                        {member.status === 'ACCEPTED' ? 'Ativo' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(
                        member.status === 'ACCEPTED' ? member.joinedAt! : member.invitedAt!,
                      ).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isRemoving}>
                            {isRemoving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => {
                              setRemovingMember(member)
                              setIsRemoveDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Revogar acesso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={isRemoveDialogOpen}
        onOpenChange={(open) => {
          setIsRemoveDialogOpen(open)
          if (!open) setRemovingMember(null)
        }}
        title="Revogar acesso de suporte?"
        description={
          <p>
            O agente perderá acesso imediato à organização.
            <br />
            <span className="font-semibold text-foreground">
              {removingMember?.user?.fullName ?? removingMember?.email}
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (removingMember) executeRemove({ memberId: removingMember.id })
        }}
        isLoading={isRemoving}
        confirmLabel="Revogar Acesso"
      />
    </>
  )
}
