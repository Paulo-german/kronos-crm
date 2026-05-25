import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'
import { downloadMetaMedia } from '@/_lib/meta/download-meta-media'
import { ConnectionType } from '@prisma/client'

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
                connectionType: true,
                evolutionInstanceName: true,
                evolutionApiUrl: true,
                evolutionApiKey: true,
                metaAccessToken: true,
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
    const metadata = message.metadata as Record<string, unknown> | null
    const mediaInfo = metadata?.media as Record<string, unknown> | undefined
    const mediaMimetype = String(mediaInfo?.mimetype ?? 'application/octet-stream')

    // 3a. Meta (API Oficial) — o mediaId fica em metadata.media.url
    if (inbox.metaAccessToken) {
      const mediaId = String(mediaInfo?.url ?? '')

      if (!mediaId) {
        return NextResponse.json({ error: 'No media ID in metadata' }, { status: 422 })
      }

      try {
        const metaBuffer = await downloadMetaMedia(mediaId, inbox.metaAccessToken)

        return new Response(new Uint8Array(metaBuffer), {
          headers: {
            'Content-Type': mediaMimetype,
            'Cache-Control': 'private, max-age=3600',
            'Content-Length': String(metaBuffer.length),
            'Accept-Ranges': 'bytes',
          },
        })
      } catch (metaError) {
        console.error('[media-proxy] Meta API error:', mediaId, metaError)
        return NextResponse.json({ error: 'Failed to fetch media from Meta' }, { status: 502 })
      }
    }

    // 3b. Evolution Go — POST /message/downloadmedia com o objeto Message raw do webhook
    if (inbox.connectionType === ConnectionType.EVOLUTION_GO) {
      const apiUrl = inbox.evolutionApiUrl
      const apiKey = inbox.evolutionApiKey

      if (!apiUrl || !apiKey) {
        return NextResponse.json({ error: 'Evolution Go not configured' }, { status: 500 })
      }

      const goRawMessage = (mediaInfo as Record<string, unknown> | undefined)?.goRawMessage

      if (!goRawMessage) {
        console.error('[media-proxy] Evolution Go: goRawMessage ausente no metadata', { messageId })
        return NextResponse.json({ error: 'Media data not available' }, { status: 422 })
      }

      const goResponse = await fetch(`${apiUrl}/message/downloadmedia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ message: goRawMessage }),
      })

      if (!goResponse.ok) {
        console.error('[media-proxy] Evolution Go error:', goResponse.status, await goResponse.text().catch(() => ''))
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: 502 })
      }

      const goData = await goResponse.json().catch(() => null)
      const dataUrl = goData?.data?.base64 as string | undefined

      if (!dataUrl) {
        return NextResponse.json({ error: 'No media data returned' }, { status: 404 })
      }

      // Data URL: "data:<mimetype>;base64,<conteúdo>"
      const commaIdx = dataUrl.indexOf(',')
      const base64Content = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl
      const inferredMime = commaIdx >= 0 ? dataUrl.slice(5, dataUrl.indexOf(';')) : mediaMimetype

      const buffer = Buffer.from(base64Content, 'base64')
      return new Response(buffer, {
        headers: {
          'Content-Type': inferredMime || mediaMimetype,
          'Cache-Control': 'private, max-age=3600',
          'Content-Length': String(buffer.length),
          'Accept-Ranges': 'bytes',
        },
      })
    }

    // 3c. Evolution JS — obter mídia em base64
    const instanceName = inbox.evolutionInstanceName
    if (!instanceName) {
      return NextResponse.json(
        { error: 'No instance configured' },
        { status: 422 },
      )
    }

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

    return new Response(buffer, {
      headers: {
        'Content-Type': mimetype ?? mediaMimetype,
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(buffer.length),
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error) {
    console.error('[media-proxy] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
