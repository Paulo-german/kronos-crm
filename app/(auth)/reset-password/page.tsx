import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import ResetPasswordForm from './_components/reset-password-form'

const ResetPasswordPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/auth-code-error')
  }

  return (
    <>
      {/* Logo + Nome */}
      <div className="flex items-center gap-2">
        <KronosLogo className="h-7 w-7 text-primary" />
        <span className="text-lg font-bold tracking-wide">KRONOS</span>
      </div>

      {/* Título */}
      <h1 className="mt-8 text-2xl font-bold">Redefinir senha</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Escolha uma nova senha para sua conta
      </p>

      {/* Formulário */}
      <div className="mt-6">
        <ResetPasswordForm />
      </div>
    </>
  )
}

export default ResetPasswordPage
