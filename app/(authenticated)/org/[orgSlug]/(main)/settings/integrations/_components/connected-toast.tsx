'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Permissão negada. Conecte novamente se desejar.',
  invalid_request: 'Requisição inválida. Tente conectar novamente.',
  invalid_state: 'Sessão inválida. Tente conectar novamente.',
  state_expired: 'A janela de autenticação expirou. Tente novamente.',
  user_mismatch: 'Usuário da sessão não corresponde. Faça login e tente novamente.',
  token_exchange_failed: 'Erro ao conectar com o Google. Tente novamente.',
  no_refresh_token: 'Google não retornou token de atualização. Tente desconectar e reconectar.',
  userinfo_failed: 'Não foi possível obter informações da conta Google. Tente novamente.',
}

function cleanSearchParams(
  searchParams: URLSearchParams,
  keysToRemove: string[],
): string {
  const params = new URLSearchParams(searchParams.toString())
  for (const key of keysToRemove) {
    params.delete(key)
  }
  const remaining = params.toString()
  return remaining ? `?${remaining}` : ''
}

const ConnectedToast = () => {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected === 'google') {
      toast.success('Google Calendar conectado com sucesso!')
      window.history.replaceState(null, '', cleanSearchParams(searchParams, ['connected']) || window.location.pathname)
      router.refresh()
      return
    }

    if (error) {
      const message = ERROR_MESSAGES[error] ?? 'Erro inesperado ao conectar. Tente novamente.'
      toast.error(message)
      window.history.replaceState(null, '', cleanSearchParams(searchParams, ['error']) || window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default ConnectedToast
