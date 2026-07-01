/**
 * Semeia o contrato de campos (AgentEngineStepField, source=AGENT) da Ana engine-v1 —
 * o que cada etapa coleta. A UI dos 2 eixos é a Fase 1c; aqui semeia direto pra testar
 * o extrator (1a) e depois o gate (1b). Idempotente.
 * Rodar: npx tsx scripts/_engine-seed-ana-fields.ts
 */
import { PrismaClient, type EngineStepKind } from '@prisma/client'

const prisma = new PrismaClient()
const ORG_ID = '963a7e02-120f-4485-a567-8b22a3af041e'

// agentFieldKey (do catálogo) + os 2 eixos (required por ora só prepara o gate/1b).
const FIELDS_BY_KIND: Partial<
  Record<EngineStepKind, Array<{ key: string; required: boolean }>>
> = {
  GREETING: [{ key: 'name', required: false }],
  QUALIFICATION: [
    { key: 'vehicle', required: true },
    { key: 'version', required: false },
    { key: 'city', required: true },
    { key: 'usage', required: true },
  ],
}

async function main() {
  const ana = await prisma.agent.findFirst({
    where: { organizationId: ORG_ID, name: 'Ana', agentVersion: 'engine-v1' },
    select: { id: true },
  })
  if (!ana) throw new Error('Ana engine-v1 não encontrada')

  const steps = await prisma.agentEngineStep.findMany({
    where: { agentId: ana.id },
    select: { id: true, kind: true },
  })

  // Idempotente: limpa e recria.
  await prisma.agentEngineStepField.deleteMany({
    where: { agentEngineStep: { agentId: ana.id } },
  })

  for (const step of steps) {
    const fields = FIELDS_BY_KIND[step.kind] ?? []
    let position = 0
    for (const field of fields) {
      await prisma.agentEngineStepField.create({
        data: {
          agentEngineStepId: step.id,
          source: 'AGENT',
          agentFieldKey: field.key,
          required: field.required,
          resultPolarity: 'ANY',
          position: position++,
        },
      })
    }
  }

  const created = await prisma.agentEngineStepField.findMany({
    where: { agentEngineStep: { agentId: ana.id } },
    select: {
      agentFieldKey: true,
      required: true,
      agentEngineStep: { select: { kind: true } },
    },
  })
  console.log(`Semeados ${created.length} campos:`)
  for (const field of created) {
    console.log(
      `  [${field.agentEngineStep.kind}] ${field.agentFieldKey} (${field.required ? 'obrigatório' : 'opcional'})`,
    )
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
