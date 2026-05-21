'use client'

import { PencilLineIcon, ScrollTextIcon, FileTextIcon, ZapIcon } from 'lucide-react'

const FIELDS = [
  {
    icon: PencilLineIcon,
    label: 'Nome do step',
    desc: 'Identifica a etapa na lista do processo — use algo descritivo como "Qualificação" ou "Fechamento".',
  },
  {
    icon: ScrollTextIcon,
    label: 'Instruções',
    desc: 'O script que o agente segue nessa etapa: o que perguntar, como responder e quando avançar para o próximo step.',
  },
  {
    icon: FileTextIcon,
    label: 'Templates',
    desc: 'Exemplos de mensagens que mostram ao agente como se comunicar nessa etapa — quanto mais assertivo o exemplo, mais preciso o agente fica.',
  },
  {
    icon: ZapIcon,
    label: 'Ações automáticas',
    desc: 'O que acontece quando o step é atingido — mover o negócio de etapa, criar uma tarefa ou passar para um humano.',
  },
]

export const AgentDetailProcessConfigLegend = () => {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-medium text-muted-foreground">O que preencher em cada campo:</p>
      {FIELDS.map((field) => (
        <div key={field.label} className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
            <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{field.label}</p>
            <p className="text-xs text-muted-foreground">{field.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
