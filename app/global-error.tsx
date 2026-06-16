'use client'

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

// Só dispara em erros do layout raiz — precisa renderizar <html>/<body>
// próprios porque substitui o RootLayout inteiro.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '1.5rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#fff',
          color: '#0a0a0a',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
          Algo deu muito errado
        </h1>
        <p style={{ maxWidth: '28rem', fontSize: '0.875rem', color: '#666' }}>
          Ocorreu um erro crítico na aplicação. Recarregue a página ou tente
          novamente em alguns instantes.
        </p>
        {error.digest ? (
          <p style={{ fontSize: '0.75rem', color: '#999' }}>
            Código: {error.digest}
          </p>
        ) : null}
        <button
          onClick={reset}
          style={{
            borderRadius: '0.5rem',
            background: '#0a0a0a',
            color: '#fff',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
