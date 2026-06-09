'use client'

import { useState } from 'react'
import {
  ZoomIn,
  Users,
  Building2,
  Kanban,
  CheckSquare,
  CalendarClock,
  Inbox,
  Bot,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/_components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/_components/ui/dialog'
import { cn } from '@/_lib/utils'

// --- Conectores SVG ---

const SvgLeftBracket = ({ highlighted }: { highlighted: boolean }) => (
  <div
    className={cn(
      'relative w-10 flex-shrink-0 self-stretch transition-colors duration-200',
      highlighted ? 'text-primary' : 'text-foreground/25',
    )}
  >
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 40 100"
      preserveAspectRatio="none"
    >
      <line
        x1="4"
        y1="25"
        x2="24"
        y2="25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="4"
        y1="75"
        x2="24"
        y2="75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="24"
        y1="25"
        x2="24"
        y2="75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="24"
        y1="50"
        x2="38"
        y2="50"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
    <div className="absolute right-0 top-1/2 -translate-y-1/2 border-y-[4px] border-l-[6px] border-y-transparent border-l-current" />
  </div>
)

const SvgRightBracketTwo = ({ highlighted }: { highlighted: boolean }) => (
  <div
    className={cn(
      'relative w-10 flex-shrink-0 self-stretch transition-colors duration-200',
      highlighted ? 'text-primary' : 'text-foreground/25',
    )}
  >
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 40 100"
      preserveAspectRatio="none"
    >
      <line
        x1="2"
        y1="50"
        x2="16"
        y2="50"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="16"
        y1="25"
        x2="16"
        y2="75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="16"
        y1="25"
        x2="34"
        y2="25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="16"
        y1="75"
        x2="34"
        y2="75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
    <div className="absolute right-0 top-1/4 -translate-y-1/2 border-y-[4px] border-l-[6px] border-y-transparent border-l-current" />
    <div className="absolute right-0 top-3/4 -translate-y-1/2 border-y-[4px] border-l-[6px] border-y-transparent border-l-current" />
  </div>
)

const SvgSimpleArrow = ({ highlighted }: { highlighted: boolean }) => (
  <div
    className={cn(
      'relative flex w-10 flex-shrink-0 items-center self-stretch transition-colors duration-200',
      highlighted ? 'text-primary' : 'text-foreground/25',
    )}
  >
    <svg className="h-6 w-full" viewBox="0 0 40 10" preserveAspectRatio="none">
      <line
        x1="2"
        y1="5"
        x2="32"
        y2="5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
    <div className="absolute right-0 top-1/2 -translate-y-1/2 border-y-[4px] border-l-[6px] border-y-transparent border-l-current" />
  </div>
)

// --- Card de entidade ---

interface DiagramCardProps {
  id: string
  title: string
  description: string
  detail: string
  colorClass: string
  iconColorClass: string
  hoverRingClass: string
  Icon: LucideIcon
  compact: boolean
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  className?: string
}

const DiagramCard = ({
  title,
  description,
  detail,
  colorClass,
  iconColorClass,
  hoverRingClass,
  Icon,
  compact,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  className,
}: DiagramCardProps) => {
  const [showDetail, setShowDetail] = useState(false)

  const handleMouseEnter = () => {
    onMouseEnter()
    setShowDetail(true)
  }

  const handleMouseLeave = () => {
    onMouseLeave()
    setShowDetail(false)
  }

  return (
    <div
      className={cn(
        'group flex cursor-default flex-col justify-center rounded-md border transition-all duration-200',
        colorClass,
        compact ? 'gap-0.5 p-2' : 'gap-1 p-3',
        isHovered && cn('scale-[1.02] ring-1', hoverRingClass),
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            'flex-shrink-0',
            compact ? 'h-3 w-3' : 'h-4 w-4',
            iconColorClass,
          )}
        />
        <span
          className={cn(
            'font-semibold leading-tight',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {title}
        </span>
      </div>

      <span
        className={cn(
          'leading-snug opacity-70',
          compact ? 'text-[10px]' : 'text-xs',
        )}
      >
        {description}
      </span>

      {!compact && showDetail && (
        <span className="border-current/10 mt-1 border-t pt-1 text-xs leading-snug opacity-60 duration-200 animate-in fade-in-0 slide-in-from-top-1">
          {detail}
        </span>
      )}
    </div>
  )
}

// --- Label de seção ---

const SectionLabel = ({ label }: { label: string }) => (
  <span className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
    {label}
  </span>
)

// --- Step label ---

const StepLabel = ({ label }: { label: string }) => (
  <span className="mb-1 text-[10px] font-semibold text-muted-foreground/60">
    {label}
  </span>
)

// --- Legenda ---

interface LegendItemProps {
  color: string
  label: string
}

const LegendItem = ({ color, label }: LegendItemProps) => (
  <div className="flex items-center gap-1.5">
    <div className={cn('h-3 w-3 rounded-sm', color)} />
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
)

// --- Diagrama completo ---

interface PlatformDiagramProps {
  compact?: boolean
}

const PlatformDiagram = ({ compact = false }: PlatformDiagramProps) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const makeCardHandlers = (id: string) => ({
    onMouseEnter: () => setHoveredCard(id),
    onMouseLeave: () => setHoveredCard(null),
  })

  const crmLeftHighlighted =
    hoveredCard === 'crm-contacts' ||
    hoveredCard === 'companies' ||
    hoveredCard === 'deals'

  const crmRightHighlighted =
    hoveredCard === 'deals' ||
    hoveredCard === 'tasks' ||
    hoveredCard === 'appointments'

  const commArrow1Highlighted =
    hoveredCard === 'comm-contacts' || hoveredCard === 'conversations'

  const commArrow2Highlighted =
    hoveredCard === 'conversations' || hoveredCard === 'agents'

  return (
    <div className="flex flex-col gap-6">
      {/* Fluxo CRM */}
      <div className="flex flex-col gap-2">
        <SectionLabel label="CRM" />
        <div className="rounded-xl bg-muted/50 p-4">
          <div
            className={cn(
              'flex items-stretch gap-0',
              compact ? 'min-h-[100px]' : 'min-h-[160px]',
            )}
          >
            {/* Coluna: Contatos + Empresas */}
            <div className="flex min-w-0 flex-1 flex-col">
              {!compact && <StepLabel label="Passo 1" />}
              <div className="flex h-full flex-col gap-2 rounded-lg border border-dashed border-foreground/20 p-2">
                <DiagramCard
                  id="crm-contacts"
                  title="Contatos"
                  description="Pessoas com quem você interage ou planeja interagir."
                  detail="Armazene nome, email, telefone e histórico. Pode ser vinculado a uma empresa e a múltiplas negociações."
                  colorClass="bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400"
                  hoverRingClass="ring-cyan-500"
                  iconColorClass="text-cyan-600 dark:text-cyan-400"
                  Icon={Users}
                  compact={compact}
                  isHovered={hoveredCard === 'crm-contacts'}
                  className="flex-1"
                  {...makeCardHandlers('crm-contacts')}
                />
                <DiagramCard
                  id="companies"
                  title="Empresas"
                  description="Organizações vinculadas aos seus contatos."
                  detail="Organize contatos por empresa. Vinculada diretamente às negociações do pipeline."
                  colorClass="bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400"
                  hoverRingClass="ring-cyan-500"
                  iconColorClass="text-cyan-600 dark:text-cyan-400"
                  Icon={Building2}
                  compact={compact}
                  isHovered={hoveredCard === 'companies'}
                  className="flex-1"
                  {...makeCardHandlers('companies')}
                />
              </div>
            </div>

            <SvgLeftBracket highlighted={crmLeftHighlighted} />

            {/* Coluna: Negociações */}
            <div className="flex min-w-0 flex-1 flex-col">
              {!compact && <StepLabel label="Passo 2" />}
              <div className="flex h-full items-center">
                <DiagramCard
                  id="deals"
                  title="Negociações"
                  description="Oportunidades de vendas que avançam pelo pipeline comercial."
                  detail="Acompanhe valor, etapa, prioridade e data prevista de fechamento no pipeline visual."
                  colorClass="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 w-full"
                  hoverRingClass="ring-amber-500"
                  iconColorClass="text-amber-600 dark:text-amber-400"
                  Icon={Kanban}
                  compact={compact}
                  isHovered={hoveredCard === 'deals'}
                  {...makeCardHandlers('deals')}
                />
              </div>
            </div>

            <SvgRightBracketTwo highlighted={crmRightHighlighted} />

            {/* Coluna: Tarefas + Agendamentos */}
            <div className="flex min-w-0 flex-1 flex-col">
              {!compact && <StepLabel label="Passo 3" />}
              <div className="flex h-full flex-col justify-between gap-2">
                <DiagramCard
                  id="tasks"
                  title="Tarefas"
                  description="Atividades a executar vinculadas à negociação."
                  detail="Crie ligações, visitas, e-mails ou reuniões a fazer — com prazo e responsável definidos."
                  colorClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  hoverRingClass="ring-emerald-500"
                  iconColorClass="text-emerald-600 dark:text-emerald-400"
                  Icon={CheckSquare}
                  compact={compact}
                  isHovered={hoveredCard === 'tasks'}
                  className="flex-1"
                  {...makeCardHandlers('tasks')}
                />
                <DiagramCard
                  id="appointments"
                  title="Agendamentos"
                  description="Reuniões e eventos com data e horário marcados."
                  detail="Agende reuniões com data e horário, com sincronização opcional com o Google Calendar."
                  colorClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  hoverRingClass="ring-emerald-500"
                  iconColorClass="text-emerald-600 dark:text-emerald-400"
                  Icon={CalendarClock}
                  compact={compact}
                  isHovered={hoveredCard === 'appointments'}
                  className="flex-1"
                  {...makeCardHandlers('appointments')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fluxo Comunicação */}
      <div className="flex flex-col gap-2">
        <SectionLabel label="Comunicação" />
        <div className="rounded-xl bg-muted/50 p-4">
          <div
            className={cn(
              'flex items-stretch gap-0',
              compact ? 'min-h-[52px]' : 'min-h-[80px]',
            )}
          >
            {/* Coluna: Contatos */}
            <div className="flex min-w-0 flex-1 flex-col">
              {!compact && <StepLabel label="Origem" />}
              <div className="flex h-full items-center">
                <DiagramCard
                  id="comm-contacts"
                  title="Contatos"
                  description="Ponto de origem de todas as conversas."
                  detail="Armazene nome, email, telefone e histórico. Pode ser vinculado a uma empresa e a múltiplas negociações."
                  colorClass="bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400 w-full"
                  hoverRingClass="ring-cyan-500"
                  iconColorClass="text-cyan-600 dark:text-cyan-400"
                  Icon={Users}
                  compact={compact}
                  isHovered={hoveredCard === 'comm-contacts'}
                  {...makeCardHandlers('comm-contacts')}
                />
              </div>
            </div>

            <SvgSimpleArrow highlighted={commArrow1Highlighted} />

            {/* Coluna: Conversas */}
            <div className="flex min-w-0 flex-1 flex-col">
              {!compact && <StepLabel label="Canal" />}
              <div className="flex h-full items-center">
                <DiagramCard
                  id="conversations"
                  title="Conversas"
                  description="Mensagens via WhatsApp e outros canais com o contato."
                  detail="Histórico completo de mensagens WhatsApp. Pode estar vinculada a uma negociação."
                  colorClass="bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-400 w-full"
                  hoverRingClass="ring-violet-500"
                  iconColorClass="text-violet-600 dark:text-violet-400"
                  Icon={Inbox}
                  compact={compact}
                  isHovered={hoveredCard === 'conversations'}
                  {...makeCardHandlers('conversations')}
                />
              </div>
            </div>

            <SvgSimpleArrow highlighted={commArrow2Highlighted} />

            {/* Coluna: Agentes de IA */}
            <div className="flex min-w-0 flex-1 flex-col">
              {!compact && <StepLabel label="Automação" />}
              <div className="flex h-full items-center">
                <DiagramCard
                  id="agents"
                  title="Agentes de IA"
                  description="Automatizam o atendimento respondendo conversas no seu lugar."
                  detail="Configure etapas, base de conhecimento e ações automáticas como mover negociações."
                  colorClass="bg-primary/10 border-primary/20 text-primary w-full"
                  hoverRingClass="ring-primary"
                  iconColorClass="text-primary"
                  Icon={Bot}
                  compact={compact}
                  isHovered={hoveredCard === 'agents'}
                  {...makeCardHandlers('agents')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legenda — sempre visível */}
      <div
        className={cn(
          'flex flex-wrap gap-3 border-t border-border/50 pt-3',
          compact && 'gap-2',
        )}
      >
        <LegendItem color="bg-cyan-500/20" label="Base de dados" />
        <LegendItem color="bg-amber-500/20" label="Pipeline CRM" />
        <LegendItem color="bg-emerald-500/20" label="Atividades" />
        <LegendItem color="bg-violet-500/20" label="Comunicação" />
        <LegendItem color="bg-primary/20" label="Automação IA" />
      </div>
    </div>
  )
}

// --- Componente principal ---

const PlatformMap = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card
        className="group w-full cursor-pointer transition-colors hover:border-primary/50"
        onClick={() => setOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Como funciona a KRONOS HUB
            </CardTitle>
            <ZoomIn className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            Entenda como os dados se relacionam na plataforma.
          </p>
        </CardHeader>
        <CardContent>
          <PlatformDiagram compact />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Como funciona o Kronos HUB</DialogTitle>
            <DialogDescription>
              Entenda como os dados se relacionam e tenha mais clareza do
              funcionamento da plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="p-2">
            <div className="duration-300 animate-in fade-in-0 zoom-in-95">
              <PlatformDiagram />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PlatformMap
