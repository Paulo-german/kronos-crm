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
  Shield,
  ShieldOff,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
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
import type { SquadRole } from '@prisma/client'

interface SquadMembersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  squad: SquadDetailDto
  orgMembers: AcceptedMemberDto[]
  squadColor: string
}

const SQUAD_ROLE_LABELS: Record<SquadRole, string> = {
  LEADER: 'Líder',
  SDR: 'SDR',
  CLOSER: 'Closer',
  FARMER: 'Farmer',
  SUPPORT: 'Suporte',
  MEMBER: 'Membro',
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
}

function MemberRow({ squadMember }: MemberRowProps) {
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
      onSuccess: () => {
        toast.success('Membro removido do time.')
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover membro.')
      },
    },
  )

  const isPending = isUpdating || isRemoving

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={squadMember.member.user?.avatarUrl ?? ''} />
        <AvatarFallback className="text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {name ?? email}
        </p>
        {name && (
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Toggle ativo/pausado */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={isPending}
              onClick={() =>
                executeUpdate({
                  squadMemberId: squadMember.id,
                  isActive: !squadMember.isActive,
                })
              }
            >
              {isPending && !isRemoving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : squadMember.isActive ? (
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {squadMember.isActive
              ? 'Ativo na distribuição — clique para pausar'
              : 'Pausado — clique para ativar'}
          </TooltipContent>
        </Tooltip>

        {/* Select de role */}
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
          <SelectTrigger className="h-7 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SQUAD_ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Remover */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={() =>
            executeRemove({ squadMemberId: squadMember.id })
          }
        >
          {isRemoving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}

export function SquadMembersSheet({
  open,
  onOpenChange,
  squad,
  orgMembers,
  squadColor,
}: SquadMembersSheetProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<SquadRole>('MEMBER')

  const squadMemberIds = new Set(
    squad.members.map((sm) => sm.member.id),
  )

  const availableMembers = orgMembers.filter(
    (member) => !squadMemberIds.has(member.id),
  )

  const { execute: executeAdd, isPending: isAdding } = useAction(
    addSquadMember,
    {
      onSuccess: () => {
        toast.success('Membro adicionado ao time.')
        setSelectedMemberId('')
        setSelectedRole('MEMBER')
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-lg">
        <SheetHeader className="shrink-0 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: squadColor }}
            />
            <SheetTitle className="text-lg">{squad.name}</SheetTitle>
            <Badge variant="secondary" className="ml-auto">
              <Users className="mr-1 h-3 w-3" />
              {squad.members.length}{' '}
              {squad.members.length === 1 ? 'membro' : 'membros'}
            </Badge>
          </div>
          {squad.description && (
            <SheetDescription>{squad.description}</SheetDescription>
          )}
        </SheetHeader>

        {/* Lista de membros */}
        <div className="flex-1 space-y-2 overflow-y-auto py-2 pr-1">
          {squad.members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Este time ainda não tem membros.
              </p>
            </div>
          ) : (
            squad.members.map((squadMember) => (
              <MemberRow
                key={squadMember.id}
                squadMember={squadMember}
              />
            ))
          )}
        </div>

        {/* Seção adicionar membro */}
        <div className="shrink-0 border-t pt-4">
          <p className="mb-3 text-sm font-medium">Adicionar membro</p>
          <div className="flex gap-2">
            {/* Combobox de membros */}
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={addOpen}
                  className="h-9 flex-1 justify-between text-sm font-normal"
                  disabled={isAdding}
                >
                  {selectedMember
                    ? selectedMember.user?.fullName ?? selectedMember.email
                    : 'Selecionar membro...'}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
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
                            setAddOpen(false)
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

            {/* Select de role para o novo membro */}
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as SquadRole)}
              disabled={isAdding}
            >
              <SelectTrigger className="h-9 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SQUAD_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botão adicionar */}
            <Button
              size="sm"
              className="h-9"
              disabled={!selectedMemberId || isAdding}
              onClick={handleAdd}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
