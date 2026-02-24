import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { InviteRegisterForm } from './_components/invite-register-form'

interface InviteRegisterPageProps {
  params: Promise<{ token: string }>
}

export default async function InviteRegisterPage({
  params,
}: InviteRegisterPageProps) {
  const { token } = await params

  // 1. Validar token
  const member = await db.member.findUnique({
    where: {
      invitationToken: token,
      status: 'PENDING',
    },
    include: {
      organization: {
        select: { name: true },
      },
    },
  })

  if (!member) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500">
          Convite Inválido ou Expirado
        </h1>
        <p className="mt-2 text-muted-foreground">
          Este link de convite não existe ou já foi utilizado.
        </p>
      </div>
    )
  }

  // 2. Verificar expiração (7 dias)
  const INVITE_EXPIRATION_DAYS = 7
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() - INVITE_EXPIRATION_DAYS)

  if (member.updatedAt < expirationDate) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500">Convite Expirado</h1>
        <p className="mt-2 text-muted-foreground">
          Este convite expirou. Peça um novo convite ao administrador da
          organização.
        </p>
      </div>
    )
  }

  // 3. Se já está logado, redirecionar para a página do invite (aceite direto)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(`/invite/${token}`)
  }

  // 4. Se email já tem conta, redirecionar para login
  const existingUser = await db.user.findUnique({
    where: { email: member.email },
    select: { id: true },
  })

  if (existingUser) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)
  }

  // 5. Renderizar formulário de registro (mesmo layout da tela de auth)
  return (
    <div className="flex h-screen w-screen">
      {/* Painel esquerdo: gradiente premium (hidden no mobile) */}
      <div className="bg-banner-premium hidden w-[60%] flex-col items-center justify-center lg:flex">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <KronosLogo className="h-12 w-12 text-white" />
        </div>
      </div>

      {/* Painel direito: conteúdo */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-background px-8 lg:px-16">
        <div className="w-full max-w-md">
          <InviteRegisterForm
            token={token}
            email={member.email}
            orgName={member.organization.name}
          />
        </div>
      </div>
    </div>
  )
}
