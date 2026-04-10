import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import { z } from 'zod'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'
import { getModel } from '@/_lib/ai/provider'
import { buildConversationPrompt } from '@/_lib/onboarding/prompts/conversation-agent'
import { businessProfileSchema } from '@/_lib/onboarding/schemas/business-profile'
import { fetchWebsiteText } from '@/_lib/onboarding/fetch-website-text'
import type { UIMessage } from 'ai'

// Schema minimo de validacao do body da requisicao
const chatRequestSchema = z.object({
  messages: z.array(z.unknown()),
})

export async function POST(request: NextRequest) {
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
        { error: 'Voce precisa estar logado.' },
        { status: 401 },
      )
    }

    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      return NextResponse.json(
        { error: 'Organizacao nao encontrada.' },
        { status: 400 },
      )
    }

    const membership = await validateMembership(user.id, orgSlug)

    if (!membership.isValid || !membership.orgId || !membership.userRole) {
      return NextResponse.json(
        { error: 'Voce nao tem acesso a esta organizacao.' },
        { status: 403 },
      )
    }

    // -------------------------------------------------------------------------
    // 2. Verificar que onboardingCompleted === false e buscar org.name
    // -------------------------------------------------------------------------
    const org = await db.organization.findFirst({
      where: { id: membership.orgId },
      select: { onboardingCompleted: true, name: true },
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organizacao nao encontrada.' },
        { status: 404 },
      )
    }

    if (org.onboardingCompleted) {
      return NextResponse.json(
        { error: 'O onboarding desta organizacao ja foi concluido.' },
        { status: 403 },
      )
    }

    // -------------------------------------------------------------------------
    // 3. Parsear e validar body da requisicao
    // -------------------------------------------------------------------------
    const body = await request.json()
    const parsed = chatRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload invalido.', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Cast seguro: messages vem do useChat do Vercel AI SDK
    const messages = parsed.data.messages as UIMessage[]

    // Limitar historico para evitar context window excessivo
    const recentMessages = messages.slice(-30)
    const llmMessages = await convertToModelMessages(recentMessages)

    // -------------------------------------------------------------------------
    // 4. Streaming com tools
    //    - extract_business_profile: chamada apos confirmacao final
    //    - fetch_website_info: chamada quando o usuario envia um link
    // -------------------------------------------------------------------------
    const systemPrompt = buildConversationPrompt(org.name)

    const result = streamText({
      model: getModel('google/gemini-2.5-pro'),
      system: systemPrompt,
      messages: llmMessages,
      tools: {
        extract_business_profile: tool({
          description:
            'Extrai o perfil estruturado do negocio apos confirmacao do usuario. Chamar APENAS quando o usuario confirmar o resumo final.',
          inputSchema: businessProfileSchema,
          execute: async (profile) => profile,
        }),
        fetch_website_info: tool({
          description:
            'Busca e extrai o conteudo textual de um site ou pagina web. Use quando o usuario enviar um link de site ou Instagram para coletar informacoes sobre a empresa.',
          inputSchema: z.object({
            url: z.string().url().describe('URL do site ou pagina a ser analisada'),
          }),
          execute: async ({ url }) => {
            try {
              const text = await fetchWebsiteText(url)
              return { success: true, content: text }
            } catch {
              return {
                success: false,
                content: 'Nao consegui acessar o site. Pergunte as informacoes diretamente ao usuario.',
              }
            }
          },
        }),
      },
      stopWhen: stepCountIs(2),
      maxOutputTokens: 3072,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[onboarding/chat] Unexpected error', error)

    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
