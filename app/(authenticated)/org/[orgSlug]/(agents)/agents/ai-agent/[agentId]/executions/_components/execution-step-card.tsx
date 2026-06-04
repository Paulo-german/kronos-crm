'use client'

import { useState } from 'react'
import type { ComponentType } from 'react'
import {
  TimerIcon,
  MicIcon,
  ImageIcon,
  DownloadIcon,
  DatabaseIcon,
  CreditCardIcon,
  BrainIcon,
  WrenchIcon,
  SendIcon,
  ClockIcon,
  ArchiveIcon,
  PauseIcon,
  GitBranchIcon,
  ArrowRightLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import type { AgentExecutionStepType, AgentExecutionStepStatus } from '@prisma/client'
import type { AgentExecutionStepDto } from '@/_data-access/agent-execution/get-agent-execution-by-id'

// Mapeamento de tipo de step para ícone Lucide
const STEP_TYPE_ICON: Record<AgentExecutionStepType, ComponentType<{ size?: number; className?: string }>> = {
  DEBOUNCE_CHECK: TimerIcon,
  AUDIO_TRANSCRIPTION: MicIcon,
  IMAGE_TRANSCRIPTION: ImageIcon,
  MEDIA_DOWNLOAD: DownloadIcon,
  CONTEXT_LOADING: DatabaseIcon,
  CREDIT_CHECK: CreditCardIcon,
  LLM_CALL: BrainIcon,
  TOOL_CALL: WrenchIcon,
  SEND_MESSAGE: SendIcon,
  FOLLOW_UP_SCHEDULE: ClockIcon,
  MEMORY_COMPRESSION: ArchiveIcon,
  FALLBACK_LLM_CALL: BrainIcon,
  PAUSE_CHECK: PauseIcon,
  ROUTER_CLASSIFICATION: GitBranchIcon,
  AGENT_TRANSFER: ArrowRightLeftIcon,
}

// Rótulos legíveis por tipo de step
const STEP_TYPE_LABEL: Record<AgentExecutionStepType, string> = {
  DEBOUNCE_CHECK: 'Verificação de Debounce',
  AUDIO_TRANSCRIPTION: 'Transcrição de Áudio',
  IMAGE_TRANSCRIPTION: 'Transcrição de Imagem',
  MEDIA_DOWNLOAD: 'Download de Mídia',
  CONTEXT_LOADING: 'Carregamento de Contexto',
  CREDIT_CHECK: 'Verificação de Créditos',
  LLM_CALL: 'Chamada ao Modelo IA',
  TOOL_CALL: 'Execução de Ferramenta',
  SEND_MESSAGE: 'Envio de Mensagem',
  FOLLOW_UP_SCHEDULE: 'Agendamento de Follow-up',
  MEMORY_COMPRESSION: 'Compressão de Memória',
  FALLBACK_LLM_CALL: 'Chamada ao Modelo (Fallback)',
  PAUSE_CHECK: 'Verificação de Pausa',
  ROUTER_CLASSIFICATION: 'Classificação pelo Router',
  AGENT_TRANSFER: 'Transferência de Agente',
}

// Configuração visual por status de step
const STEP_STATUS_CONFIG: Record<
  AgentExecutionStepStatus,
  { label: string; className: string }
> = {
  PASSED: {
    label: 'Passou',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  FAILED: {
    label: 'Falhou',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  SKIPPED: {
    label: 'Ignorado',
    className: 'bg-muted text-muted-foreground',
  },
}

// Cor do dot indicador de status na timeline
const STEP_STATUS_DOT: Record<AgentExecutionStepStatus, string> = {
  PASSED: 'bg-emerald-500',
  FAILED: 'bg-red-500',
  SKIPPED: 'bg-muted-foreground',
}

interface ExecutionStepCardProps {
  step: AgentExecutionStepDto
}

export function ExecutionStepCard({ step }: ExecutionStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const Icon = STEP_TYPE_ICON[step.type]
  const typeLabel = STEP_TYPE_LABEL[step.type]
  const statusConfig = STEP_STATUS_CONFIG[step.status]
  const dotColor = STEP_STATUS_DOT[step.status]

  const hasDetails = step.input !== null || step.output !== null

  return (
    <div className="relative pl-8">
      {/* Dot indicador na linha da timeline — centralizado sobre a linha vertical (left-[11px]) */}
      <div
        className={`absolute left-1.5 top-3.5 h-2.5 w-2.5 rounded-full border-2 border-background ${dotColor}`}
      />

      <div className="rounded-lg border bg-card p-3 shadow-sm">
        {/* Cabeçalho do step */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon size={14} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{typeLabel}</p>
              {step.type === 'TOOL_CALL' && step.toolName && (
                <p className="text-xs text-muted-foreground truncate">
                  {step.toolName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {step.durationMs !== null && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(step.durationMs)}
              </span>
            )}
            <Badge
              variant="outline"
              className={`text-xs ${statusConfig.className}`}
            >
              {statusConfig.label}
            </Badge>
            {hasDetails && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon size={14} />
                ) : (
                  <ChevronRightIcon size={14} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Detalhes expandidos: input e output em JSON */}
        {isExpanded && hasDetails && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {step.input !== null && (
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Input
                </p>
                <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto max-h-60">
                  {JSON.stringify(step.input, null, 2)}
                </pre>
              </div>
            )}
            {step.output !== null && (
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Output
                </p>
                <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-x-auto max-h-60">
                  {JSON.stringify(step.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
