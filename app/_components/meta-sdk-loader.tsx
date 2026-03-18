'use client'

import { useState } from 'react'
import Script from 'next/script'

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

// Contexto global de estado do SDK — evita multiplos carregamentos
let sdkReady = false
let pendingCallback: (() => void) | null = null

/**
 * Hook que indica se o Facebook SDK esta carregado e inicializado.
 * Deve ser usado em componentes que precisam do FB.login().
 */
export function useMetaSdk(): { ready: boolean } {
  const [ready] = useState(sdkReady)

  return { ready }
}

interface MetaSdkLoaderProps {
  onReady?: () => void
}

/**
 * Carrega o Facebook SDK usando o padrao oficial fbAsyncInit.
 *
 * O SDK do Facebook chama window.fbAsyncInit quando esta pronto internamente.
 * Usar onLoad do Script NAO e suficiente — o arquivo pode ter sido baixado
 * mas o SDK ainda nao inicializou (causa "FB.login() called before FB.init()").
 *
 * Fluxo:
 * 1. Registra window.fbAsyncInit com FB.init() + callback onReady
 * 2. Monta <Script> que carrega o SDK
 * 3. SDK chama fbAsyncInit → FB.init() → onReady()
 */
const MetaSdkLoader = ({ onReady }: MetaSdkLoaderProps) => {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? ''

  // Se o SDK ja foi inicializado, dispara onReady imediatamente
  if (sdkReady && window.FB) {
    // Dispara no proximo tick para nao chamar durante render
    if (onReady) {
      pendingCallback = onReady
      queueMicrotask(() => {
        pendingCallback?.()
        pendingCallback = null
      })
    }

    return null
  }

  // Registra o callback oficial do Facebook SDK ANTES do script carregar
  if (typeof window !== 'undefined' && !sdkReady) {
    pendingCallback = onReady ?? null

    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: 'v25.0',
      })

      sdkReady = true
      pendingCallback?.()
      pendingCallback = null
    }
  }

  return (
    <Script
      src="https://connect.facebook.net/en_US/sdk.js"
      strategy="afterInteractive"
    />
  )
}

export default MetaSdkLoader
