'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

interface PipelineQueryProviderProps {
  children: React.ReactNode
}

export function PipelineQueryProvider({
  children,
}: PipelineQueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            gcTime: 5 * 60 * 1000,
            retry: 2,
            // Sem polling nas colunas: a frescura vem de refetch após mutações
            // (move/criar/editar) e foco da janela, evitando recarregar durante drag.
            refetchOnWindowFocus: true,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
