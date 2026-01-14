import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Configuração do Pipeline Padrão
const DEFAULT_STAGES = [
  { name: 'Lead', color: '#6b7280', position: 1 },
  { name: 'Qualificação', color: '#3b82f6', position: 2 },
  { name: 'Proposta', color: '#f59e0b', position: 3 },
  { name: 'Negociação', color: '#8b5cf6', position: 4 },
  { name: 'Ganho', color: '#22c55e', position: 5 },
  { name: 'Perdido', color: '#ef4444', position: 6 },
]

interface SeedPipelineParams {
  userId: string
  pipelineName?: string
}

/**
 * Cria um pipeline padrão para o usuário
 * Se o usuário já tiver um pipeline, não cria outro
 */
export async function seedPipelineForUser({
  userId,
  pipelineName = 'Pipeline Principal',
}: SeedPipelineParams) {
  // Verifica se já existe pipeline para este usuário
  const existingPipeline = await prisma.pipeline.findFirst({
    where: { createdBy: userId },
  })

  if (existingPipeline) {
    console.log(`ℹ️ Usuário ${userId} já possui pipeline. Pulando seed.`)
    return existingPipeline
  }

  console.log(`🌱 Criando pipeline padrão para usuário ${userId}...`)

  // Cria pipeline com etapas
  const pipeline = await prisma.pipeline.create({
    data: {
      name: pipelineName,
      createdBy: userId,
      stages: {
        create: DEFAULT_STAGES,
      },
    },
    include: {
      stages: true,
    },
  })

  // Define etapas de ganho e perda
  const wonStage = pipeline.stages.find((s) => s.name === 'Ganho')
  const lostStage = pipeline.stages.find((s) => s.name === 'Perdido')

  if (wonStage && lostStage) {
    await prisma.pipeline.update({
      where: { id: pipeline.id },
      data: {
        wonStageId: wonStage.id,
        lostStageId: lostStage.id,
      },
    })
  }

  console.log(
    `✅ Pipeline "${pipelineName}" criado com ${pipeline.stages.length} etapas.`,
  )
  return pipeline
}

// Execução direta via CLI: pnpm prisma db seed
async function main() {
  console.log('🌱 Iniciando seed...')

  // Busca todos os usuários que não têm pipeline
  const usersWithoutPipeline = await prisma.user.findMany({
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
    await seedPipelineForUser({ userId: user.id })
  }

  console.log('✅ Seed concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
