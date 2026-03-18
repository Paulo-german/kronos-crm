'use client'

// Declaracao global para tipar window.FB (Facebook SDK)
declare global {
  interface Window {
    FB: {
      init: (params: {
        appId: string
        cookie: boolean
        xfbml: boolean
        version: string
      }) => void
      login: (
        callback: (response: FBLoginResponse) => void,
        options: FBLoginOptions,
      ) => void
      Event: {
        subscribe: (event: string, callback: (response: unknown) => void) => void
      }
    }
    fbAsyncInit: () => void
  }
}

export interface FBLoginResponse {
  authResponse: {
    code?: string
    accessToken?: string
    userID?: string
  } | null
  status: 'connected' | 'not_authorized' | 'unknown'
}

export interface FBLoginOptions {
  config_id?: string
  response_type?: 'code' | 'token'
  override_default_response_type?: boolean
  extras?: {
    sessionInfoVersion?: number
    setup?: Record<string, unknown>
    featureType?: string
    sessionNonce?: string
  }
}

// Estado global do SDK — sobrevive entre re-renders
let sdkReady = false
let sdkLoading = false

/**
 * Carrega o Facebook SDK e chama o callback quando estiver pronto.
 *
 * Usa o padrao classico da Meta: define window.fbAsyncInit, depois
 * insere o script tag manualmente. O SDK chama fbAsyncInit quando
 * termina sua inicializacao interna.
 *
 * Seguro para chamar multiplas vezes — ignora chamadas duplicadas.
 */
export function loadMetaSdk(onReady: () => void): void {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? ''

  // Ja inicializado — dispara callback imediatamente
  if (sdkReady && window.FB) {
    onReady()
    return
  }

  // Ja esta carregando — substitui o callback pendente
  if (sdkLoading) {
    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: 'v25.0',
      })
      sdkReady = true
      onReady()
    }
    return
  }

  sdkLoading = true

  // 1. Registrar fbAsyncInit ANTES de inserir o script
  window.fbAsyncInit = () => {
    window.FB.init({
      appId,
      cookie: true,
      xfbml: true,
      version: 'v25.0',
    })
    sdkReady = true
    onReady()
  }

  // 2. Inserir script tag manualmente (padrao oficial da Meta)
  const script = document.createElement('script')
  script.id = 'facebook-jssdk'
  script.src = 'https://connect.facebook.net/en_US/sdk.js'
  script.async = true
  document.body.appendChild(script)
}
