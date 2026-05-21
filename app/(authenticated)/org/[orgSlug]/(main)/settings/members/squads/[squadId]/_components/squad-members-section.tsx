'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Loader2,
  X,
  UserPlus,
  ChevronsUpDown,
  Check,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/_components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { cn } from '@/_lib/utils'
import { addSquadMember } from '@/_actions/squad/add-squad-member'
import { updateSquadMember } from '@/_actions/squad/update-squad-member'
import { removeSquadMember } from '@/_actions/squad/remove-squad-member'
import type { SquadDetailDto, SquadMemberDto } from '@/_data-access/squad/get-squad-by-id'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { SquadRole, SquadType } from '@prisma/client'

interface SquadMembersSectionProps {
  squad: SquadDetailDto
  orgMembers: AcceptedMemberDto[]
  canManage: boolean
  orgSlug: string
}

const SQUAD_ROLE_LABELS: Record<SquadRole, string> = {
  LEADER: 'Líder',
  SDR: 'SDR',
  CLOSER: 'Closer',
  FARMER: 'Farmer',
  SUPPORT: 'Suporte',
  MEMBER: 'Membro',
}

const ROLES_BY_SQUAD_TYPE: Record<SquadType, SquadRole[]> = {
  SALES: ['LEADER', 'SDR', 'CLOSER', 'FARMER', 'MEMBER'],
  SUPPORT: ['LEADER', 'SUPPORT', 'MEMBER'],
  CS: ['LEADER', 'FARMER', 'MEMBER'],
  GENERAL: ['LEADER', 'SDR', 'CLOSER', 'FARMER', 'SUPPORT', 'MEMBER'],
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

interface MemberRowProps {
  squadMember: SquadMemberDto
  canManage: boolean
  allowedRoles: SquadRole[]
}

function MemberRow({ squadMember, canManage, allowedRoles }: MemberRowProps) {
  const name = squadMember.member.user?.fullName
  const email = squadMember.member.email
  const initials = getInitials(name, email)

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateSquadMember,
    {
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar membro.')
      },
    },
  )

  const { execute: executeRemove, isPending: isRemoving } = useAction(
    removeSquadMember,
    {
      onSuccess: () => toast.success('Membro removido do time.'),
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover membro.')
      },
    },
  )

  const isPending = isUpdating || isRemoving

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/10">
      {/* Avatar com indicador de status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="relative shrink-0 cursor-pointer disabled:cursor-default"
            disabled={!canManage || isPending}
            onClick={() =>
              executeUpdate({
                squadMemberId: squadMember.id,
                isActive: !squadMember.isActive,
              })
            }
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={squadMember.member.user?.avatarUrl ?? ''} />
              <AvatarFallback className="text-xs font-semibold">
                {isUpdating && !isRemoving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  initials
                )}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                squadMember.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40',
              )}
            />
          </button>
        </TooltipTrigger>
        {canManage && (
          <TooltipContent side="right">
            {squadMember.isActive
              ? 'Ativo na distribuição — clique para pausar'
              : 'Pausado — clique para ativar'}
          </TooltipContent>
        )}
      </Tooltip>

      {/* Nome e email */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{name ?? email}</p>
        {name && (
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        )}
      </div>

      {/* Role select (canManage) ou badge (read-only) */}
      {canManage ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Select
            value={squadMember.role}
            onValueChange={(value) =>
              executeUpdate({
                squadMemberId: squadMember.id,
                role: value as SquadRole,
              })
            }
            disabled={isPending}
          >
            <SelectTrigger className="h-7 w-[108px] border-transparent bg-muted/50 text-xs hover:border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedRoles.map((value) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {SQUAD_ROLE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/60 hover:text-destructive"
            disabled={isPending}
            onClick={() => executeRemove({ squadMemberId: squadMember.id })}
          >
            {isRemoving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      ) : (
        <Badge variant="secondary" className="shrink-0 text-xs font-normal">
          {SQUAD_ROLE_LABELS[squadMember.role]}
        </Badge>
      )}
    </div>
  )
}

export function SquadMembersSection({
  squad,
  orgMembers,
  canManage,
}: SquadMembersSectionProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [comboOpen, setComboOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')

  const allowedRoles = ROLES_BY_SQUAD_TYPE[squad.type]
  const [selectedRole, setSelectedRole] = useState<SquadRole>(allowedRoles[0] ?? 'MEMBER')

  const squadMemberIds = new Set(squad.members.map((sm) => sm.member.id))
  const availableMembers = orgMembers.filter(
    (member) => !squadMemberIds.has(member.id),
  )

  const { execute: executeAdd, isPending: isAdding } = useAction(
    addSquadMember,
    {
      onSuccess: () => {
        toast.success('Membro adicionado ao time.')
        setSelectedMemberId('')
        setSelectedRole(allowedRoles[0] ?? 'MEMBER')
        setAddOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao adicionar membro.')
      },
    },
  )

  const selectedMember = availableMembers.find(
    (member) => member.id === selectedMemberId,
  )

  const handleAdd = () => {
    if (!selectedMemberId) return
    executeAdd({
      squadId: squad.id,
      memberId: selectedMemberId,
      role: selectedRole,
    })
  }

  const handleCancelAdd = () => {
    setAddOpen(false)
    setSelectedMemberId('')
    setSelectedRole('MEMBER')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Membros</CardTitle>
            <CardDescription>
              Gerencie quem faz parte deste time e seus papéis.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {squad.members.length}{' '}
              {squad.members.length === 1 ? 'membro' : 'membros'}
            </Badge>
            {canManage && !addOpen && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setAddOpen(true)}
                disabled={availableMembers.length === 0}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Formulário de adicionar (expansível) */}
        {canManage && addOpen && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 p-3">
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="h-8 flex-1 justify-between text-xs font-normal"
                  disabled={isAdding}
                >
                  {selectedMember
                    ? selectedMember.user?.fullName ?? selectedMember.email
                    : 'Selecionar membro...'}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar membro..." />
                  <CommandList>
                    <CommandEmpty>
                      {availableMembers.length === 0
                        ? 'Todos os membros já estão no time.'
                        : 'Nenhum resultado encontrado.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {availableMembers.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={`${member.user?.fullName ?? ''} ${member.email}`}
                          onSelect={() => {
                            setSelectedMemberId(member.id)
                            setComboOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedMemberId === member.id
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {member.user?.fullName ?? member.email}
                            </span>
                            {member.user?.fullName && (
                              <span className="text-xs text-muted-foreground">
                                {member.email}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as SquadRole)}
              disabled={isAdding}
            >
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map((value) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {SQUAD_ROLE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              className="h-8 px-3"
              disabled={!selectedMemberId || isAdding}
              onClick={handleAdd}
            >
              {isAdding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              disabled={isAdding}
              onClick={handleCancelAdd}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Lista de membros */}
        <div className="space-y-1.5">
          {squad.members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background py-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Este time ainda não tem membros.
              </p>
              {canManage && !addOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 gap-1.5 text-xs"
                  onClick={() => setAddOpen(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Adicionar membro
                </Button>
              )}
            </div>
          ) : (
            squad.members.map((squadMember) => (
              <MemberRow
                key={squadMember.id}
                squadMember={squadMember}
                canManage={canManage}
                allowedRoles={allowedRoles}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
