/**
 * Inspeciona a conversa do simulador (inbox SIMULATOR) da Ana engine-v1:
 * mensagens, sessão do motor e eventos (erros incluídos).
 * Rodar: npx tsx scripts/_engine-inspect-sim.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ORG_ID = '963a7e02-120f-4485-a567-8b22a3af041e'

async function main() {
  const inbox = await prisma.inbox.findFirst({
    where: { organizationId: ORG_ID, connectionType: 'SIMULATOR' },
    select: {
      id: true,
      agentId: true,
      agent: { select: { name: true, agentVersion: true } },
    },
  })
  console.log('=== Inbox SIMULATOR ===')
  console.log(inbox)
  if (!inbox) return

  const conversation = await prisma.conversation.findFirst({
    where: { inboxId: inbox.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, aiPaused: true, dealId: true, createdAt: true },
  })
  console.log('\n=== Conversa (mais recente) ===')
  console.log(conversation)
  if (!conversation) return

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      content: true,
      deliveryStatus: true,
      inputTokens: true,
      outputTokens: true,
      metadata: true,
    },
  })
  console.log(`\n=== Mensagens (${messages.length}) ===`)
  for (const message of messages) {
    const status = message.deliveryStatus ? ` (${message.deliveryStatus})` : ''
    const tokens =
      message.inputTokens != null
        ? ` [in:${message.inputTokens} out:${message.outputTokens}]`
        : ''
    console.log(`[${message.role}]${status}${tokens} ${message.content}`)
  }

  const session = await prisma.agentSession.findUnique({
    where: { conversationId: conversation.id },
    select: { currentStepOrder: true, turnCount: true, state: true },
  })
  console.log('\n=== AgentSession (ledger) ===')
  console.log(
    'currentStepOrder:',
    session?.currentStepOrder,
    '| turnCount:',
    session?.turnCount,
  )
  console.log('state:', JSON.stringify(session?.state, null, 2))

  const events = await prisma.conversationEvent.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: { type: true, content: true, metadata: true },
  })
  console.log(`\n=== Eventos (${events.length}) ===`)
  for (const event of events) {
    console.log(`[${event.type}] ${event.content}`)
    if (event.metadata) console.log('   meta:', JSON.stringify(event.metadata))
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
