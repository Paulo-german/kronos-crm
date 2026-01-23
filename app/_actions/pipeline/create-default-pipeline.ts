import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import type { PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'

const DEFAULT_STAGES = [
  { name: 'Lead', color: '#6b7280', position: 1 },
  { name: 'Qualificação', color: '#3b82f6', position: 2 },
  { name: 'Proposta', color: '#f59e0b', position: 3 },
  { name: 'Negociação', color: '#8b5cf6', position: 4 },
  { name: 'Ganho', color: '#22c55e', position: 5 },
  { name: 'Perdido', color: '#ef4444', position: 6 },
]

interface CreateDefaultPipelineParams {
  userId: string
  pipelineName?: string
}

/**
 * Cria um pipeline padrão para o usuário.
 * Se o usuário já tiver um pipeline, retorna o existente para evitar duplicatas.
 * Usado tanto no seed quanto na inicialização da página de pipeline.
 *
 * @returns Sempre retorna um pipeline válido (nunca null)
 */
export async function createDefaultPipeline({
  userId,
  pipelineName = 'Pipeline Principal',
}: CreateDefaultPipelineParams): Promise<PipelineWithStagesDto> {
  // Verifica se já existe pipeline para este usuário
  const existingPipeline = await db.pipeline.findFirst({
    where: { createdBy: userId },
    include: {
      stages: true,
    },
  })

  if (existingPipeline) {
    // console.log(`ℹ️ Usuário ${userId} já possui pipeline.`)
    // Precisa transformar para o formato esperado com dealCount
    // Vamos buscar novamente com a contagem de deals
    const pipelineWithCounts = await db.pipeline.findFirst({
      where: { createdBy: userId },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: {
            _count: {
              select: { deals: true },
            },
          },
        },
      },
    })

    if (!pipelineWithCounts) {
      throw new Error(
        `Pipeline não encontrado para o usuário ${userId} após verificação de existência`,
      )
    }

    return {
      id: pipelineWithCounts.id,
      name: pipelineWithCounts.name,
      stages: pipelineWithCounts.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        position: stage.position,
        dealCount: stage._count.deals,
      })),
    }
  }

  // console.log(`🌱 Criando pipeline padrão para usuário ${userId}...`)

  // Cria pipeline com etapas
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

  // Invalida o cache para que o pipeline recém-criado seja buscado na próxima chamada
  revalidateTag(`pipeline:${userId}`)

  // Transforma para o formato esperado (com dealCount = 0 para novos stages)
  return {
    id: pipeline.id,
    name: pipeline.name,
    stages: pipeline.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      position: stage.position,
      dealCount: 0, // Pipeline novo não tem deals
    })),
  }
}
