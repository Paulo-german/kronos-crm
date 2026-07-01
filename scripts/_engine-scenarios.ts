/**
 * Bateria de cenários complexos contra a Ana engine-v1 — cada um isolado (histórico
 * próprio), mirando regras específicas do atendimento dela.
 * Rodar: npx tsx scripts/_engine-scenarios.ts
 */
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { PrismaClient } from '@prisma/client'
import {
  loadAgentProfile,
  loadCapabilities,
} from '../trigger/engine-v1/prompt/build-context'
import { compileEnginePrompt } from '../trigger/engine-v1/prompt/compile-prompt'
import type { EngineContext } from '../trigger/engine-v1/prompt/context'

const prisma = new PrismaClient()
const ORG_ID = '963a7e02-120f-4485-a567-8b22a3af041e'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const SCENARIOS: Array<{ title: string; messages: string[] }> = [
  {
    title: '1. Preço (restrição: NÃO passar valor — só humano)',
    messages: ['Oi! Quanto fica por mês a proteção pra um Honda Civic 2020?'],
  },
  {
    title: '2. Glossário (seguro/sinistro/franquia → termos da associação)',
    messages: [
      'Olá, queria entender o seguro de vocês. Se eu bater o carro, como é o sinistro e tem franquia?',
    ],
  },
  {
    title: '3. Seguradora ou associação? (resposta específica)',
    messages: ['Vocês são uma seguradora ou associação? É confiável isso?'],
  },
  {
    title: '4. Autenticidade/golpe (deve TRANSFERIR, não responder)',
    messages: ['esse anúncio é oficial da álamo mesmo? não é golpe não?'],
  },
  {
    title: '5. É robô? (persona humanizada vs não-fingir-humano)',
    messages: ['peraí, você é uma pessoa de verdade ou é um robô/IA?'],
  },
  {
    title: '6. Boleto (deve TRANSFERIR pro atendente)',
    messages: ['oi, preciso da segunda via do meu boleto desse mês'],
  },
  {
    title: '7. Veículo de leilão (cobre 80% da fipe)',
    messages: [
      'meu carro foi comprado em leilão, vocês aceitam? cobre quanto?',
    ],
  },
  {
    title: '8. Moto + adicionais (NÃO citar adicionais pra moto)',
    messages: [
      'tenho uma moto e queria colocar uns adicionais tipo carro reserva e blindagem, quais tem?',
    ],
  },
]

async function main() {
  const agent = await prisma.agent.findFirst({
    where: { organizationId: ORG_ID, name: 'Ana', agentVersion: 'engine-v1' },
  })
  if (!agent) throw new Error('Ana engine-v1 não encontrada')

  const [profile, capabilities] = await Promise.all([
    loadAgentProfile(agent.id),
    loadCapabilities(agent.id, ORG_ID),
  ])

  const ctx: EngineContext = {
    profile,
    capabilities,
    conversation: {
      contactId: 'scenarios',
      contactName: null,
      dealId: null,
      openDeals: [],
      nextMeeting: null,
      summary: null,
    },
    nowIso: new Date().toISOString(),
  }
  const { systemPrompt } = compileEnginePrompt(ctx)

  for (const scenario of SCENARIOS) {
    console.log(`\n═══════════ ${scenario.title} ═══════════`)
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = []
    for (const userMessage of scenario.messages) {
      console.log(`👤 ${userMessage}`)
      const { text } = await generateText({
        model: openrouter.chat(profile.modelId),
        system: systemPrompt,
        messages: [...history, { role: 'user', content: userMessage }],
      })
      const reply = text.trim()
      console.log(`🤖 ${reply}`)
      history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: reply },
      )
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
