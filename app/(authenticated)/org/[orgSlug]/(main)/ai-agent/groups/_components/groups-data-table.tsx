'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { EditIcon, TrashIcon, MoreHorizontalIcon, UsersIcon, InboxIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/_components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Switch } from '@/_components/ui/switch'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { deleteAgentGroup } from '@/_actions/agent-group/delete-agent-group'
import { updateAgentGroup } from '@/_actions/agent-group/update-agent-group'
import {
  updateAgentGroupSchema,
  type UpdateAgentGroupInput,
} from '@/_actions/agent-group/update-agent-group/schema'
import { DeleteGroupDialog } from './delete-group-dialog'
import type { AgentGroupDto } from '@/_data-access/agent-group/get-agent-groups'

interface GroupsDataTableProps {
  groups: AgentGroupDto[]
  orgSlug: string
}

export function GroupsDataTable({ groups, orgSlug }: GroupsDataTableProps) {
  const [editingGroup, setEditingGroup] = useState<AgentGroupDto | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState<AgentGroupDto | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const { execute: executeDelete, isPending: isDeleting } = useAction(deleteAgentGroup, {
    onSuccess: () => {
      toast.success('Equipe excluída com sucesso.')
      setIsDeleteOpen(false)
      setDeletingGroup(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao excluir equipe.')
    },
  })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(updateAgentGroup, {
    onSuccess: () => {
      toast.success('Equipe atualizada com sucesso.')
      setIsEditOpen(false)
      setEditingGroup(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar equipe.')
    },
  })

  const handleEdit = (group: AgentGroupDto) => {
    setEditingGroup(group)
    setIsEditOpen(true)
  }

  const handleDelete = (group: AgentGroupDto) => {
    setDeletingGroup(group)
    setIsDeleteOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!deletingGroup) return
    executeDelete({ groupId: deletingGroup.id })
  }

  if (groups.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
        <UsersIcon className="h-8 w-8 text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">Nenhuma equipe criada ainda</p>
          <p className="text-xs text-muted-foreground">
            Crie uma equipe para organizar seus agentes workers.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Workers
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Inboxes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {groups.map((group) => (
              <tr key={group.id} className="hover:bg-muted/30 transition-colors">
                {/* Coluna Nome */}
                <td className="px-4 py-3">
                  <Link
                    href={`/org/${orgSlug}/ai-agent/groups/${group.id}`}
                    className="font-medium hover:underline"
                  >
                    {group.name}
                  </Link>
                  {group.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {group.description}
                    </p>
                  )}
                </td>

                {/* Coluna Workers */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {group.members.slice(0, 3).map((member) => (
                      <Badge
                        key={member.id}
                        variant={member.isActive ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {member.agentName}
                      </Badge>
                    ))}
                    {group.memberCount > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{group.memberCount - 3}
                      </Badge>
                    )}
                    {group.memberCount === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhum worker</span>
                    )}
                  </div>
                </td>

                {/* Coluna Inboxes */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <InboxIcon className="h-3.5 w-3.5" />
                    <span>{group.inboxCount}</span>
                  </div>
                </td>

                {/* Coluna Status */}
                <td className="px-4 py-3">
                  <Badge variant={group.isActive ? 'default' : 'secondary'}>
                    {group.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>

                {/* Coluna Ações */}
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontalIcon className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-1.5"
                        onSelect={() => handleEdit(group)}
                      >
                        <EditIcon className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-1.5 text-destructive focus:text-destructive"
                        onSelect={() => handleDelete(group)}
                      >
                        <TrashIcon className="h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog de edição rápida */}
      {editingGroup && (
        <EditGroupDialog
          group={editingGroup}
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open)
            if (!open) setEditingGroup(null)
          }}
          onUpdate={(data) => executeUpdate(data)}
          isUpdating={isUpdating}
        />
      )}

      {/* Dialog de exclusão */}
      {deletingGroup && (
        <DeleteGroupDialog
          open={isDeleteOpen}
          onOpenChange={(open) => {
            setIsDeleteOpen(open)
            if (!open) setDeletingGroup(null)
          }}
          groupName={deletingGroup.name}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Subcomponente: dialog de edição rápida inline
// ─────────────────────────────────────────────────────────

interface EditGroupDialogProps {
  group: AgentGroupDto
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (data: UpdateAgentGroupInput) => void
  isUpdating: boolean
}

function EditGroupDialog({
  group,
  open,
  onOpenChange,
  onUpdate,
  isUpdating,
}: EditGroupDialogProps) {
  const form = useForm<UpdateAgentGroupInput>({
    resolver: zodResolver(updateAgentGroupSchema),
    defaultValues: {
      groupId: group.id,
      name: group.name,
      description: group.description ?? '',
      isActive: group.isActive,
    },
  })

  const onSubmit = (data: UpdateAgentGroupInput) => {
    onUpdate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar equipe</DialogTitle>
          <DialogDescription>
            Altere as configurações básicas da equipe. Para editar workers e router, acesse o
            detalhe da equipe.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel className="text-sm">Equipe ativa</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Quando inativa, o router não processa novas mensagens.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
