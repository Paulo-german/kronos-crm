import { db } from '@/_lib/prisma'

// Sem cache — isActive e token devem ter efeito imediato após regeneração/desativação
export async function getWebhookSourceByToken(token: string) {
  return db.webhookSource.findUnique({
    where: { token },
    select: {
      id: true,
      organizationId: true,
      eventType: true,
      fieldMapping: true,
      isActive: true,
      platform: true,
      secretKey: true,
    },
  })
}
