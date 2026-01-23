import { db } from '@/_lib/prisma'
import { PrismaClient } from '@prisma/client'

// const prisma = new PrismaClient() // Removed unused instantiation

import { createDefaultPipeline } from '@/_actions/pipeline/create-default-pipeline'

// Execução direta via CLI: pnpm prisma db seed
async function main() {
  console.log('🌱 Iniciando seed...')

  // Busca todos os usuários que não têm pipeline
  const usersWithoutPipeline = await db.user.findMany({
    where: {
      pipelinesCreated: {
        none: {},
      },
    },
  })

  if (usersWithoutPipeline.length === 0) {
    console.log('ℹ️ Todos os usuários já possuem pipeline.')
    return
  }

  for (const user of usersWithoutPipeline) {
    await createDefaultPipeline({ userId: user.id })
  }

  console.log('✅ Seed concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
