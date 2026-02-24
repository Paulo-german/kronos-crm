import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { InviteHandlerClient } from './_components/invite-handler-client'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params

  // 1. Validar se o token existe e é válido
  const member = await db.member.findUnique({
    where: {
      invitationToken: token,
      status: 'PENDING',
    },
    include: {
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  // Se token inválido, 404
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

  // Verificar expiração (7 dias a partir do último envio)
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

  // 2. Verificar autenticação
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Se não estiver logado, redirecionar para login com retorno para cá
  if (!user) {
    const returnUrl = `/invite/${token}`
    redirect(`/login?next=${encodeURIComponent(returnUrl)}`)
  }

  // 3. Renderizar Client Component para processar o aceite
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <InviteHandlerClient
        token={token}
        orgName={member.organization.name}
        inviteEmail={member.email}
        currentUserEmail={user.email!}
      />
    </div>
  )
}
