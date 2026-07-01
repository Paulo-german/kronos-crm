/**
 * Valida o AVANÇO do gate + o qualificationBlock end-to-end contra o banco (sem LLM):
 * simula turnos populando o ledger e roda extract(merge) → gate(decideGate) → foco →
 * persist, mostrando o currentStepId avançar e a instrução de foco de cada turno.
 * Cria e apaga uma AgentSession de teste (conversationId null).
 * Rodar: npx tsx scripts/_engine-validate-gate.ts
 */
import { PrismaClient } from '@prisma/client'
import { buildQualificationBlock } from '../trigger/engine-v1/gate/build-qualification-block'
import { decideGate } from '../trigger/engine-v1/gate/decide-gate'
import { loadStepRequirements } from '../trigger/engine-v1/gate/load-requirements'
import type { ExtractedField } from '../trigger/engine-v1/extractor/extract-attributes'
import { mergeExtractedFields } from '../trigger/engine-v1/ledger/merge-attributes'
import { parseSessionState } from '../trigger/engine-v1/ledger/schema'
import { loadAgentProfile } from '../trigger/engine-v1/prompt/build-context'

const prisma = new PrismaClient()
const ORG_ID = '963a7e02-120f-4485-a567-8b22a3af041e'

// O que o "lead" informa em cada turno (simula a saída do extrator). `nature` opcional
// (default 'provided') pra exercitar as POSTURAS da 2.a: adiar (deferred → await) e
// recusar (refused → reinforce) devem virar a linha "Atenção" no qualificationBlock.
type ScriptField = {
  key: string
  value: string
  nature?: ExtractedField['nature']
}
const SCRIPT: Array<{ msg: string; fields: ScriptField[] }> = [
  { msg: '(abertura — lead só cumprimenta)', fields: [] },
  {
    msg: 'quero um Honda Civic',
    fields: [{ key: 'vehicle', value: 'Honda Civic' }],
  },
  {
    msg: 'depois eu digo a cidade, primeiro me diz o preço',
    fields: [{ key: 'city', value: 'depois', nature: 'deferred' }],
  },
  // não fornece a cidade (só tira outra dúvida) → await VENCE (W=1), gate reconduz (probe)
  { msg: 'e cobre terceiros?', fields: [] },
  {
    msg: 'ah sim, sou de Niterói',
    fields: [{ key: 'city', value: 'Niterói' }],
  },
  {
    msg: 'prefiro não dizer pra que uso',
    fields: [{ key: 'usage', value: 'não quero dizer', nature: 'refused' }],
  },
  {
    msg: 'tá, é pra trabalhar de aplicativo',
    fields: [{ key: 'usage', value: 'aplicativo' }],
  },
]

function toExtracted(fields: ScriptField[]): ExtractedField[] {
  return fields.map((field) => ({
    key: field.key,
    value: field.value,
    nature: field.nature ?? 'provided',
    polarity: 'neutral',
  }))
}

async function main() {
  const ana = await prisma.agent.findFirst({
    where: { organizationId: ORG_ID, name: 'Ana', agentVersion: 'engine-v1' },
    select: { id: true },
  })
  if (!ana) throw new Error('Ana engine-v1 não encontrada')

  const profile = await loadAgentProfile(ana.id)
  const requirements = await loadStepRequirements(ana.id)
  const stepById = (id: string | null) =>
    id ? profile.steps.find((step) => step.id === id) : undefined

  console.log('=== Etapas da Ana (order · name · required AGENT) ===')
  for (const step of profile.steps) {
    const req =
      requirements.find((item) => item.id === step.id)?.requiredKeys ?? []
    console.log(
      `  [${step.order}] "${step.name}" · required: [${req.join(', ') || '—'}]`,
    )
  }

  let session = await prisma.agentSession.create({
    data: { organizationId: ORG_ID, agentId: ana.id },
  })

  console.log('\n=== Simulação (extract → gate → foco → persist) ===')
  for (const turn of SCRIPT) {
    const state = parseSessionState(session.state)
    mergeExtractedFields(state, toExtracted(turn.fields), session.turnCount)

    const decision = decideGate(requirements, state.attributes, {
      currentStepId: session.currentStepId,
      turnCount: session.turnCount,
      stepEnteredAtTurn: session.currentStepEnteredAtTurn,
    })
    const currentStep = stepById(decision.nextStepId)
    const block = currentStep
      ? buildQualificationBlock(currentStep, decision.pendingRequired)
      : null

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
      `\n──────── turno ${session.turnCount} · lead: "${turn.msg}"\n` +
        `etapa: ${currentStep?.name ?? decision.nextStepId} | falta: [${decision.pendingRequired.map((field) => `${field.key}:${field.posture}`).join(', ') || '—'}] | advanced: ${decision.advanced}\n` +
        `--- qualificationBlock (injetado no Call 2) ---\n${block ?? '(sem bloco)'}`,
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
