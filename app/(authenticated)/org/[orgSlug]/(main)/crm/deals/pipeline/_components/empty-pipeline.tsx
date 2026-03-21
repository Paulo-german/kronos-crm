import { Kanban, Sparkles } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface EmptyPipelineProps {
  onOpenSettings?: () => void
}

export const EmptyPipeline = ({ onOpenSettings }: EmptyPipelineProps) => {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <Kanban className="size-10 text-primary-foreground" />
        </div>
      </div>
      <div className="max-w-sm text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Monte seu funil de vendas
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Configure as etapas do seu processo comercial e comece a acompanhar
          suas negociações de perto.
        </p>
      </div>
      {onOpenSettings && (
        <Button
          onClick={onOpenSettings}
          className="gap-2 shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-4 w-4" />
          Configurar Pipeline
        </Button>
      )}
    </div>
  )
}
