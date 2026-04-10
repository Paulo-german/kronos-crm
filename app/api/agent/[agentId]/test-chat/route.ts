import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { streamText, tool, stepCountIs, convertToModelMessages, type ToolSet } from 'ai'
import { z as zod } from 'zod'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'
import { getModel } from '@/_lib/ai/provider'
import { debitCredits, refundCredits } from '@/_lib/billing/credit-utils'
import { estimateMaxCost, calculateCreditCost } from '@/_lib/ai/pricing'
import { searchKnowledge } from '@/../trigger/utils/search-knowledge'
import { buildTestSystemPrompt } from './build-test-system-prompt'
import { buildMockToolSet } from './build-mock-tool-set'
import { testChatRequestSchema, extractTextFromParts } from './schema'
import type { MemberRole, MessageRole } from '@prisma/client'
import type { UIMessage } from 'ai'

const MAX_OUTPUT_TOKENS = 2048
const LLM_TEMPERATURE = 0.4
const TEST_MESSAGE_HISTORY_LIMIT = 50

interface RouteParams {
  params: Promise<{ agentId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { agentId } = await params

  try {
    // -------------------------------------------------------------------------
    // 1. Auth: Supabase + cookie orgSlug + validateMembership
    // -------------------------------------------------------------------------
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Você precisa estar logado.' },
        { status: 401 },
      )
    }

    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      return NextResponse.json(
        { error: 'Organização não encontrada.' },
        { status: 400 },
      )
    }

    const membership = await validateMembership(user.id, orgSlug)

    if (!membership.isValid || !membership.orgId || !membership.userRole) {
      return NextResponse.json(
        { error: 'Você não tem acesso a esta organização.' },
        { status: 403 },
      )
    }

    const ctx = {
      userId: user.id,
      orgId: membership.orgId,
      userRole: membership.userRole as MemberRole,
    }

    // RBAC: qualquer role que possa VER o agente pode testar
    try {
      requirePermission(canPerformAction(ctx, 'agent', 'read'))
    } catch {
      return NextResponse.json(
        { error: 'Você não tem permissão para testar este agente.' },
        { status: 403 },
      )
    }

    // Verificar que o agentId pertence à org
    const agentExists = await db.agent.findFirst({
      where: { id: agentId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!agentExists) {
      return NextResponse.json(
        { error: 'Agente não encontrado.' },
        { status: 404 },
      )
    }

    // -------------------------------------------------------------------------
    // 2. Parsear e validar body da requisição
    // -------------------------------------------------------------------------
    const body = await request.json()
    const parsed = testChatRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido.', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { messages } = parsed.data
    const latestUserMsg = [...messages]
      .reverse()
      .find((msg) => msg.role === 'user')
    const latestUserMessage = latestUserMsg
      ? extractTextFromParts(latestUserMsg.parts)
      : undefined

    // -------------------------------------------------------------------------
    // 3. Upsert da conversa de teste (uma por agente + usuário)
    // -------------------------------------------------------------------------
    const testConversation = await db.agentTestConversation.upsert({
      where: { agentId_userId: { agentId, userId: ctx.userId } },
      create: {
        agentId,
        organizationId: ctx.orgId,
        userId: ctx.userId,
      },
      update: {},
      select: { id: true },
    })

    // -------------------------------------------------------------------------
    // 4. Build Test System Prompt
    // -------------------------------------------------------------------------
    const promptContext = await buildTestSystemPrompt(agentId)

    // -------------------------------------------------------------------------
    // 5. Débito otimista de créditos (mesma lógica de produção)
    // -------------------------------------------------------------------------
    // Montar todas as mensagens para estimativa de tokens de entrada
    const systemPromptLength = promptContext.systemPrompt.length
    const historyLength = messages
      .slice(-TEST_MESSAGE_HISTORY_LIMIT)
      .reduce((sum, msg) => sum + extractTextFromParts(msg.parts).length, 0)

    const estimatedInputTokens = Math.ceil((systemPromptLength + historyLength) / 4)
    const estimatedCost = estimateMaxCost(
      promptContext.modelId,
      estimatedInputTokens,
      MAX_OUTPUT_TOKENS,
    )

    const debited = await debitCredits(
      ctx.orgId,
      estimatedCost,
      'Teste de agente',
      {
        source: 'test_chat',
        agentId,
        modelId: promptContext.modelId,
      },
      true, // incrementMessages = true (conta como mensagem real de uso)
    )

    if (!debited) {
      return NextResponse.json(
        { error: 'NO_CREDITS' },
        { status: 402 },
      )
    }

    // -------------------------------------------------------------------------
    // 6. Montar tool set de teste (mock tools + search_knowledge real)
    // -------------------------------------------------------------------------
    const mockTools = buildMockToolSet(
      promptContext.toolsEnabled,
      promptContext.allStepActions,
    )

    const hasSearchKnowledge = promptContext.toolsEnabled.includes('search_knowledge')

    const realTools = hasSearchKnowledge
      ? {
          search_knowledge: tool({
            description:
              'Busca informações na base de conhecimento do agente. Use quando o usuário perguntar sobre algo que pode estar nos documentos enviados (ex: políticas, preços, procedimentos, informações técnicas).',
            inputSchema: zod.object({
              query: zod
                .string()
                .describe(
                  'Pergunta ou termo de busca para encontrar informações relevantes na base de conhecimento',
                ),
            }),
            execute: async ({ query }) => {
              try {
                const results = await searchKnowledge(agentId, query, 5, 0.65)

                if (results.length === 0) {
                  return {
                    success: true,
                    message: 'Nenhum resultado encontrado na base de conhecimento para esta consulta.',
                  }
                }

                return {
                  success: true,
                  message: `Encontrados ${results.length} trechos relevantes na base de conhecimento.`,
                  results: results.map((result) => ({
                    content: result.content,
                    fileName: result.fileName,
                    similarity: Number(result.similarity.toFixed(2)),
                  })),
                }
              } catch (err) {
                console.error('[test-chat] search_knowledge tool error', err)
                return {
                  success: false,
                  message: 'Erro ao buscar na base de conhecimento.',
                }
              }
            },
          }),
        }
      : {}

    // Combinar: real sobrescreve mock (search_knowledge fica real)
    const testTools: ToolSet = Object.assign({}, mockTools, realTools)
    const hasAnyTools = Object.keys(testTools).length > 0

    // -------------------------------------------------------------------------
    // 7. Montar mensagens para o LLM (preserva tool call/result history)
    // -------------------------------------------------------------------------
    // Cast necessário: testChatRequestSchema usa passthrough() (id existe em runtime)
    const recentMessages = messages.slice(-TEST_MESSAGE_HISTORY_LIMIT) as unknown as UIMessage[]
    const llmMessages = await convertToModelMessages(recentMessages, {
      tools: hasAnyTools ? testTools : undefined,
    })

    // -------------------------------------------------------------------------
    // 8. Stream LLM Response com callback de pós-processamento
    // -------------------------------------------------------------------------
    const result = streamText({
      model: getModel(promptContext.modelId),
      system: promptContext.systemPrompt,
      messages: llmMessages,
      tools: hasAnyTools ? testTools : undefined,
      temperature: LLM_TEMPERATURE,
      stopWhen: hasAnyTools ? stepCountIs(3) : stepCountIs(1),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      onFinish: async ({ steps, totalUsage }) => {
        const inputTokens = totalUsage?.inputTokens ?? 0
        const outputTokens = totalUsage?.outputTokens ?? 0
        const realCost = calculateCreditCost(
          promptContext.modelId,
          inputTokens + outputTokens,
        )

        // Agregar texto de todos os steps (multi-step pode ter texto em vários)
        const fullText = steps
          .map((step) => step.text)
          .filter(Boolean)
          .join('\n')

        // Salvar mensagem do usuário e resposta do assistente
        const userMessageContent = latestUserMessage || ''

        await db.agentTestMessage.createMany({
          data: [
            {
              testConversationId: testConversation.id,
              role: 'user' as MessageRole,
              content: userMessageContent,
            },
            {
              testConversationId: testConversation.id,
              role: 'assistant' as MessageRole,
              content: fullText,
              inputTokens: totalUsage?.inputTokens ?? null,
              outputTokens: totalUsage?.outputTokens ?? null,
            },
          ],
        })

        // Ajuste de créditos: refund se custo real < estimado, débito extra se maior
        if (realCost < estimatedCost) {
          const refundAmount = estimatedCost - realCost
          await refundCredits(
            ctx.orgId,
            refundAmount,
            'Ajuste pós-stream teste de agente',
            {
              source: 'test_chat',
              agentId,
              modelId: promptContext.modelId,
            },
          )
        } else if (realCost > estimatedCost) {
          const extraAmount = realCost - estimatedCost
          await debitCredits(
            ctx.orgId,
            extraAmount,
            'Ajuste extra pós-stream teste de agente',
            {
              source: 'test_chat',
              agentId,
              modelId: promptContext.modelId,
            },
            false, // não incrementa mensagens — já foi incrementado no débito otimista
          )
        }

        // Invalida cache da conversa de teste para forçar releitura
        revalidateTag(`agent-test-chat:${agentId}:${ctx.userId}`)
      },
    })

    // Retorna stream compatível com useChat do Vercel AI SDK v6
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[test-chat] Unexpected error', error)

    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
