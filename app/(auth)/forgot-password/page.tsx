import { KronosLogo } from '@/_components/icons/kronos-logo'
import { Separator } from '@/_components/ui/separator'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import ForgotPasswordForm from './_components/forgot-password-form'

const ForgotPasswordPage = () => {
  return (
    <>
      {/* Logo + Nome */}
      <div className="flex items-center gap-2">
        <KronosLogo className="h-7 w-7 text-primary" />
        <span className="text-lg font-bold tracking-wide">KRONOS</span>
      </div>

      {/* Título */}
      <h1 className="mt-8 text-2xl font-bold">Esqueceu sua senha?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Digite seu email e enviaremos um link para redefinir sua senha
      </p>

      {/* Formulário */}
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>

      <Separator className="my-6" />

      {/* CTA para login */}
      <Link
        href="/login"
        className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
      >
        <KronosLogo className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Lembrou sua senha?</p>
          <p className="text-sm text-primary">Voltar para o login</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </>
  )
}

export default ForgotPasswordPage
