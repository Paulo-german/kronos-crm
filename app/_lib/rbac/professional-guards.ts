import { db } from '@/_lib/prisma'

/**
 * Verifica se o usuário autenticado é um profissional ativo da org.
 * Lança erro se não for — para proteger rotas /agenda/*.
 *
 * O guard deliberadamente não usa o RBAC de membros (roles CRM) porque
 * profissionais operam num sistema paralelo independente: podem ser
 * profissionais sem serem membros do CRM, e vice-versa.
 */
export async function requireProfessionalContext(
  userId: string,
  orgId: string,
): Promise<{ professionalId: string }> {
  const professional = await db.professional.findFirst({
    where: { userId, organizationId: orgId, isActive: true },
    select: { id: true },
  })

  if (!professional) {
    throw new Error('Acesso negado.')
  }

  return { professionalId: professional.id }
}
