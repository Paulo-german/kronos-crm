import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 1. Auth
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

    if (!membership.isValid || !membership.orgId) {
      return NextResponse.json(
        { error: 'Você não tem acesso a esta organização.' },
        { status: 403 },
      )
    }

    // 2. Extrair productId da query string
    const { searchParams } = request.nextUrl
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'productId é obrigatório.' },
        { status: 400 },
      )
    }

    // 3. Ownership check — produto pertence à organização
    const product = await db.product.findFirst({
      where: { id: productId, organizationId: membership.orgId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado.' },
        { status: 404 },
      )
    }

    // 4. Buscar mídias ordenadas
    const media = await db.productMedia.findMany({
      where: { productId, organizationId: membership.orgId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        type: true,
        url: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        order: true,
      },
    })

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Product media list error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
