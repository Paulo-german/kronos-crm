'use client'

import { useState } from 'react'
import { ZoomIn } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/_components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/_components/ui/dialog'
import { cn } from '@/_lib/utils'

// --- Sub-componentes internos do diagrama ---

interface DiagramCardProps {
  title: string
  description: string
  colorClass: string
  compact: boolean
}

const DiagramCard = ({ title, description, colorClass, compact }: DiagramCardProps) => (
  <div
    className={cn(
      'rounded-md border border-foreground/10 flex flex-col justify-center',
      colorClass,
      compact ? 'p-2 gap-0.5' : 'p-3 gap-1',
    )}
  >
    <span className={cn('font-semibold leading-tight', compact ? 'text-xs' : 'text-sm')}>
      {title}
    </span>
    {!compact && (
      <span className="text-xs opacity-70 leading-snug">{description}</span>
    )}
  </div>
)

// Bracket esquerdo: conecta 2 itens à esquerda para 1 ao centro
const LeftBracket = () => (
  <div className="relative self-stretch w-8 flex-shrink-0 text-foreground/40">
    {/* metade superior do bracket */}
    <div className="absolute top-[15%] bottom-1/2 left-1 right-2 border-t border-r border-foreground/30 rounded-tr-md" />
    {/* metade inferior do bracket */}
    <div className="absolute top-1/2 bottom-[15%] left-1 right-2 border-b border-r border-foreground/30 rounded-br-md" />
    {/* linha horizontal para a direita */}
    <div className="absolute top-1/2 left-1/2 right-0 h-px -translate-y-px bg-foreground/30" />
  </div>
)

// Bracket direito: conecta 1 item ao centro para 3 à direita
const RightBracket = () => (
  <div className="relative self-stretch w-8 flex-shrink-0 text-foreground/40">
    {/* linha de entrada do centro */}
    <div className="absolute top-1/2 left-0 right-1/2 h-px -translate-y-px bg-foreground/30" />
    {/* linha vertical ligando os 3 outputs */}
    <div className="absolute top-[17%] bottom-[17%] left-1/2 w-px bg-foreground/30" />
    {/* braço superior */}
    <div className="absolute top-[17%] left-1/2 right-1 h-px bg-foreground/30" />
    {/* braço do meio */}
    <div className="absolute top-1/2 left-1/2 right-1 h-px -translate-y-px bg-foreground/30" />
    {/* braço inferior */}
    <div className="absolute bottom-[17%] left-1/2 right-1 h-px bg-foreground/30" />
  </div>
)

// Diagrama completo — reutilizado em preview e dialog
interface PlatformDiagramProps {
  compact?: boolean
}

const PlatformDiagram = ({ compact = false }: PlatformDiagramProps) => (
  <div
    className={cn(
      'flex items-stretch gap-0 w-full',
      compact ? 'min-h-[160px]' : 'min-h-[280px]',
    )}
  >
    {/* Coluna esquerda — Contatos e Empresas */}
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex flex-col gap-2 h-full border border-dashed border-foreground/20 rounded-lg p-2">
        <DiagramCard
          title="Contatos"
          description="São pessoas com quem você interage ou planeja interagir."
          colorClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400"
          compact={compact}
        />
        <DiagramCard
          title="Empresas"
          description="São organizações vinculadas aos seus contatos."
          colorClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400"
          compact={compact}
        />
      </div>
    </div>

    <LeftBracket />

    {/* Coluna central — Negociações */}
    <div className="flex items-center flex-1 min-w-0">
      <DiagramCard
        title="Negociações"
        description="São oportunidades de vendas onde você registra o progresso e as interações."
        colorClass="bg-amber-500/10 text-amber-700 dark:text-amber-400 w-full"
        compact={compact}
      />
    </div>

    <RightBracket />

    {/* Coluna direita — Tarefas, Conversas, Agentes de IA */}
    <div className="flex flex-col justify-between gap-2 flex-1 min-w-0">
      <DiagramCard
        title="Tarefas"
        description="Atividades relacionadas à negociação em andamento."
        colorClass="bg-primary/10 text-primary"
        compact={compact}
      />
      <DiagramCard
        title="Conversas"
        description="Interações via WhatsApp e outros canais registradas na negociação."
        colorClass="bg-primary/10 text-primary"
        compact={compact}
      />
      <DiagramCard
        title="Agentes de IA"
        description="Assistentes que automatizam o atendimento nas conversas."
        colorClass="bg-primary/10 text-primary"
        compact={compact}
      />
    </div>
  </div>
)

// --- Componente principal ---

const PlatformMap = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card
        className="cursor-pointer hover:border-primary/50 transition-colors group"
        onClick={() => setOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Como funciona o Kronos HUB</CardTitle>
            <ZoomIn className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Como funciona o Kronos HUB</DialogTitle>
            <DialogDescription>
              Entenda como os dados se relacionam e tenha mais clareza do funcionamento da plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="p-2">
            <PlatformDiagram />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PlatformMap
