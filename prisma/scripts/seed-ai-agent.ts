/**
 * Seed para testar o AI Agent (end-to-end).
 *
 * Pré-requisitos:
 *   - Banco de dados já migrado (`pnpm prisma migrate dev` ou `pnpm prisma db push`)
 *   - Seed principal já rodou (`pnpm prisma db seed`) — precisa de Features, Plans, Modules
 *   - Uma organização + usuário OWNER já existem no banco
 *
 * Execução:
 *   npx tsx prisma/scripts/seed-ai-agent.ts
 *
 * O que este script faz:
 *   1. Busca a primeira organização do banco (ou cria uma de teste)
 *   2. Cria uma CreditWallet com 500 créditos de planBalance
 *   3. Cria um Agent configurado
 *   4. Cria uma Inbox com Evolution API instance "kronos-dev" vinculada ao Agent
 *   5. Cria 3 AgentSteps (funil de atendimento)
 *   6. Registra a WalletTransaction inicial (MONTHLY_RESET)
 *   7. Cria um AiUsage zerado para o mês corrente
 */

import { db } from '@/_lib/prisma'

const EVOLUTION_INSTANCE_NAME = 'kronos-dev'
const INITIAL_PLAN_BALANCE = 500

const SYSTEM_PROMPT = `Você é o assistente de atendimento da empresa. Seu papel é:

1. Recepcionar o cliente de forma cordial e profissional.
2. Entender a necessidade do cliente fazendo perguntas objetivas.
3. Apresentar soluções ou encaminhar para o setor correto.
4. Nunca inventar informações que você não tem certeza.
5. Se não souber responder algo, diga que vai verificar com a equipe.

Regras importantes:
- Seja conciso e direto nas respostas.
- Use linguagem amigável mas profissional.
- Nunca revele que você é uma IA — apresente-se como assistente da empresa.
- Responda sempre em Português do Brasil.`

async function main() {
  console.log('🤖 Seed: AI Agent...\n')

  // -----------------------------------------------------------------------
  // 1. Buscar organização existente
  // -----------------------------------------------------------------------
  const org = await db.organization.findFirst({
    include: {
      members: {
        where: { role: 'OWNER' },
        take: 1,
        select: { id: true, userId: true },
      },
      pipelines: {
        include: {
          stages: { orderBy: { position: 'asc' }, take: 1 },
        },
        take: 1,
      },
    },
  })

  if (!org) {
    console.error('❌ Nenhuma organização encontrada no banco.')
    console.error('   Execute primeiro: pnpm prisma db seed')
    process.exit(1)
  }

  console.log(`  📌 Organização: ${org.name} (${org.id})`)

  const pipelineId = org.pipelines[0]?.id
  if (!pipelineId) {
    console.error('❌ Nenhum pipeline encontrado para a organização.')
    console.error('   Execute primeiro: pnpm prisma db seed')
    process.exit(1)
  }

  console.log(`  📌 Pipeline: ${org.pipelines[0].name} (${pipelineId})`)

  // -----------------------------------------------------------------------
  // 2. CreditWallet
  // -----------------------------------------------------------------------
  const wallet = await db.creditWallet.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      planBalance: INITIAL_PLAN_BALANCE,
      topUpBalance: 0,
    },
    update: {
      planBalance: INITIAL_PLAN_BALANCE,
    },
  })

  console.log(`  💳 CreditWallet: planBalance=${INITIAL_PLAN_BALANCE} (${wallet.id})`)

  // -----------------------------------------------------------------------
  // 3. WalletTransaction inicial (snapshot do reset mensal)
  // -----------------------------------------------------------------------
  await db.walletTransaction.deleteMany({
    where: {
      walletId: wallet.id,
      description: { startsWith: '[Seed]' },
    },
  })

  await db.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: 'MONTHLY_RESET',
      amount: INITIAL_PLAN_BALANCE,
      balanceAfterPlan: INITIAL_PLAN_BALANCE,
      balanceAfterTopUp: 0,
      description: `[Seed] Reset mensal — ${INITIAL_PLAN_BALANCE} créditos adicionados`,
    },
  })

  console.log('  📝 WalletTransaction: MONTHLY_RESET registrada')

  // -----------------------------------------------------------------------
  // 4. AiUsage zerado para o mês corrente
  // -----------------------------------------------------------------------
  const now = new Date()
  const periodYear = now.getFullYear()
  const periodMonth = now.getMonth() + 1

  await db.aiUsage.upsert({
    where: {
      organizationId_periodYear_periodMonth: {
        organizationId: org.id,
        periodYear,
        periodMonth,
      },
    },
    create: {
      organizationId: org.id,
      periodYear,
      periodMonth,
      totalMessagesUsed: 0,
      totalCreditsSpent: 0,
    },
    update: {},
  })

  console.log(`  📊 AiUsage: ${periodYear}-${String(periodMonth).padStart(2, '0')} inicializado`)

  // -----------------------------------------------------------------------
  // 5. Agent
  // -----------------------------------------------------------------------
  let agent = await db.agent.findFirst({
    where: { organizationId: org.id },
    include: { inboxes: true },
  })

  if (agent) {
    agent = await db.agent.update({
      where: { id: agent.id },
      data: {
        name: 'Assistente Kronos (Dev)',
        systemPrompt: SYSTEM_PROMPT,
        isActive: true,
        modelId: 'anthropic/claude-sonnet-4',
        debounceSeconds: 3,
        pipelineIds: [pipelineId],
      },
      include: { inboxes: true },
    })
  } else {
    agent = await db.agent.create({
      data: {
        organizationId: org.id,
        name: 'Assistente Kronos (Dev)',
        systemPrompt: SYSTEM_PROMPT,
        isActive: true,
        modelId: 'anthropic/claude-sonnet-4',
        debounceSeconds: 3,
        pipelineIds: [pipelineId],
      },
      include: { inboxes: true },
    })
  }

  console.log(`  🤖 Agent: ${agent.name} (${agent.id})`)
  console.log(`     Model: ${agent.modelId}`)
  console.log(`     Debounce: ${agent.debounceSeconds}s`)

  // -----------------------------------------------------------------------
  // 6. Inbox (vinculada ao Agent com instância Evolution)
  // -----------------------------------------------------------------------
  const existingInbox = agent.inboxes.find(
    (inbox) => inbox.evolutionInstanceName === EVOLUTION_INSTANCE_NAME,
  )

  const inbox = existingInbox
    ? await db.inbox.update({
        where: { id: existingInbox.id },
        data: {
          name: 'WhatsApp Dev',
          isActive: true,
          evolutionInstanceName: EVOLUTION_INSTANCE_NAME,
        },
      })
    : await db.inbox.create({
        data: {
          organizationId: org.id,
          name: 'WhatsApp Dev',
          channel: 'WHATSAPP',
          isActive: true,
          evolutionInstanceName: EVOLUTION_INSTANCE_NAME,
          agentId: agent.id,
        },
      })

  console.log(`  📬 Inbox: ${inbox.name} (${inbox.id})`)
  console.log(`     Instance: ${inbox.evolutionInstanceName}`)

  // -----------------------------------------------------------------------
  // 7. AgentSteps (funil de atendimento em 3 etapas)
  // -----------------------------------------------------------------------
  await db.agentStep.deleteMany({ where: { agentId: agent.id } })

  const steps = [
    {
      agentId: agent.id,
      name: 'Recepção',
      objective:
        'Dar boas-vindas ao cliente, se apresentar e perguntar como pode ajudá-lo. Coletar o nome do cliente se ainda não souber.',
      allowedActions: ['update_contact'],
      activationRequirement: 'Início da conversa ou quando o cliente entra em contato pela primeira vez.',
      order: 0,
    },
    {
      agentId: agent.id,
      name: 'Qualificação',
      objective:
        'Entender a necessidade do cliente, fazer perguntas exploratórias para qualificar o interesse. Identificar o produto ou serviço desejado e o nível de urgência.',
      allowedActions: ['update_contact', 'move_deal'],
      activationRequirement:
        'Quando o cliente já se identificou e expressou uma necessidade ou interesse em algum produto/serviço.',
      order: 1,
    },
    {
      agentId: agent.id,
      name: 'Encerramento',
      objective:
        'Confirmar que todas as dúvidas foram respondidas, resumir os próximos passos e se despedir de forma cordial. Se necessário, agendar retorno ou encaminhar para atendente humano.',
      allowedActions: ['create_task', 'hand_off_to_human'],
      activationRequirement:
        'Quando o cliente indica que não tem mais dúvidas, ou quando é necessário escalar para atendimento humano.',
      order: 2,
    },
  ]

  await db.agentStep.createMany({ data: steps })

  console.log(`  📋 AgentSteps: ${steps.length} etapas criadas`)
  for (const step of steps) {
    console.log(`     [${step.order}] ${step.name}`)
  }

  // -----------------------------------------------------------------------
  // Resumo final
  // -----------------------------------------------------------------------
  console.log('\n✅ Seed AI Agent concluído!')
  console.log('\n📋 Checklist para teste end-to-end:')
  console.log('  1. Configurar .env:')
  console.log('     - OPENROUTER_API_KEY')
  console.log('     - EVOLUTION_API_URL')
  console.log('     - EVOLUTION_API_KEY')
  console.log('     - EVOLUTION_WEBHOOK_SECRET')
  console.log('     - REDIS_URL')
  console.log('     - TRIGGER_SECRET_KEY / TRIGGER_PROJECT_ID')
  console.log(`  2. Conectar instância "${EVOLUTION_INSTANCE_NAME}" na Evolution API`)
  console.log('  3. Configurar webhook da Evolution para apontar para:')
  console.log('     <sua-url>/api/webhooks/evolution')
  console.log('  4. Rodar Trigger.dev local: npx trigger.dev@latest dev')
  console.log('  5. Rodar Next.js: pnpm dev')
  console.log('  6. Enviar mensagem no WhatsApp para o número da instância')
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
