'use client'

import { Bot, Info, UserCog, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Label } from '@/_components/ui/label'
import { Separator } from '@/_components/ui/separator'
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
  // Campos de grupo (Multi-Agent Routing)
  agentGroupName: string | null
  activeAgentName: string | null
  aiPaused: boolean
  isTogglePending: boolean
  onToggleAi: (checked: boolean) => void
  onOpenSettings: () => void
  assigneeName: string | null
}

export function ChatHeader({
  contactName,
  contactPhone,
  agentName,
  agentGroupName,
  activeAgentName,
  aiPaused,
  isTogglePending,
  onToggleAi,
  onOpenSettings,
  assigneeName,
}: ChatHeaderProps) {
  const initials = contactName
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  // Modo grupo: usa worker ativo; modo standalone: usa agente direto
  const isGroupMode = !!agentGroupName
  const displayAgentName = isGroupMode ? activeAgentName : agentName

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

            {/* Modo grupo: badge com worker ativo + tooltip com equipe/agente */}
            {isGroupMode && displayAgentName && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 border-kronos-purple/20 bg-kronos-purple/10 text-[10px] text-kronos-purple"
                  >
                    <Users className="h-3 w-3" />
                    {displayAgentName}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Equipe: {agentGroupName} | Agente: {displayAgentName}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Modo grupo sem worker ativo ainda */}
            {isGroupMode && !displayAgentName && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 border-kronos-purple/20 bg-kronos-purple/10 text-[10px] text-kronos-purple"
                  >
                    <Users className="h-3 w-3" />
                    {agentGroupName}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Equipe: {agentGroupName} — aguardando roteamento
                </TooltipContent>
              </Tooltip>
            )}

            {/* Modo standalone (agente individual) */}
            {!isGroupMode && displayAgentName && (
              <Badge
                variant="outline"
                className="h-5 gap-1 border-kronos-purple/20 bg-kronos-purple/10 text-[10px] text-kronos-purple"
              >
                <Bot className="h-3 w-3" />
                {displayAgentName}
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

      <div className="flex items-center gap-3">
        {/* Indicador do responsável — exibido para todos os roles */}
        {assigneeName && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="flex cursor-pointer items-center gap-1.5"
                >
                  <Badge
                    variant="outline"
                    className="h-6 max-w-[120px] gap-1 truncate border-border px-2 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    <UserCog className="h-3 w-3 shrink-0" />
                    <span className="truncate">{assigneeName}</span>
                  </Badge>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Responsável: {assigneeName}</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
              onClick={onOpenSettings}
            >
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Detalhes da conversa</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

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
