'use client'

import { CircleIcon, Pause, Settings2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Label } from '@/_components/ui/label'
import { Switch } from '@/_components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

interface ChatHeaderProps {
  contactName: string
  contactPhone: string | null
  agentName: string | null
  aiPaused: boolean
  isTogglePending: boolean
  onToggleAi: (checked: boolean) => void
  onOpenSettings: () => void
}

export function ChatHeader({
  contactName,
  contactPhone,
  agentName,
  aiPaused,
  isTogglePending,
  onToggleAi,
  onOpenSettings,
}: ChatHeaderProps) {
  const initials = contactName
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
      <button
        type="button"
        className="flex cursor-pointer items-center gap-3 rounded-md transition-colors"
        onClick={onOpenSettings}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage />
          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight">
              {contactName}
            </span>
            {agentName && (
              <Badge
                variant="outline"
                className="h-5 border-kronos-purple/20 bg-kronos-purple/10 text-[10px] text-kronos-purple"
              >
                {agentName}
              </Badge>
            )}
            {aiPaused ? (
              <Badge
                variant="outline"
                className="h-5 gap-1 border-kronos-yellow/20 bg-kronos-yellow/10 px-1.5 text-[10px] text-kronos-yellow"
              >
                <Pause className="h-3 w-3" />
                Pausada
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-5 gap-1 border-kronos-green/20 bg-kronos-green/10 px-1.5 text-[10px] text-kronos-green"
              >
                <CircleIcon className="h-2 w-2 fill-current" />
                Ativa
              </Badge>
            )}
          </div>
          {contactPhone && (
            <p className="text-left text-xs text-muted-foreground">
              {contactPhone}
            </p>
          )}
        </div>
      </button>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onOpenSettings}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Configurações da conversa</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="ai-toggle"
                className="cursor-pointer text-xs text-muted-foreground"
              >
                IA
              </Label>
              <Switch
                id="ai-toggle"
                checked={!aiPaused}
                onCheckedChange={onToggleAi}
                disabled={isTogglePending}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>
              {aiPaused
                ? 'Reativar respostas automáticas da IA'
                : 'Pausar IA para assumir a conversa manualmente'}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
