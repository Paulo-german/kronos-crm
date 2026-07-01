/**
 * Valida o AVANÇO do gate end-to-end contra o banco (sem LLM): simula turnos populando
 * o ledger e roda extract(merge) → gate(decideGate) → persist, mostrando o currentStepId
 * avançar. Cria e apaga uma AgentSession de teste (conversationId null).
 * Rodar: npx tsx scripts/_engine-validate-gate.ts
 */
import { PrismaClient } from '@prisma/client'
import type { ExtractedField } from '../trigger/engine-v1/extractor/extract-attributes'
import { decideGate } from '../trigger/engine-v1/gate/decide-gate'
import { loadStepRequirements } from '../trigger/engine-v1/gate/load-requirements'
import { mergeExtractedFields } from '../trigger/engine-v1/ledger/merge-attributes'
import { parseSessionState } from '../trigger/engine-v1/ledger/schema'

const prisma = new PrismaClient()
const ORG_ID = '963a7e02-120f-4485-a567-8b22a3af041e'

// O que o "lead" informa em cada turno (simula a saída do extrator).
const SCRIPT: Array<{
  msg: string
  fields: Array<{ key: string; value: string }>
}> = [
  { msg: '(abertura — lead só cumprimenta)', fields: [] },
  {
    msg: 'quero um Honda Civic',
    fields: [{ key: 'vehicle', value: 'Honda Civic' }],
  },
  { msg: 'sou de Niterói', fields: [{ key: 'city', value: 'Niterói' }] },
  {
    msg: 'é pra trabalhar de aplicativo',
    fields: [{ key: 'usage', value: 'aplicativo' }],
  },
]

function toExtracted(
  fields: Array<{ key: string; value: string }>,
): ExtractedField[] {
  return fields.map((field) => ({
    key: field.key,
    value: field.value,
    nature: 'provided',
    polarity: 'neutral',
  }))
}

async function main() {
  const ana = await prisma.agent.findFirst({
    where: { organizationId: ORG_ID, name: 'Ana', agentVersion: 'engine-v1' },
    select: { id: true },
  })
  if (!ana) throw new Error('Ana engine-v1 não encontrada')

  const steps = await prisma.agentEngineStep.findMany({
    where: { agentId: ana.id },
    orderBy: { order: 'asc' },
    select: { id: true, kind: true, order: true, name: true },
  })
  const requirements = await loadStepRequirements(ana.id)
  const label = (id: string | null) =>
    id ? (steps.find((step) => step.id === id)?.kind ?? id) : 'null'

  console.log('=== Etapas da Ana (order · kind · required AGENT) ===')
  for (const step of steps) {
    const req =
      requirements.find((item) => item.id === step.id)?.requiredKeys ?? []
    console.log(
      `  [${step.order}] ${step.kind} "${step.name}" · required: [${req.join(', ') || '—'}]`,
    )
  }

  let session = await prisma.agentSession.create({
    data: { organizationId: ORG_ID, agentId: ana.id },
  })

  console.log('\n=== Simulação (extract → gate → persist) ===')
  for (const turn of SCRIPT) {
    const state = parseSessionState(session.state)
    mergeExtractedFields(state, toExtracted(turn.fields), session.turnCount)

    const decision = decideGate(requirements, state.attributes, {
      currentStepId: session.currentStepId,
      turnCount: session.turnCount,
      stepEnteredAtTurn: session.currentStepEnteredAtTurn,
    })

    const enteredBefore = session.turnCount
    session = await prisma.agentSession.update({
      where: { id: session.id },
      data: {
        turnCount: { increment: 1 },
        state,
        currentStepId: decision.nextStepId,
        ...(decision.advanced
          ? { currentStepEnteredAtTurn: enteredBefore }
          : {}),
      },
    })

    console.log(
      `turno ${session.turnCount} · "${turn.msg}"\n` +
        `   → etapa: ${label(decision.nextStepId)} | falta: [${decision.pendingRequired.join(', ') || '—'}] | advanced: ${decision.advanced}`,
    )
  }

  await prisma.agentSession.delete({ where: { id: session.id } })
  console.log('\n(sessão de teste removida)')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
