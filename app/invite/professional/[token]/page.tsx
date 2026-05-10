import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { ProfessionalInviteHandlerClient } from './_components/professional-invite-handler-client'

interface ProfessionalInvitePageProps {
  params: Promise<{ token: string }>
}

export default async function ProfessionalInvitePage({
  params,
}: ProfessionalInvitePageProps) {
  const { token } = await params

  // Busca sem cache — dado sensível e volátil (token limpo após aceite)
  const professional = await db.professional.findFirst({
    where: { inviteToken: token },
    select: {
      id: true,
      name: true,
      email: true,
      userId: true,
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

  // Convite já aceito (userId preenchido e token limpo não chegaria aqui,
  // mas guarda contra inconsistências)
  if (professional.userId !== null) {
    redirect(`/org/${professional.organization.slug}/professional-portal`)
  }

  // Verificar expiração
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

  // Verificar autenticação
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Só redireciona para /register se o professional tem email cadastrado
    if (professional.email) {
      const existingUser = await db.user.findUnique({
        where: { email: professional.email },
        select: { id: true },
      })

      const returnUrl = `/invite/professional/${token}`

      if (existingUser) {
        redirect(`/login?next=${encodeURIComponent(returnUrl)}`)
      }

      redirect(`/invite/professional/${token}/register`)
    }

    // Sem email cadastrado → só pode aceitar logado
    const returnUrl = `/invite/professional/${token}`
    redirect(`/login?next=${encodeURIComponent(returnUrl)}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <ProfessionalInviteHandlerClient
        token={token}
        professionalName={professional.name}
        orgName={professional.organization.name}
        orgSlug={professional.organization.slug}
        inviteEmail={professional.email}
        currentUserEmail={user.email!}
      />
    </div>
  )
}
