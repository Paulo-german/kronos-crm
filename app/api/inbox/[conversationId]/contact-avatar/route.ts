import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'
import { normalizePhoneToDigits } from '@/_lib/whatsapp/normalize-phone'

interface RouteContext {
  params: Promise<{ conversationId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(null, { status: 401 })
    }

    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      return new Response(null, { status: 400 })
    }

    const membership = await validateMembership(user.id, orgSlug)
    if (!membership.isValid || !membership.orgId) {
      return new Response(null, { status: 403 })
    }

    const { conversationId } = await context.params

    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, organizationId: membership.orgId },
      select: {
        contact: { select: { phone: true } },
        inbox: {
          select: {
            evolutionInstanceName: true,
            evolutionApiUrl: true,
            evolutionApiKey: true,
          },
        },
      },
    })

    if (!conversation) {
      return new Response(null, { status: 404 })
    }

    const { inbox, contact } = conversation
    const phone = contact.phone
    const instanceName = inbox.evolutionInstanceName

    if (!phone || !instanceName) {
      return new Response(null, { status: 204 })
    }

    const apiUrl = inbox.evolutionApiUrl || process.env.EVOLUTION_API_URL
    const apiKey = inbox.evolutionApiKey || process.env.EVOLUTION_API_KEY

    if (!apiUrl || !apiKey) {
      return new Response(null, { status: 204 })
    }

    const evolutionResponse = await fetch(
      `${apiUrl}/chat/fetchProfilePictureUrl/${instanceName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({
          number: normalizePhoneToDigits(phone) ?? phone,
        }),
        signal: AbortSignal.timeout(4000),
      },
    )

    if (!evolutionResponse.ok) {
      return new Response(null, { status: 204 })
    }

    const data = await evolutionResponse.json()
    const pictureUrl = data?.profilePictureUrl as string | null | undefined

    if (!pictureUrl) {
      return new Response(null, { status: 204 })
    }

    // Proxia os bytes da imagem para não expor a URL upstream ao cliente
    const imageResponse = await fetch(pictureUrl, {
      signal: AbortSignal.timeout(6000),
    })

    if (!imageResponse.ok) {
      return new Response(null, { status: 204 })
    }

    const contentType =
      imageResponse.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await imageResponse.arrayBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=7200',
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch {
    return new Response(null, { status: 204 })
  }
}

// Sem cache estático — perfil muda com frequência
export const dynamic = 'force-dynamic'
