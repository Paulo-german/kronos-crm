import { Folder } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import Link from 'next/link'

export const EmptyPipeline = () => {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Folder className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">Nenhum pipeline encontrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu pipeline será criado automaticamente. Tente recarregar a página.
        </p>
      </div>
      <Button asChild>
        <Link href="/pipeline/settings">Configurar Pipeline</Link>
      </Button>
    </div>
  )
}
