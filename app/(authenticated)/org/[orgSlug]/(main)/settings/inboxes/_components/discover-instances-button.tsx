'use client'

import { useAction } from 'next-safe-action/hooks'
import { Button } from '@/_components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { discoverInstances } from '@/_actions/inbox/discover-instances'

const DiscoverInstancesButton = () => {
  const { execute, isPending } = useAction(discoverInstances, {
    onSuccess: ({ data }) => {
      if (!data) return

      if (data.imported > 0) {
        toast.success(
          `${data.imported} instância(s) encontrada(s) e importada(s).`,
        )
      } else {
        toast.info('Nenhuma instância nova encontrada.')
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao buscar instâncias.')
    },
  })

  return (
    <Button
      variant="outline"
      onClick={() => execute({})}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Search className="mr-2 h-4 w-4" />
      )}
      Buscar Instâncias
    </Button>
  )
}

export default DiscoverInstancesButton
