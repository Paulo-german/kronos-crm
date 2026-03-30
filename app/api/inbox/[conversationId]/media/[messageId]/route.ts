import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'

interface RouteContext {
  params: Promise<{ conversationId: string; messageId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      return NextResponse.json({ error: 'No org context' }, { status: 400 })
    }

    const membership = await validateMembership(user.id, orgSlug)
    if (!membership.isValid || !membership.orgId) {
      return NextResponse.json({ error: 'No access' }, { status: 403 })
    }

    // 2. Buscar mensagem + inbox da conversa
    const { conversationId, messageId } = await context.params

    const message = await db.message.findFirst({
      where: {
        id: messageId,
        conversation: { id: conversationId, organizationId: membership.orgId },
      },
      select: {
        providerMessageId: true,
        metadata: true,
        conversation: {
          select: {
            inbox: {
              select: {
                id: true,
                evolutionInstanceName: true,
                evolutionApiUrl: true,
                evolutionApiKey: true,
              },
            },
          },
        },
      },
    })

    if (!message?.providerMessageId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { inbox } = message.conversation
    const instanceName = inbox.evolutionInstanceName
    if (!instanceName) {
      return NextResponse.json(
        { error: 'No instance configured' },
        { status: 422 },
      )
    }

    // 3. Resolver credenciais (self-hosted ou globais) e chamar Evolution API para obter mídia em base64
    const apiUrl = inbox.evolutionApiUrl || process.env.EVOLUTION_API_URL
    const apiKey = inbox.evolutionApiKey || process.env.EVOLUTION_API_KEY

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Evolution API not configured' },
        { status: 500 },
      )
    }

    const evolutionResponse = await fetch(
      `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          message: { key: { id: message.providerMessageId } },
        }),
      },
    )

    if (!evolutionResponse.ok) {
      console.error(
        '[media-proxy] Evolution API error:',
        evolutionResponse.status,
        await evolutionResponse.text(),
      )
      return NextResponse.json(
        { error: 'Failed to fetch media' },
        { status: 502 },
      )
    }

    const { base64, mimetype } = await evolutionResponse.json()

    if (!base64) {
      return NextResponse.json(
        { error: 'No media data returned' },
        { status: 404 },
      )
    }

    // 4. Converter base64 → buffer e retornar com Content-Type correto
    const buffer = Buffer.from(base64, 'base64')

    const metadata = message.metadata as Record<string, unknown> | null
    const mediaMimetype =
      mimetype ||
      (metadata?.media as Record<string, unknown> | undefined)?.mimetype ||
      'application/octet-stream'

    return new Response(buffer, {
      headers: {
        'Content-Type': String(mediaMimetype),
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('[media-proxy] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
