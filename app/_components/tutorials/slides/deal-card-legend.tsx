'use client'

// Legenda de status com cores reais do sistema
const STATUS_LEGEND = [
  { label: 'Novo', color: 'bg-blue-500' },
  { label: 'Em andamento', color: 'bg-purple-500' },
  { label: 'Vendido', color: 'bg-emerald-500' },
  { label: 'Perdido', color: 'bg-red-500' },
  { label: 'Pausado', color: 'bg-yellow-500' },
]

// Legenda de prioridade com cores reais do sistema
const PRIORITY_LEGEND = [
  { label: 'Baixa', color: 'bg-zinc-400' },
  { label: 'Média', color: 'bg-blue-500' },
  { label: 'Alta', color: 'bg-yellow-500' },
  { label: 'Urgente', color: 'bg-red-500' },
]

/**
 * Legendas de status, prioridade e dias inativos para o slide "Entendendo o card".
 * Renderizado na coluna esquerda pelo TutorialSlideContent.
 */
export const DealCardLegend = () => {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Os cartões podem ter os seguintes status:
      </p>

      {/* Legenda de status */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {STATUS_LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
            <span className="text-xs text-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Cada cartão indica a{' '}
        <strong className="text-foreground">prioridade</strong>:
      </p>

      {/* Legenda de prioridade */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {PRIORITY_LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
            <span className="text-xs text-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Explicação dos dias inativos */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          O indicador de{' '}
          <strong className="text-foreground">dias sem atividade</strong> muda
          de cor:
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-xs text-muted-foreground">12+ dias</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">30+ dias</span>
          </div>
        </div>
      </div>
    </div>
  )
}
