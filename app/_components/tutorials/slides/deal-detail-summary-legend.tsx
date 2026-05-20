'use client'

import { FileText, User, StickyNote, Activity } from 'lucide-react'

const SECTIONS = [
  { icon: FileText, label: 'Informações', desc: 'Valor, etapa e data prevista de fechamento' },
  { icon: User, label: 'Contatos', desc: 'Contatos e empresa vinculados ao negócio' },
  { icon: StickyNote, label: 'Notas', desc: 'Observações internas do time de vendas' },
  { icon: Activity, label: 'Timeline', desc: 'Histórico completo de atividades registradas' },
]

export const DealDetailSummaryLegend = () => {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-medium text-muted-foreground">O que você encontra aqui:</p>
      {SECTIONS.map((section) => (
        <div key={section.label} className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
            <section.icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{section.label}</p>
            <p className="text-xs text-muted-foreground">{section.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
