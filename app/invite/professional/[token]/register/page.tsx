import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { ProfessionalInviteRegisterForm } from './_components/professional-invite-register-form'

interface ProfessionalInviteRegisterPageProps {
  params: Promise<{ token: string }>
}

export default async function ProfessionalInviteRegisterPage({
  params,
}: ProfessionalInviteRegisterPageProps) {
  const { token } = await params

  // 1. Validar token (sem userId, com token)
  const professional = await db.professional.findFirst({
    where: { inviteToken: token, userId: null },
    select: {
      id: true,
      name: true,
      email: true,
      inviteExpiresAt: true,
      organization: {
        select: { name: true, slug: true },
      },
    },
  })

  if (!professional) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500">
          Convite inválido ou expirado
        </h1>
        <p className="mt-2 text-muted-foreground">
          Este link de convite não existe ou já foi utilizado.
        </p>
      </div>
    )
  }

  // 2. Verificar expiração
  if (
    !professional.inviteExpiresAt ||
    professional.inviteExpiresAt < new Date()
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500">Convite expirado</h1>
        <p className="mt-2 text-muted-foreground">
          Este convite expirou. Solicite um novo ao administrador da
          organização.
        </p>
      </div>
    )
  }

  // 3. Fallback: sem email, redireciona para aceite direto (precisa estar logado)
  if (!professional.email) {
    redirect(`/invite/professional/${token}`)
  }

  // 4. Se já logado, redirecionar para a página de aceite
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(`/invite/professional/${token}`)
  }

  // 5. Se email já tem conta, redirecionar para login
  const existingUser = await db.user.findUnique({
    where: { email: professional.email },
    select: { id: true },
  })

  if (existingUser) {
    redirect(
      `/login?next=${encodeURIComponent(`/invite/professional/${token}`)}`,
    )
  }

  return (
    <div className="flex h-screen w-screen">
      {/* Painel esquerdo: gradiente premium (hidden no mobile) */}
      <div className="bg-banner-premium hidden w-[60%] flex-col items-center justify-center lg:flex">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <KronosLogo className="h-12 w-12 text-white" />
        </div>
      </div>

      {/* Painel direito: formulário */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-background px-8 lg:px-16">
        <div className="w-full max-w-md">
          <ProfessionalInviteRegisterForm
            token={token}
            email={professional.email}
            orgName={professional.organization.name}
          />
        </div>
      </div>
    </div>
  )
}
