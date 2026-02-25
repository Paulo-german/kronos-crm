import { db } from '@/_lib/prisma'

async function main() {
  console.log('=== DEBUG AI AGENT ===\n')

  // 1. Agent existe e está ativo?
  const agents = await db.agent.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      evolutionInstanceName: true,
      modelId: true,
      debounceSeconds: true,
      organizationId: true,
    },
  })
  console.log('🤖 Agents:', agents.length)
  for (const agent of agents) {
    console.log(`   ${agent.name} | active=${agent.isActive} | instance=${agent.evolutionInstanceName} | model=${agent.modelId}`)
  }

  // 2. Conversas criadas?
  const conversations = await db.agentConversation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      remoteJid: true,
      aiPaused: true,
      createdAt: true,
      contact: { select: { name: true, phone: true } },
    },
  })
  console.log(`\n💬 Conversas recentes: ${conversations.length}`)
  for (const conv of conversations) {
    console.log(`   ${conv.remoteJid} | paused=${conv.aiPaused} | contact=${conv.contact.name} (${conv.contact.phone}) | ${conv.createdAt.toISOString()}`)
  }

  // 3. Mensagens salvas?
  const messages = await db.agentMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
      conversationId: true,
      inputTokens: true,
      outputTokens: true,
    },
  })
  console.log(`\n📨 Mensagens recentes: ${messages.length}`)
  for (const msg of messages) {
    console.log(`   [${msg.role}] ${msg.content.slice(0, 80)}${msg.content.length > 80 ? '...' : ''} | tokens: in=${msg.inputTokens ?? '-'} out=${msg.outputTokens ?? '-'} | ${msg.createdAt.toISOString()}`)
  }

  // 4. Wallet / créditos
  const wallets = await db.creditWallet.findMany({
    select: {
      organizationId: true,
      planBalance: true,
      topUpBalance: true,
    },
  })
  console.log(`\n💳 Wallets:`)
  for (const wallet of wallets) {
    console.log(`   org=${wallet.organizationId} | plan=${wallet.planBalance} | topUp=${wallet.topUpBalance} | total=${wallet.planBalance + wallet.topUpBalance}`)
  }

  // 5. Transactions recentes
  const transactions = await db.walletTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      type: true,
      amount: true,
      description: true,
      createdAt: true,
    },
  })
  console.log(`\n📝 Transactions recentes: ${transactions.length}`)
  for (const tx of transactions) {
    console.log(`   [${tx.type}] amount=${tx.amount} | ${tx.description} | ${tx.createdAt.toISOString()}`)
  }
}

main()
  .catch((error) => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
