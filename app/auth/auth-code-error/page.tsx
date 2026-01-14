import Link from 'next/link'

/**
 * Página de erro quando a confirmação de email falha.
 */
const AuthCodeErrorPage = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-destructive">
          Erro na confirmação
        </h1>
        <p className="mt-2 text-muted-foreground">
          O link de confirmação expirou ou é inválido.
        </p>
        <Link
          href="/sign-up"
          className="mt-4 inline-block text-primary underline"
        >
          Tentar novamente
        </Link>
      </div>
    </div>
  )
}

export default AuthCodeErrorPage
