/**
 * Validação: compila o system prompt da Ana engine-v1 (perfil real do banco) com um
 * lead fictício na etapa de abertura. Só pra ver a string que o motor vai usar.
 * Rodar: npx tsx scripts/_engine-validate-ana.ts
 */
import { PrismaClient } from '@prisma/client'
import {
  loadAgentProfile,
  loadCapabilities,
} from '../trigger/engine-v1/prompt/build-context'
import { compileEnginePrompt } from '../trigger/engine-v1/prompt/compile-prompt'
import type { EngineContext } from '../trigger/engine-v1/prompt/context'

const prisma = new PrismaClient()
const ORG_ID = '963a7e02-120f-4485-a567-8b22a3af041e'

async function main() {
  const ana = await prisma.agent.findFirst({
    where: { organizationId: ORG_ID, name: 'Ana', agentVersion: 'engine-v1' },
  })
  if (!ana) throw new Error('Ana engine-v1 não encontrada na Kury')

  const [profile, capabilities] = await Promise.all([
    loadAgentProfile(ana.id),
    loadCapabilities(ana.id, ORG_ID),
  ])

  const ctx: EngineContext = {
    profile,
    capabilities,
    conversation: {
      contactId: 'test',
      contactName: 'João',
      dealId: null,
      openDeals: [],
      nextMeeting: null,
      summary: null,
    },
    nowIso: new Date().toISOString(),
  }

  const result = compileEnginePrompt(ctx)
  console.log(result.systemPrompt)
  console.log(
    '\n========== tokens estimados:',
    result.estimatedTokens,
    '==========',
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
