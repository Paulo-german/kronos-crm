import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

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
  const { conversationId, organizationId, tags, paths } = body as {
    conversationId?: string
    organizationId?: string
    tags?: string[]
    paths?: string[]
  }

  if (!conversationId && (!tags || tags.length === 0) && (!paths || paths.length === 0)) {
    return NextResponse.json(
      { error: 'conversationId, tags, or paths is required' },
      { status: 400 },
    )
  }

  if (conversationId) {
    revalidateTag(`conversation-messages:${conversationId}`)
  }

  if (organizationId) {
    revalidateTag(`credits:${organizationId}`)
  }

  if (tags) {
    for (const tag of tags) {
      revalidateTag(tag)
    }
  }

  if (paths) {
    for (const path of paths) {
      revalidatePath(path, 'page')
    }
  }

  return NextResponse.json({ revalidated: true })
}
