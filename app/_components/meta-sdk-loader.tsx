'use client'

// Declaracao global para tipar window.FB (Facebook SDK)
declare global {
  interface Window {
    FB: {
      init: (params: {
        appId: string
        autoLogAppEvents: boolean
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

// Rastreia se FB.init() ja foi chamado por ESTE modulo.
// Pode ser resetado pelo Next.js (code splitting), por isso
// sempre checamos window.FB como fonte de verdade complementar.
let initialized = false

// Fila de callbacks pendentes — enfileira em vez de substituir
const pendingCallbacks: Array<() => void> = []

function initFb(): void {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? ''
  console.log('[MetaSDK] initFb() called — appId:', appId ? '✓ set' : '✗ EMPTY')
  window.FB.init({
    appId,
    autoLogAppEvents: true,
    xfbml: true,
    version: 'v25.0',
  })
  initialized = true
  console.log('[MetaSDK] FB.init() completed — initialized = true')
}

function flushCallbacks(): void {
  console.log('[MetaSDK] flushCallbacks() — pending:', pendingCallbacks.length)
  while (pendingCallbacks.length > 0) {
    const callback = pendingCallbacks.shift()
    callback?.()
  }
}

/**
 * Carrega o Facebook SDK e chama o callback quando estiver pronto.
 *
 * Seguro para chamar multiplas vezes — enfileira callbacks e evita
 * scripts duplicados usando o DOM como fonte de verdade.
 */
export function loadMetaSdk(onReady: () => void): void {
  console.log('[MetaSDK] loadMetaSdk() called — state:', {
    initialized,
    hasFB: typeof window !== 'undefined' && !!window.FB,
    scriptInDOM: !!document.getElementById('facebook-jssdk'),
    pendingCount: pendingCallbacks.length,
  })

  // 1. SDK ja inicializado e presente — dispara imediatamente
  if (initialized && window.FB) {
    console.log('[MetaSDK] → Path 1: already initialized, calling onReady immediately')
    onReady()
    return
  }

  // 2. Modulo re-avaliado (code splitting) mas SDK ja esta no window
  //    Basta chamar init() novamente e disparar o callback
  if (!initialized && window.FB) {
    console.log('[MetaSDK] → Path 2: module re-evaluated, FB exists but not initialized — calling initFb()')
    initFb()
    onReady()
    return
  }

  // 3. SDK ainda nao carregou — enfileira callback
  pendingCallbacks.push(onReady)
  console.log('[MetaSDK] → Path 3: SDK not loaded yet, queued callback (total:', pendingCallbacks.length, ')')

  // 4. Script ja esta no DOM (outra chamada ja inseriu) —
  //    Atualiza fbAsyncInit para flush a fila quando o SDK carregar
  const existingScript = document.getElementById('facebook-jssdk')
  if (existingScript) {
    console.log('[MetaSDK] → Path 4: script already in DOM, updating fbAsyncInit')
    window.fbAsyncInit = () => {
      console.log('[MetaSDK] fbAsyncInit fired (path 4)')
      initFb()
      flushCallbacks()
    }
    return
  }

  // 5. Primeira vez — registra fbAsyncInit e insere o script
  console.log('[MetaSDK] → Path 5: first time — registering fbAsyncInit and inserting script')
  window.fbAsyncInit = () => {
    console.log('[MetaSDK] fbAsyncInit fired (path 5)')
    initFb()
    flushCallbacks()
  }

  const script = document.createElement('script')
  script.id = 'facebook-jssdk'
  script.src = 'https://connect.facebook.net/en_US/sdk.js'
  script.async = true
  script.defer = true
  script.crossOrigin = 'anonymous'
  script.onerror = (event) => {
    console.error('[MetaSDK] Script failed to load!', event)
  }
  document.body.appendChild(script)
  console.log('[MetaSDK] Script tag inserted into DOM')
}
