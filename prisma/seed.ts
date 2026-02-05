import { db } from '@/_lib/prisma'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'

// Execução direta via CLI: pnpm prisma db seed
async function main() {
  console.log('🌱 Iniciando seed...')

  // Busca todas as organizações que não têm pipeline
  const orgsWithoutPipeline = await db.organization.findMany({
    where: {
      pipelines: {
        none: {},
      },
    },
    include: {
      members: {
        where: { role: 'OWNER' },
        take: 1,
      },
    },
  })

  if (orgsWithoutPipeline.length === 0) {
    console.log('ℹ️ Todas as organizações já possuem pipeline.')
    return
  }

  for (const org of orgsWithoutPipeline) {
    await createDefaultPipeline({
      orgId: org.id,
    })
    console.log(`✅ Pipeline criado para organização: ${org.name}`)
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
