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

/**
 * Hook que indica se o Facebook SDK esta carregado e inicializado.
 * Deve ser usado em componentes que precisam do FB.login().
 */
export function useMetaSdk(): { ready: boolean } {
  const [ready, setReady] = useState(sdkReady)

  // O estado e atualizado via callback do Script onLoad — sem useEffect
  return { ready }
}

interface MetaSdkLoaderProps {
  onReady?: () => void
}

/**
 * Carrega o Facebook SDK de forma lazy usando o componente Script do Next.js.
 * NAO usa useEffect — o onLoad do Script e o padrao correto para scripts externos.
 *
 * Deve ser montado uma unica vez no layout ou no componente que precisa do SDK.
 */
const MetaSdkLoader = ({ onReady }: MetaSdkLoaderProps) => {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? ''

  const handleLoad = () => {
    if (!window.FB) return

    window.FB.init({
      appId,
      cookie: true,
      xfbml: true,
      version: 'v25.0',
    })

    sdkReady = true
    onReady?.()
  }

  return (
    <Script
      src="https://connect.facebook.net/en_US/sdk.js"
      strategy="lazyOnload"
      onLoad={handleLoad}
    />
  )
}

export default MetaSdkLoader
