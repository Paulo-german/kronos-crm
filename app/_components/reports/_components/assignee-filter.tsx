'use client'

import { Users } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'

export interface MemberOption {
  userId: string
  fullName: string
  avatarUrl?: string | null
}

interface AssigneeFilterProps {
  members: MemberOption[]
  value: string | null
  onChange: (value: string | null) => void
}

function getMemberInitials(member: MemberOption): string {
  const name = member.fullName.trim()
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (
    parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
  ).toUpperCase()
}

export function AssigneeFilter({
  members,
  value,
  onChange,
}: AssigneeFilterProps) {
  const selectedMember = members.find((member) => member.userId === value)

  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(selected) =>
        onChange(selected === 'all' ? null : selected)
      }
    >
      <SelectTrigger className="h-8 w-auto min-w-[130px] gap-1.5 border px-2.5 text-xs font-medium">
        <Users className="size-3.5 text-muted-foreground" />
        {selectedMember ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-4">
              <AvatarImage
                src={selectedMember.avatarUrl ?? undefined}
                alt={selectedMember.fullName}
              />
              <AvatarFallback className="text-[8px]">
                {getMemberInitials(selectedMember)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate">
              {selectedMember.fullName}
            </span>
          </div>
        ) : (
          <SelectValue placeholder="Membro" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os membros</SelectItem>
        <SelectSeparator />
        {members.map((member) => (
          <SelectItem key={member.userId} value={member.userId}>
            <div className="flex items-center gap-2">
              <Avatar className="size-5">
                <AvatarImage
                  src={member.avatarUrl ?? undefined}
                  alt={member.fullName}
                />
                <AvatarFallback className="text-[9px]">
                  {getMemberInitials(member)}
                </AvatarFallback>
              </Avatar>
              <span>{member.fullName}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
