'use client'

import { useState } from 'react'
import {
  MoreHorizontalIcon,
  TrashIcon,
  PencilIcon,
  ExternalLinkIcon,
  Loader2,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import Link from 'next/link'

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
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'

import { deleteProfessional } from '@/_actions/professional/delete-professional'
import { updateProfessional } from '@/_actions/professional/update-professional'
import { resendProfessionalInvite } from '@/_actions/professional/resend-professional-invite'
import { cancelProfessionalInvite } from '@/_actions/professional/cancel-professional-invite'
import type { UpdateProfessionalInput } from '@/_actions/professional/update-professional/schema'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'

import UpsertProfessionalDialogContent from './upsert-professional-dialog-content'

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

interface ProfessionalsDataTableProps {
  professionals: ProfessionalDto[]
  orgSlug: string
}

export function ProfessionalsDataTable({
  professionals,
  orgSlug,
}: ProfessionalsDataTableProps) {
  // Separar ativos (vinculados) e pendentes (sem userId)
  const active = professionals.filter((professional) => professional.userId !== null)
  const pending = professionals.filter((professional) => professional.userId === null)

  const [editingProfessional, setEditingProfessional] =
    useState<ProfessionalDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  const [deletingProfessional, setDeletingProfessional] =
    useState<ProfessionalDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [resendingProfessional, setResendingProfessional] =
    useState<ProfessionalDto | null>(null)
  const [cancelingInviteProfessional, setCancelingInviteProfessional] =
    useState<ProfessionalDto | null>(null)
  const [isCancelInviteDialogOpen, setIsCancelInviteDialogOpen] = useState(false)

  const { execute: executeDelete, isPending: isDeletingIndividual } =
    useAction(deleteProfessional, {
      onSuccess: () => {
        toast.success('Profissional removido com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingProfessional(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover profissional.')
      },
    })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateProfessional,
    {
      onSuccess: () => {
        toast.success('Profissional atualizado com sucesso!')
        setIsEditSheetOpen(false)
        setEditingProfessional(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar profissional.')
      },
    },
  )

  const { execute: executeResend, isPending: isResending } = useAction(
    resendProfessionalInvite,
    {
      onSuccess: () => toast.success('Convite reenviado com sucesso.'),
      onError: ({ error }) =>
        toast.error(error.serverError ?? 'Erro ao reenviar convite.'),
    },
  )

  const { execute: executeCancelInvite, isPending: isCancelingInvite } = useAction(
    cancelProfessionalInvite,
    {
      onSuccess: () => {
        toast.success('Convite cancelado.')
        setIsCancelInviteDialogOpen(false)
        setCancelingInviteProfessional(null)
      },
      onError: ({ error }) =>
        toast.error(error.serverError ?? 'Erro ao cancelar convite.'),
    },
  )

  const handleEdit = (professional: ProfessionalDto) => {
    setEditingProfessional(professional)
    setIsEditSheetOpen(true)
  }

  const handleDelete = (professional: ProfessionalDto) => {
    setDeletingProfessional(professional)
    setIsDeleteDialogOpen(true)
  }

  const handleUpdate = (data: UpdateProfessionalInput) => {
    executeUpdate(data)
  }

  return (
    <>
      <Sheet
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          setIsEditSheetOpen(open)
          if (!open) setEditingProfessional(null)
        }}
      >
        {editingProfessional && (
          <UpsertProfessionalDialogContent
            key={editingProfessional.id}
            defaultValues={editingProfessional}
            setIsOpen={setIsEditSheetOpen}
            isOpen={isEditSheetOpen}
            onUpdate={handleUpdate}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingProfessional(null)
        }}
        title="Remover profissional?"
        description={
          <p>
            Esta ação irá remover o profissional{' '}
            <span className="font-bold text-foreground">
              {deletingProfessional?.name}
            </span>{' '}
            permanentemente. Agendamentos futuros vinculados a ele serão
            desvinculados.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingProfessional) {
            executeDelete({ id: deletingProfessional.id })
          }
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Remover Profissional"
      />

      <ConfirmationDialog
        open={isCancelInviteDialogOpen}
        onOpenChange={(open) => {
          setIsCancelInviteDialogOpen(open)
          if (!open) setCancelingInviteProfessional(null)
        }}
        title="Cancelar convite?"
        description={
          <p>
            O convite de{' '}
            <span className="font-bold text-foreground">
              {cancelingInviteProfessional?.name}
            </span>{' '}
            será cancelado e o profissional será removido.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (cancelingInviteProfessional) {
            executeCancelInvite({ professionalId: cancelingInviteProfessional.id })
          }
        }}
        isLoading={isCancelingInvite}
        confirmLabel="Cancelar Convite"
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Profissionais</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead className="text-right">Criado em</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((professional) => (
                <TableRow key={professional.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/org/${orgSlug}/settings/professionals/${professional.id}`}
                      className="flex items-center gap-3 hover:opacity-80"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={professional.avatarUrl ?? undefined}
                          alt={professional.name}
                        />
                        <AvatarFallback className="text-xs font-medium">
                          {getInitials(professional.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium hover:underline">
                          {professional.name}
                        </span>
                        {professional.email && (
                          <span className="text-xs text-muted-foreground">
                            {professional.email}
                          </span>
                        )}
                      </div>
                    </Link>
                  </TableCell>

                  <TableCell>
                    {professional.phone ?? (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {professional.isActive ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600"
                    >
                      Vinculado
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right text-muted-foreground">
                    {format(professional.createdAt, 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/org/${orgSlug}/settings/professionals/${professional.id}`}
                          >
                            <ExternalLinkIcon className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(professional)}>
                          <PencilIcon className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(professional)}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Convites Pendentes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Profissionais convidados que ainda não aceitaram o acesso.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Convidado em</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((professional) => (
                  <TableRow key={professional.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={professional.avatarUrl ?? undefined}
                            alt={professional.name}
                          />
                          <AvatarFallback className="text-xs font-medium">
                            {getInitials(professional.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{professional.name}</span>
                          {professional.email && (
                            <span className="text-xs text-muted-foreground">
                              {professional.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Aguardando aceite
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {format(professional.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isResending || !professional.email}
                          onClick={() => {
                            setResendingProfessional(professional)
                            executeResend({ professionalId: professional.id })
                          }}
                        >
                          {isResending && resendingProfessional?.id === professional.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Reenviar'
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setCancelingInviteProfessional(professional)
                            setIsCancelInviteDialogOpen(true)
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  )
}
