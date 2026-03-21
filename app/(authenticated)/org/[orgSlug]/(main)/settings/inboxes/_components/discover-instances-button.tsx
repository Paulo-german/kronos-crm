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

      const messages: string[] = []

      if (data.imported > 0) {
        messages.push(`${data.imported} instância(s) importada(s)`)
      }
      if (data.orphansCleaned > 0) {
        messages.push(`${data.orphansCleaned} órfã(s) removida(s)`)
      }
      if (data.webhooksUpdated > 0) {
        messages.push(`${data.webhooksUpdated} webhook(s) atualizado(s)`)
      }

      if (messages.length > 0) {
        toast.success(messages.join(', ') + '.')
      } else {
        toast.info('Tudo sincronizado. Nenhuma alteração necessária.')
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
