import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'

/**
 * API route chamada pelo Trigger.dev após gerar/atualizar embedding de produto.
 * Invalida o cache de produtos da organização para que a UI reflita o estado atualizado.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { orgId } = body as { orgId?: string }

  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  revalidateTag(`products:${orgId}`)

  return NextResponse.json({ revalidated: true })
}
