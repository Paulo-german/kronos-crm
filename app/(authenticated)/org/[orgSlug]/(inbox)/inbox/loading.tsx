import { MessageSquare } from 'lucide-react'
import { Skeleton } from '@/_components/ui/skeleton'

// Skeleton da rota (mostrado enquanto o server component busca os dados). Espelha o
// shell REAL do inbox — sidebar na mesma largura (md:w-[28rem]) e painel de chat com o
// MESMO empty-state neutro do loading do InboxClient. Não desenha cabeçalho de página
// (a tela real não tem) nem conversa fake (com nada selecionado o painel é um empty-state,
// não uma thread) — assim a rota emenda no estado final sem shift nem "segunda tela".
const InboxLoading = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 border-t border-border/50">
        {/* Sidebar — mesma largura do real; header + linhas da lista */}
        <div className="hidden w-full flex-col border-r border-border/50 md:flex md:w-[28rem] md:shrink-0">
          <div className="border-b border-border/50 p-4">
            <Skeleton className="mb-3 h-6 w-28" />
            <Skeleton className="mb-3 h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1 space-y-1 p-2">
            {['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].map((key) => (
              <div key={key} className="flex items-start gap-3 p-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Painel de chat — empty-state neutro, idêntico ao loading do InboxClient */}
        <div className="flex flex-1 flex-col">
          <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-xl" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary/50 shadow-md shadow-primary/15">
                <MessageSquare className="size-8 text-white" />
              </div>
            </div>
            <div className="flex w-full max-w-sm flex-col items-center gap-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InboxLoading
