'use server'

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
  orgId: string
  pipelineName?: string
}

/**
 * Cria um pipeline padrão para a organização.
 * Se a organização já tiver um pipeline, retorna o existente para evitar duplicatas.
 * Usado tanto no seed quanto na inicialização da página de pipeline.
 *
 * @returns Sempre retorna um pipeline válido (nunca null)
 */
export async function createDefaultPipeline({
  orgId,
  pipelineName = 'Pipeline Principal',
}: CreateDefaultPipelineParams): Promise<PipelineWithStagesDto> {
  // Verifica se já existe pipeline para esta organização
  const existingPipeline = await db.pipeline.findFirst({
    where: { organizationId: orgId },
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

  if (existingPipeline) {
    return {
      id: existingPipeline.id,
      name: existingPipeline.name,
      stages: existingPipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        position: stage.position,
        dealCount: stage._count.deals,
      })),
    }
  }

  // Cria pipeline com etapas
  const pipeline = await db.pipeline.create({
    data: {
      name: pipelineName,
      organizationId: orgId,
      stages: {
        create: DEFAULT_STAGES,
      },
    },
    include: {
      stages: {
        orderBy: { position: 'asc' },
      },
    },
  })

  // Invalida o cache para que o pipeline recém-criado seja buscado na próxima chamada
  revalidateTag(`pipeline:${orgId}`)

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
