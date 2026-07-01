/**
 * Adapta a Ana (export single-v1) pro engine-v1 na org Kury.
 * Lê o JSON exportado e mapeia: persona/promptConfig/messageTemplate/actions vêm do arquivo;
 * goal/guidanceNote/kind são a "tradução" semântica do objective-balde; o move_deal é
 * remapeado pro pipeline da Kury. Idempotente (recria a Ana engine-v1 a cada run).
 *
 * Rodar: npx tsx scripts/_engine-seed-ana.ts
 */
import { readFileSync } from 'node:fs'
import { PrismaClient, Prisma, EngineStepKind } from '@prisma/client'

const prisma = new PrismaClient()

const ORG_ID = '963a7e02-120f-4485-a567-8b22a3af041e' // Kury
const PIPELINE_ID = 'e00a89e3-6e6b-4551-8ef6-a7d91f50f4e2' // Pipeline Principal
const STAGE_DIAGNOSTICO = '6e698e30-af67-498c-b6ed-b8d7331a8f5b' // destino do move_deal
const JSON_PATH = '/Users/paulororiz/Downloads/agent-ana-20260630.json'

interface ExportedStep {
  name: string
  order: number
  actions: unknown[] | null
  keyQuestion: string | null
  messageTemplate: string | null
}
interface ExportedFile {
  agent: {
    systemPrompt: string
    promptConfig: unknown
    modelId: string
    steps: ExportedStep[]
  }
}

// Tradução semântica do "balde" objective → goal (1 frase) + guidanceNote (resto), por índice.
const STEP_MAP: Array<{
  kind: EngineStepKind
  goal: string
  guidanceNote: string | null
}> = [
  {
    kind: EngineStepKind.GREETING,
    goal: 'Dar as boas-vindas, descobrir o nome do cliente e o que ele precisa (cotação ou dúvidas).',
    guidanceNote:
      'Se a pessoa responder apenas o nome, pergunte novamente em que pode ajudar — se gostaria de uma cotação ou de tirar dúvidas.',
  },
  {
    kind: EngineStepKind.QUALIFICATION,
    goal: 'Coletar as informações para a cotação: placa (ou modelo, se zero), cidade de circulação e finalidade de uso.',
    guidanceNote:
      'Informações necessárias: placa do veículo (ou apenas o modelo, caso seja zero), cidade de circulação e finalidade de uso (Uber/99, entregas ou passeio). Se a pessoa não tiver a placa, entenda se é porque o veículo é zero: se for, pergunte modelo e versão; se não, pergunte modelo, versão e ano-modelo.',
  },
  {
    kind: EngineStepKind.CLOSING,
    goal: 'Agradecer, informar que a proposta personalizada está sendo preparada e transferir para um atendente.',
    guidanceNote: null,
  },
]

// Remapeia o targetStage do move_deal (vinha do banco de origem) pro stage da Kury.
function remapActions(actions: unknown[] | null): unknown[] {
  if (!actions) return []
  return actions.map((action) => {
    const entry = action as Record<string, unknown>
    if (entry.type === 'move_deal') {
      return { ...entry, targetStage: STAGE_DIAGNOSTICO }
    }
    return entry
  })
}

async function main() {
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf8')) as ExportedFile
  const src = data.agent

  if (src.steps.length !== STEP_MAP.length) {
    throw new Error(
      `Esperava ${STEP_MAP.length} etapas, JSON tem ${src.steps.length}. Ajuste o STEP_MAP.`,
    )
  }

  const existing = await prisma.agent.findFirst({
    where: { organizationId: ORG_ID, name: 'Ana', agentVersion: 'engine-v1' },
  })
  if (existing) {
    await prisma.agent.delete({ where: { id: existing.id } })
    console.log('Removida Ana engine-v1 anterior:', existing.id)
  }

  const agent = await prisma.agent.create({
    data: {
      organizationId: ORG_ID,
      name: 'Ana',
      agentVersion: 'engine-v1',
      agentMode: 'PRODUCT',
      modelId: src.modelId,
      systemPrompt: src.systemPrompt,
      promptConfig: src.promptConfig as Prisma.InputJsonValue,
      businessHoursTimezone: 'America/Sao_Paulo',
      isActive: false,
      pipelineIds: [PIPELINE_ID],
      globalTools: [],
      agentEngineSteps: {
        create: src.steps.map((step, index) => {
          const mapped = STEP_MAP[index]
          return {
            kind: mapped.kind,
            name: step.name,
            goal: mapped.goal,
            guidanceNote: mapped.guidanceNote,
            keyQuestion: step.keyQuestion,
            messageExamples: step.messageTemplate ? [step.messageTemplate] : [],
            actions: remapActions(step.actions) as Prisma.InputJsonValue,
            order: step.order,
          }
        }),
      },
    },
    include: { agentEngineSteps: { orderBy: { order: 'asc' } } },
  })

  console.log(`\n✓ Ana engine-v1 criada: ${agent.id}`)
  for (const step of agent.agentEngineSteps) {
    const actionCount = Array.isArray(step.actions) ? step.actions.length : 0
    console.log(
      `  [${step.order}] ${step.kind} · "${step.name}" · ${step.messageExamples.length} exemplo(s) · ${actionCount} ação(ões)`,
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
