'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  UserPlusIcon,
  TrashIcon,
  EditIcon,
  Loader2,
  BotIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Input } from '@/_components/ui/input'
import { Switch } from '@/_components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/_components/ui/form'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { removeAgentFromGroup } from '@/_actions/agent-group/remove-agent-from-group'
import { updateGroupMember } from '@/_actions/agent-group/update-group-member'
import {
  updateGroupMemberSchema,
  type UpdateGroupMemberInput,
} from '@/_actions/agent-group/update-group-member/schema'
import { AddMemberDialog } from './add-member-dialog'
import type { AgentGroupDetailDto } from '@/_data-access/agent-group/get-agent-group-by-id'
import type { AgentDto } from '@/_data-access/agent/get-agents'

interface MembersCardProps {
  group: AgentGroupDetailDto
  allOrgAgents: AgentDto[]
}

export function MembersCard({ group, allOrgAgents }: MembersCardProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  const { execute: executeRemove, isPending: isRemoving } = useAction(removeAgentFromGroup, {
    onSuccess: () => {
      toast.success('Agente removido da equipe.')
      setIsRemoveDialogOpen(false)
      setRemovingMemberId(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao remover agente.')
    },
  })

  const handleRemoveClick = (memberId: string) => {
    setRemovingMemberId(memberId)
    setIsRemoveDialogOpen(true)
  }

  const handleConfirmRemove = () => {
    if (!removingMemberId) return
    executeRemove({ memberId: removingMemberId })
  }

  // Agentes que ainda não são membros desta equipe (para o dialog de adição)
  const currentMemberAgentIds = new Set(group.members.map((member) => member.agentId))
  const availableAgents = allOrgAgents.filter(
    (agent) => !currentMemberAgentIds.has(agent.id),
  )

  const removingMember = group.members.find((member) => member.id === removingMemberId)

  return (
    <>
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Membros</CardTitle>
              <CardDescription>
                Agentes workers desta equipe. O router usa o escopo de cada um para classificar
                conversas.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <UserPlusIcon className="h-3.5 w-3.5" />
              Adicionar worker
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {group.members.length === 0 ? (
            <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-dashed">
              <BotIcon className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum worker nesta equipe.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {group.members.map((member) => {
                const activeMemberCount = group.members.filter(
                  (m) => m.isActive && m.agentIsActive,
                ).length
                return (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isEditing={editingMemberId === member.id}
                    onEditStart={() => setEditingMemberId(member.id)}
                    onEditEnd={() => setEditingMemberId(null)}
                    onRemove={() => handleRemoveClick(member.id)}
                    isLastMember={group.members.length <= 1}
                    isLastActiveMember={member.isActive && activeMemberCount <= 1}
                  />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: adicionar worker */}
      <AddMemberDialog
        groupId={group.id}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        availableAgents={availableAgents}
      />

      {/* Dialog: confirmar remoção */}
      <ConfirmationDialog
        open={isRemoveDialogOpen}
        onOpenChange={(open) => {
          setIsRemoveDialogOpen(open)
          if (!open) setRemovingMemberId(null)
        }}
        variant="destructive"
        title="Remover worker"
        description={
          <span>
            Tem certeza que deseja remover{' '}
            <strong className="text-foreground">{removingMember?.agentName}</strong> desta equipe?
            <br />
            As conversas ativas com este agente serão reclassificadas pelo router.
          </span>
        }
        icon={<TrashIcon className="h-6 w-6" />}
        onConfirm={handleConfirmRemove}
        isLoading={isRemoving}
        confirmLabel="Remover worker"
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Subcomponente: linha de membro com edição inline
// ─────────────────────────────────────────────────────────

interface MemberRowProps {
  member: AgentGroupDetailDto['members'][number]
  isEditing: boolean
  onEditStart: () => void
  onEditEnd: () => void
  onRemove: () => void
  isLastMember: boolean
  isLastActiveMember: boolean
}

function MemberRow({
  member,
  isEditing,
  onEditStart,
  onEditEnd,
  onRemove,
  isLastMember,
  isLastActiveMember,
}: MemberRowProps) {
  const [isMemberActive, setIsMemberActive] = useState(member.isActive)

  const form = useForm<UpdateGroupMemberInput>({
    resolver: zodResolver(updateGroupMemberSchema),
    defaultValues: {
      memberId: member.id,
      scopeLabel: member.scopeLabel,
    },
  })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(updateGroupMember, {
    onSuccess: () => {
      toast.success('Escopo atualizado.')
      onEditEnd()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar escopo.')
    },
  })

  const { execute: executeToggle, isPending: isToggling } = useAction(updateGroupMember, {
    onSuccess: () => {
      toast.success(isMemberActive ? 'Worker ativado na equipe.' : 'Worker desativado na equipe.')
    },
    onError: ({ error }) => {
      setIsMemberActive((prev) => !prev)
      toast.error(error.serverError || 'Erro ao alterar status do worker.')
    },
  })

  const handleToggleMember = (checked: boolean) => {
    setIsMemberActive(checked)
    executeToggle({ memberId: member.id, isActive: checked })
  }

  const onSubmit = (data: UpdateGroupMemberInput) => {
    executeUpdate(data)
  }

  const handleCancelEdit = () => {
    form.reset()
    onEditEnd()
  }

  const isEffectivelyActive = isMemberActive && member.agentIsActive
  const canToggleOff = isMemberActive && isLastActiveMember

  return (
    <div className={`rounded-md border border-border/50 bg-background/70 p-3 ${!isEffectivelyActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Switch de ativação do membro */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="flex shrink-0 pt-0.5">
              <Switch
                checked={isMemberActive}
                onCheckedChange={handleToggleMember}
                disabled={isToggling || canToggleOff || !member.agentIsActive}
                className="scale-75"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {!member.agentIsActive
              ? 'Agente desativado globalmente'
              : canToggleOff
                ? 'Último worker ativo da equipe'
                : 'Ativo nesta equipe'}
          </TooltipContent>
        </Tooltip>

        {/* Avatar / ícone do agente */}
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isEffectivelyActive ? 'bg-primary/10' : 'bg-muted'}`}>
          <BotIcon className={`h-4 w-4 ${isEffectivelyActive ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>

        {/* Info do agente */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{member.agentName}</span>
            {!isMemberActive && (
              <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                Pausado
              </Badge>
            )}
            {!member.agentIsActive && (
              <Badge variant="destructive" className="text-[10px] px-1.5 h-4">
                Agente desativado
              </Badge>
            )}
          </div>

          {/* Escopo: modo visualização ou edição inline */}
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-1.5 flex items-center gap-1.5">
                <FormField
                  control={form.control}
                  name="scopeLabel"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          autoFocus
                          className="h-7 text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckIcon className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              </form>
            </Form>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">{member.scopeLabel}</p>
          )}
        </div>

        {/* Ações */}
        {!isEditing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onEditStart}
              title="Editar escopo"
            >
              <EditIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={isLastMember}
              title={
                isLastMember
                  ? 'Não é possível remover o último worker'
                  : 'Remover da equipe'
              }
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
