'use client'

import { useEffect, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { testEvolutionConnection } from '@/_actions/inbox/test-evolution-connection'
import { testEvolutionGoConnection } from '@/_actions/inbox/test-evolution-go-connection'

const LIVE_CHECK_CONNECTION_TYPES = new Set([
  'EVOLUTION',
  'EVOLUTION_JS',
  'EVOLUTION_GO',
])

/**
 * Verifica ao vivo (rede) se o canal do inbox está desconectado.
 * Nunca confia em `inbox.evolutionConnected` (banco) — fica stale quando a
 * instância cai sem emitir webhook de desconexão. Cobre só Evolution/Evolution
 * Go, que já têm health-check ao vivo pronto; demais tipos nunca reportam
 * desconexão por aqui. Falha ao consultar = tratado como desconectado, mesmo
 * padrão usado no card de conexão de Settings.
 */
export function useChannelConnectionStatus(
  inboxId: string,
  connectionType: string,
): { disconnected: boolean } {
  const [disconnected, setDisconnected] = useState(false)

  const { execute: executeEvolution } = useAction(testEvolutionConnection, {
    onSuccess: ({ data }) =>
      setDisconnected(!data?.success || data.state !== 'open'),
    onError: () => setDisconnected(true),
  })

  const { execute: executeEvolutionGo } = useAction(testEvolutionGoConnection, {
    onSuccess: ({ data }) =>
      setDisconnected(!data?.success || data.state !== 'open'),
    onError: () => setDisconnected(true),
  })

  useEffect(() => {
    setDisconnected(false)

    if (connectionType === 'EVOLUTION' || connectionType === 'EVOLUTION_JS') {
      executeEvolution({ inboxId })
      return
    }

    if (connectionType === 'EVOLUTION_GO') {
      executeEvolutionGo({ inboxId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions do next-safe-action não são referências estáveis
  }, [inboxId, connectionType])

  if (!LIVE_CHECK_CONNECTION_TYPES.has(connectionType)) {
    return { disconnected: false }
  }

  return { disconnected }
}
