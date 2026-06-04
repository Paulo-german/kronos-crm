import { MessageSquare } from 'lucide-react'

const TestChatEmptyState = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="rounded-full bg-muted p-4">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Comece a conversar com seu agente
        </p>
        <p className="text-xs text-muted-foreground">
          Envie uma mensagem para testar o comportamento do agente com as
          configurações atuais.
        </p>
      </div>
      <p className="mt-1 max-w-[220px] text-xs text-muted-foreground/70">
        Créditos serão consumidos normalmente durante o teste.
      </p>
    </div>
  )
}

export default TestChatEmptyState
