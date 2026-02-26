import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'

/**
 * API route chamada pelo Trigger.dev após processar um arquivo de knowledge.
 * Invalida o cache do agente para que o polling do front veja o status atualizado.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { agentId, orgId } = body as { agentId?: string; orgId?: string }

  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  }

  revalidateTag(`agent:${agentId}`)

  if (orgId) {
    revalidateTag(`agents:${orgId}`)
  }

  return NextResponse.json({ revalidated: true })
}
