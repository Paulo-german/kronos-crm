import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Zap } from 'lucide-react'

export function TabAutomations() {
  return (
    <div className="flex justify-center py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Reaja automaticamente a quedas de score</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Em breve: configure regras que disparam quando o score de um contato cair abaixo de um limite.
          </p>
          <ul className="mt-4 space-y-1.5 text-left text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
              Notificar responsável quando score cair abaixo de 40
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
              Criar tarefa de follow-up automática para clientes dormant
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
              Mover deal para estágio de revisão após N dias parado
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
