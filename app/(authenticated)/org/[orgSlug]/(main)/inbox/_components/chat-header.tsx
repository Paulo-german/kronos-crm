'use client'

import { useState } from 'react'
import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, Clock, FlaskConical, Info, Loader2, MoreVertical, RotateCcw, Trash2, UserCog, Users } from 'lucide-react'
import type { ConversationWindowState } from '../_hooks/use-conversation-window'
import { cn } from '@/_lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
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
  onBack?: () => void
  conversationStatus: 'OPEN' | 'RESOLVED'
  isStatusPending: boolean
  onResolve: () => void
  onReopen: () => void
  windowState?: ConversationWindowState
  isSimulator?: boolean
  onResetSimulator?: () => void
  onEndSimulator?: () => void
  isSimulatorActionPending?: boolean
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
  onBack,
  conversationStatus,
  isStatusPending,
  onResolve,
  onReopen,
  windowState,
  isSimulator,
  onResetSimulator,
  onEndSimulator,
  isSimulatorActionPending,
}: ChatHeaderProps) {
  const [endDialogOpen, setEndDialogOpen] = useState(false)

  const showSimulatorActions =
    isSimulator && (onResetSimulator || onEndSimulator)
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
      <div className="flex min-w-0 items-center gap-1">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 md:hidden"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {/* div role=button porque contém outro button (DropdownMenuTrigger) — HTML proíbe nesting */}
        <div
          role="button"
          tabIndex={0}
          className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onOpenSettings}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenSettings()
            }
          }}
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage />
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-semibold tracking-tight">
                {contactName}
              </span>

              {/* Badge de simulação — visível apenas em conversas simuladas */}
              {isSimulator && (
                <Badge
                  variant="outline"
                  className="h-5 shrink-0 gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                >
                  <FlaskConical className="h-3 w-3" />
                  Simulação
                </Badge>
              )}

              {/* Menu de ações da simulação — reiniciar / encerrar */}
              {showSimulatorActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      disabled={isSimulatorActionPending}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {isSimulatorActionPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MoreVertical className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" onClick={(event) => event.stopPropagation()}>
                    {onResetSimulator && (
                      <DropdownMenuItem onClick={onResetSimulator}>
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        Reiniciar simulação
                      </DropdownMenuItem>
                    )}
                    {onEndSimulator && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setEndDialogOpen(true)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Encerrar simulação
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Modo grupo: badge com worker ativo + tooltip com equipe/agente */}
              {isGroupMode && displayAgentName && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 gap-1 border-kronos-purple/20 bg-kronos-purple/10 text-[10px] text-kronos-purple"
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
                      className="h-5 shrink-0 gap-1 border-kronos-purple/20 bg-kronos-purple/10 text-[10px] text-kronos-purple"
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
                  className="h-5 shrink-0 gap-1 border-kronos-purple/20 bg-kronos-purple/10 text-[10px] text-kronos-purple"
                >
                  <Bot className="h-3 w-3" />
                  {displayAgentName}
                </Badge>
              )}
            </div>
            {contactPhone && (
              <div className="flex items-center gap-1.5">
                <p className="truncate text-left text-xs text-muted-foreground">
                  {contactPhone}
                </p>
                {windowState?.isMetaCloud && (
                  <>
                    <span className="text-[10px] text-muted-foreground/40">·</span>
                    {windowState.isOpen ? (
                      <span className={cn(
                        'flex items-center gap-1 text-[11px]',
                        windowState.isExpiring ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400',
                      )}>
                        <Clock className="h-3 w-3 shrink-0" />
                        {windowState.formattedTimeRemaining}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-red-500 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Expirada
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* Indicador do responsável — exibido para todos os roles */}
        {assigneeName && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="hidden cursor-pointer items-center gap-1.5 sm:flex"
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

            <Separator orientation="vertical" className="hidden h-6 sm:block" />
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

        {/* Resolver/Reabrir só faz sentido em conversas reais — simulação usa Reiniciar/Encerrar */}
        {!isSimulator && <Separator orientation="vertical" className="h-6" />}

        {/* Botão Resolver / Reabrir */}
        {!isSimulator && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={conversationStatus === 'RESOLVED' ? 'outline' : 'default'}
              size="sm"
              className={cn(
                'h-8 gap-1.5 text-xs',
                conversationStatus === 'OPEN' && 'bg-green-600 text-white hover:bg-green-700',
              )}
              onClick={conversationStatus === 'RESOLVED' ? onReopen : onResolve}
              disabled={isStatusPending}
            >
              {isStatusPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : conversationStatus === 'RESOLVED' ? (
                <RotateCcw className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {conversationStatus === 'RESOLVED' ? 'Reabrir' : 'Resolver'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>
              {conversationStatus === 'RESOLVED'
                ? 'Reabrir esta conversa'
                : 'Marcar conversa como resolvida'}
            </p>
          </TooltipContent>
        </Tooltip>
        )}

        <Separator orientation="vertical" className="h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="ai-toggle"
                className="hidden cursor-pointer text-xs text-muted-foreground sm:inline"
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

      <AlertDialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar simulação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação apaga a conversa, a negociação e o contato simulador. Não é reversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setEndDialogOpen(false)
                onEndSimulator?.()
              }}
            >
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
