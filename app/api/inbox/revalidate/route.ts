import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'

/**
 * API route chamada pelo Trigger.dev após salvar resposta da IA.
 * Invalida o cache de mensagens da conversa para que o polling do front
 * veja a nova mensagem sem esperar expiração do cache.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { conversationId, organizationId } = body as {
    conversationId?: string
    organizationId?: string
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
  }

  revalidateTag(`conversation-messages:${conversationId}`)

  if (organizationId) {
    revalidateTag(`credits:${organizationId}`)
  }

  return NextResponse.json({ revalidated: true })
}
