/**
 * Harness de chat do engine-v1 — conversa com um agente direto no terminal,
 * sem app, sem Trigger.dev, sem WhatsApp. Loop de desenvolvimento rápido.
 *
 * Uso:
 *   npx tsx scripts/engine-chat.ts                          # modo interativo (digite e converse)
 *   npx tsx scripts/engine-chat.ts "Oi" "quero uma cotação" # modo roteiro (roda os turnos e sai)
 *   npx tsx scripts/engine-chat.ts --reset                  # zera o histórico
 *   npx tsx scripts/engine-chat.ts --step=1 "..."           # força a etapa atual (0-based)
 *   npx tsx scripts/engine-chat.ts --prompt                 # imprime o system prompt e sai
 *
 * O histórico persiste em scripts/.engine-chat-history.json (sobrevive entre execuções).
 *
 * NOTA v1: só conversa (1 chamada, texto puro). As ações (mover deal, handoff) entram
 * quando o estágio `generate` completo (Call 1 tools) for construído.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import * as readline from 'node:readline/promises'
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
const AGENT_NAME = 'Ana'
const HISTORY_PATH = 'scripts/.engine-chat-history.json'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function loadHistory(): ChatMessage[] {
  if (!existsSync(HISTORY_PATH)) return []
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf8')) as ChatMessage[]
  } catch {
    return []
  }
}

function saveHistory(history: ChatMessage[]): void {
  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2))
}

async function generateReply(
  modelId: string,
  system: string,
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  const { text } = await generateText({
    model: openrouter.chat(modelId),
    system,
    messages: [...history, { role: 'user', content: userMessage }],
  })
  return text.trim()
}

async function main() {
  const args = process.argv.slice(2)
  const reset = args.includes('--reset')
  const showPrompt = args.includes('--prompt')
  const stepArg = args.find((arg) => arg.startsWith('--step='))
  const stepOrder = stepArg ? Number(stepArg.split('=')[1]) : null
  const messages = args.filter((arg) => !arg.startsWith('--'))

  const agent = await prisma.agent.findFirst({
    where: {
      organizationId: ORG_ID,
      name: AGENT_NAME,
      agentVersion: 'engine-v1',
    },
  })
  if (!agent)
    throw new Error(`Agente "${AGENT_NAME}" engine-v1 não encontrado na Kury`)

  const [profile, capabilities] = await Promise.all([
    loadAgentProfile(agent.id),
    loadCapabilities(agent.id, ORG_ID),
  ])

  // --step=N (order) → resolve o id da etapa; sem arg → null (compilador usa a primeira).
  const currentStepId =
    stepOrder === null
      ? null
      : (profile.steps.find((step) => step.order === stepOrder)?.id ?? null)
  const stepLabel = currentStepId ?? 'início'

  const ctx: EngineContext = {
    profile,
    capabilities,
    conversation: {
      contactId: 'harness',
      contactName: null,
      dealId: null,
      openDeals: [],
      nextMeeting: null,
      summary: null,
      currentStepId,
    },
    nowIso: new Date().toISOString(),
  }

  const { systemPrompt, estimatedTokens } = compileEnginePrompt(ctx)

  if (showPrompt) {
    console.log(systemPrompt)
    console.log(`\n[~${estimatedTokens} tokens · etapa ${stepLabel}]`)
    return
  }

  const history = reset ? [] : loadHistory()
  if (reset) saveHistory(history)

  console.log(
    `\n💬 ${profile.agentName} (${profile.modelId}) · etapa ${stepLabel} · ${history.length / 2} turno(s) no histórico\n`,
  )

  // Modo roteiro: roda as mensagens passadas por argumento e sai.
  if (messages.length > 0) {
    for (const userMessage of messages) {
      console.log(`Você: ${userMessage}`)
      const reply = await generateReply(
        profile.modelId,
        systemPrompt,
        history,
        userMessage,
      )
      console.log(`${profile.agentName}: ${reply}\n`)
      history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: reply },
      )
    }
    saveHistory(history)
    return
  }

  // Modo interativo: lê do teclado até Ctrl+C.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  console.log('(digite suas mensagens · Ctrl+C pra sair)\n')
  try {
    for (;;) {
      const userMessage = (await rl.question('Você: ')).trim()
      if (!userMessage) continue
      const reply = await generateReply(
        profile.modelId,
        systemPrompt,
        history,
        userMessage,
      )
      console.log(`\n${profile.agentName}: ${reply}\n`)
      history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: reply },
      )
      saveHistory(history)
    }
  } finally {
    rl.close()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
