import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { tasks } from '@trigger.dev/sdk/v3'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import type { processKnowledgeFile } from '@/../../trigger/process-knowledge-file'
import type { MemberRole } from '@prisma/client'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_TEXT_LENGTH = 400_000 // ~400K chars (Trigger.dev payload limit ~512KB)

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — replicando padrão do orgActionClient
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

    // 2. RBAC
    const ctx = {
      userId: user.id,
      orgId: membership.orgId,
      userRole: membership.userRole as MemberRole,
    }

    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    // 3. Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const agentId = formData.get('agentId') as string | null

    if (!file || !agentId) {
      return NextResponse.json(
        { error: 'Arquivo e agentId são obrigatórios.' },
        { status: 400 },
      )
    }

    // 4. Validate type and size
    const mimeType = file.type || 'application/octet-stream'

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use PDF, TXT, MD ou DOCX.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo excede o limite de 10MB.' },
        { status: 400 },
      )
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Arquivo vazio.' },
        { status: 400 },
      )
    }

    // 5. Verify agent belongs to org
    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId: ctx.orgId },
    })

    if (!agent) {
      return NextResponse.json(
        { error: 'Agente não encontrado.' },
        { status: 404 },
      )
    }

    // 6. Extract text
    const buffer = Buffer.from(await file.arrayBuffer())
    let extractedText: string

    if (mimeType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer)
      extractedText = pdfData.text
    } else if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    } else {
      // TXT / MD
      extractedText = buffer.toString('utf-8')
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'Não foi possível extrair texto do arquivo.' },
        { status: 400 },
      )
    }

    // Truncar para caber no payload do Trigger.dev
    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText = extractedText.slice(0, MAX_TEXT_LENGTH)
    }

    // 7. Create file record as PROCESSING
    const knowledgeFile = await db.agentKnowledgeFile.create({
      data: {
        agentId,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        b2Url: null,
        status: 'PROCESSING',
      },
    })

    // 8. Dispatch Trigger.dev task
    await tasks.trigger<typeof processKnowledgeFile>(
      'process-knowledge-file',
      {
        fileId: knowledgeFile.id,
        agentId,
        extractedText,
      },
    )

    // 9. Revalidate cache
    revalidateTag(`agent:${agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return NextResponse.json({
      success: true,
      fileId: knowledgeFile.id,
    })
  } catch (error) {
    console.error('Knowledge upload error:', error)

    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
