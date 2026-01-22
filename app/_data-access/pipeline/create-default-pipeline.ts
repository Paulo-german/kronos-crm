import { db } from '@/_lib/prisma'

const DEFAULT_STAGES = [
  { name: 'Lead', position: 1 },
  { name: 'Qualificação', position: 2 },
  { name: 'Proposta', position: 3 },
  { name: 'Negociação', position: 4 },
  { name: 'Ganho', position: 5 },
  { name: 'Perdido', position: 6 },
]

interface SeedPipelineParams {
  userId: string
  pipelineName?: string
}

/**
 * Cria um pipeline padrão para o usuário
 * Se o usuário já tiver um pipeline, não cria outro
 */
export async function createDefaultPipeline({
  userId,
  pipelineName = 'Pipeline Principal',
}: SeedPipelineParams) {
  // Verifica se já existe pipeline para este usuário
  const existingPipeline = await db.pipeline.findFirst({
    where: { createdBy: userId },
  })

  if (existingPipeline) {
    return existingPipeline
  }

  // Cria pipeline com etapas (sem cores)
  const pipeline = await db.pipeline.create({
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

  return pipeline
}
