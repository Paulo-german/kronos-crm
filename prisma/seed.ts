import { db } from '@/_lib/prisma'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'

// Execução direta via CLI: pnpm prisma db seed
async function main() {
  console.log('🌱 Iniciando seed...')

  await seedFeaturesAndPlans()
  await seedModules()
  await seedPipelines()
  await seedNotifications()

  console.log('✅ Seed concluído!')
}

async function seedFeaturesAndPlans() {
  console.log('📦 Seed: Features, Plans e PlanLimits...')

  // Features do catálogo
  const features = [
    { key: 'crm.max_contacts', name: 'Contatos', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'crm.max_deals', name: 'Negócios', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'crm.max_products', name: 'Produtos', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'crm.max_members', name: 'Membros', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'ai.max_agents', name: 'Agentes IA', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'ai.max_workers_per_group', name: 'Workers por Equipe de Agentes', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'ai.max_knowledge_files', name: 'Arquivos de Conhecimento', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'ai.monthly_credits', name: 'Créditos IA mensais', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'inbox.max_inboxes', name: 'Caixas de Entrada', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'ai.max_follow_up_monthly', name: 'Follow-ups mensais', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'ai.max_follow_ups', name: 'Follow-ups por agente (total)', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'crm.max_automations', name: 'Automações', type: 'STATIC' as const, valueType: 'NUMBER' as const },
    { key: 'crm.max_pipelines', name: 'Funis de Vendas', type: 'STATIC' as const, valueType: 'NUMBER' as const },
  ]

  const featureRecords: Record<string, { id: string }> = {}

  for (const feature of features) {
    const record = await db.feature.upsert({
      where: { key: feature.key },
      create: feature,
      update: { name: feature.name, type: feature.type, valueType: feature.valueType },
      select: { id: true, key: true },
    })
    featureRecords[feature.key] = record
  }

  console.log(`  ✅ ${features.length} features sincronizadas`)

  // Planos
  const plans = [
    {
      slug: 'light',
      name: 'Light',
      description: 'Para profissionais solo que querem organizar seu pipeline de vendas.',
      isActive: true,
      stripeProductId: process.env.STRIPE_LIGHT_PRODUCT_ID ?? null,
    },
    {
      slug: 'essential',
      name: 'Essential',
      description: 'Para equipes pequenas começando a organizar seu pipeline de vendas.',
      isActive: true,
      stripeProductId: process.env.STRIPE_ESSENTIAL_PRODUCT_ID ?? null,
    },
    {
      slug: 'scale',
      name: 'Scale',
      description: 'Para equipes em crescimento que precisam de mais recursos e automação.',
      isActive: true,
      stripeProductId: process.env.STRIPE_SCALE_PRODUCT_ID ?? null,
    },
    {
      slug: 'enterprise',
      name: 'Enterprise',
      description: 'Para grandes operações com necessidades avançadas de personalização.',
      isActive: true,
      stripeProductId: process.env.STRIPE_ENTERPRISE_PRODUCT_ID ?? null,
    },
  ]

  for (const plan of plans) {
    await db.plan.upsert({
      where: { slug: plan.slug },
      create: plan,
      update: { name: plan.name, description: plan.description, isActive: plan.isActive, stripeProductId: plan.stripeProductId },
    })
  }

  console.log(`  ✅ ${plans.length} planos sincronizados`)

  // Limites por plano (valueNumber)
  // 999999 representa "ilimitado" para o plano Enterprise
  const planLimits: Array<{ planSlug: string; featureKey: string; valueNumber: number }> = [
    { planSlug: 'light', featureKey: 'crm.max_contacts', valueNumber: 5000 },
    { planSlug: 'light', featureKey: 'crm.max_deals', valueNumber: 5000 },
    { planSlug: 'light', featureKey: 'crm.max_products', valueNumber: 20 },
    { planSlug: 'light', featureKey: 'crm.max_members', valueNumber: 1 },

    { planSlug: 'essential', featureKey: 'crm.max_contacts', valueNumber: 25000 },
    { planSlug: 'essential', featureKey: 'crm.max_deals', valueNumber: 25000 },
    { planSlug: 'essential', featureKey: 'crm.max_products', valueNumber: 50 },
    { planSlug: 'essential', featureKey: 'crm.max_members', valueNumber: 4 },

    { planSlug: 'scale', featureKey: 'crm.max_contacts', valueNumber: 50000 },
    { planSlug: 'scale', featureKey: 'crm.max_deals', valueNumber: 50000 },
    { planSlug: 'scale', featureKey: 'crm.max_products', valueNumber: 100 },
    { planSlug: 'scale', featureKey: 'crm.max_members', valueNumber: 10 },

    { planSlug: 'enterprise', featureKey: 'crm.max_contacts', valueNumber: 50000 },
    { planSlug: 'enterprise', featureKey: 'crm.max_deals', valueNumber: 50000 },
    { planSlug: 'enterprise', featureKey: 'crm.max_products', valueNumber: 999999 },
    { planSlug: 'enterprise', featureKey: 'crm.max_members', valueNumber: 20 },

    // Agentes IA
    { planSlug: 'light', featureKey: 'ai.max_agents', valueNumber: 1 },
    { planSlug: 'essential', featureKey: 'ai.max_agents', valueNumber: 4 },
    { planSlug: 'scale', featureKey: 'ai.max_agents', valueNumber: 10 },
    { planSlug: 'enterprise', featureKey: 'ai.max_agents', valueNumber: 20 },

    // Workers por Equipe de Agentes (Light = 0, sem acesso a equipes)
    { planSlug: 'light', featureKey: 'ai.max_workers_per_group', valueNumber: 0 },
    { planSlug: 'essential', featureKey: 'ai.max_workers_per_group', valueNumber: 3 },
    { planSlug: 'scale', featureKey: 'ai.max_workers_per_group', valueNumber: 5 },
    { planSlug: 'enterprise', featureKey: 'ai.max_workers_per_group', valueNumber: 10 },

    // Arquivos de Conhecimento (RAG)
    { planSlug: 'light', featureKey: 'ai.max_knowledge_files', valueNumber: 3 },
    { planSlug: 'essential', featureKey: 'ai.max_knowledge_files', valueNumber: 10 },
    { planSlug: 'scale', featureKey: 'ai.max_knowledge_files', valueNumber: 20 },
    { planSlug: 'enterprise', featureKey: 'ai.max_knowledge_files', valueNumber: 35 },

    // Créditos IA mensais (token-based: Sonnet ~10 créditos/msg, Flash ~1 crédito/msg)
    { planSlug: 'light', featureKey: 'ai.monthly_credits', valueNumber: 10000 },
    { planSlug: 'essential', featureKey: 'ai.monthly_credits', valueNumber: 18000 },
    { planSlug: 'scale', featureKey: 'ai.monthly_credits', valueNumber: 45000 },
    { planSlug: 'enterprise', featureKey: 'ai.monthly_credits', valueNumber: 72000 },

    // Caixas de Entrada
    { planSlug: 'light', featureKey: 'inbox.max_inboxes', valueNumber: 1 },
    { planSlug: 'essential', featureKey: 'inbox.max_inboxes', valueNumber: 3 },
    { planSlug: 'scale', featureKey: 'inbox.max_inboxes', valueNumber: 5 },
    { planSlug: 'enterprise', featureKey: 'inbox.max_inboxes', valueNumber: 10 },

    // Follow-ups mensais (limite de envios por mês via cron de IA)
    { planSlug: 'light', featureKey: 'ai.max_follow_up_monthly', valueNumber: 150 },
    { planSlug: 'essential', featureKey: 'ai.max_follow_up_monthly', valueNumber: 550 },
    { planSlug: 'scale', featureKey: 'ai.max_follow_up_monthly', valueNumber: 1500 },
    { planSlug: 'enterprise', featureKey: 'ai.max_follow_up_monthly', valueNumber: 3500 },

    // Follow-ups cadastrados (limite de follow-ups configurados por org)
    { planSlug: 'light', featureKey: 'ai.max_follow_ups', valueNumber: 1 },
    { planSlug: 'essential', featureKey: 'ai.max_follow_ups', valueNumber: 3 },
    { planSlug: 'scale', featureKey: 'ai.max_follow_ups', valueNumber: 8 },
    { planSlug: 'enterprise', featureKey: 'ai.max_follow_ups', valueNumber: 20 },

    // Automações (motor de regras CRM)
    { planSlug: 'light', featureKey: 'crm.max_automations', valueNumber: 3 },
    { planSlug: 'essential', featureKey: 'crm.max_automations', valueNumber: 10 },
    { planSlug: 'scale', featureKey: 'crm.max_automations', valueNumber: 25 },
    { planSlug: 'enterprise', featureKey: 'crm.max_automations', valueNumber: 50 },

    // Funis de Vendas (Light = 1, Essential+ = ilimitado representado por 999)
    { planSlug: 'light', featureKey: 'crm.max_pipelines', valueNumber: 1 },
    { planSlug: 'essential', featureKey: 'crm.max_pipelines', valueNumber: 999 },
    { planSlug: 'scale', featureKey: 'crm.max_pipelines', valueNumber: 999 },
    { planSlug: 'enterprise', featureKey: 'crm.max_pipelines', valueNumber: 999 },
  ]

  // Resolver IDs do DB para os limites
  const allPlans = await db.plan.findMany({ select: { id: true, slug: true } })
  const planById = Object.fromEntries(allPlans.map((plan) => [plan.slug, plan.id]))

  for (const limit of planLimits) {
    const planId = planById[limit.planSlug]
    const featureId = featureRecords[limit.featureKey]?.id

    if (!planId || !featureId) {
      console.warn(`  ⚠️ Skipping limit for ${limit.planSlug}/${limit.featureKey}: ID não encontrado`)
      continue
    }

    await db.planLimit.upsert({
      where: { planId_featureId: { planId, featureId } },
      create: { planId, featureId, valueNumber: limit.valueNumber },
      update: { valueNumber: limit.valueNumber },
    })
  }

  console.log(`  ✅ ${planLimits.length} limites de plano sincronizados`)
}

async function seedModules() {
  console.log('📦 Seed: Modules e PlanModules...')

  const modules = [
    { slug: 'crm', name: 'CRM' },
    { slug: 'inbox', name: 'Inbox' },
    { slug: 'ai-agent', name: 'AI Agent' },
  ]

  const moduleRecords: Record<string, string> = {}

  for (const mod of modules) {
    const record = await db.module.upsert({
      where: { slug: mod.slug },
      create: { slug: mod.slug, name: mod.name, isActive: true },
      update: { name: mod.name, isActive: true },
      select: { id: true },
    })
    moduleRecords[mod.slug] = record.id
  }

  console.log(`  ✅ ${modules.length} módulos sincronizados`)

  // Buscar planos do DB (sem depender de variável externa)
  const allPlans = await db.plan.findMany({ where: { isActive: true }, select: { id: true, slug: true } })

  if (allPlans.length === 0) {
    console.warn('  ⚠️ Nenhum plano encontrado no DB. Execute seedFeaturesAndPlans() primeiro.')
    return
  }

  // Todos os planos desbloqueiam todos os módulos (por enquanto)
  let planModuleCount = 0

  for (const plan of allPlans) {
    for (const moduleId of Object.values(moduleRecords)) {
      await db.planModule.upsert({
        where: { planId_moduleId: { planId: plan.id, moduleId } },
        create: { planId: plan.id, moduleId },
        update: {},
      })
      planModuleCount++
    }
  }

  console.log(`  ✅ ${planModuleCount} plan-module links sincronizados`)

  // Linkar features existentes aos módulos
  const featureModuleMap: Record<string, string> = {
    'crm.': 'crm',
    'ai.': 'ai-agent',
    'inbox.': 'inbox',
  }

  const allFeatures = await db.feature.findMany({ select: { id: true, key: true } })

  for (const feature of allFeatures) {
    let matched = false

    for (const [prefix, moduleSlug] of Object.entries(featureModuleMap)) {
      if (feature.key.startsWith(prefix)) {
        const moduleId = moduleRecords[moduleSlug]
        if (moduleId) {
          await db.feature.update({
            where: { id: feature.id },
            data: { moduleId },
          })
        }
        matched = true
        break
      }
    }

    if (!matched) {
      console.warn(`  ⚠️ Feature "${feature.key}" não tem mapeamento de módulo`)
    }
  }

  console.log('  ✅ Features linkadas aos módulos')
}

async function seedPipelines() {
  console.log('🔧 Seed: Pipelines...')

  // Busca todas as organizações que não têm pipeline
  const orgsWithoutPipeline = await db.organization.findMany({
    where: {
      pipelines: {
        none: {},
      },
    },
    include: {
      members: {
        where: { role: 'OWNER' },
        take: 1,
      },
    },
  })

  if (orgsWithoutPipeline.length === 0) {
    console.log('  ℹ️ Todas as organizações já possuem pipeline.')
    return
  }

  for (const org of orgsWithoutPipeline) {
    await createDefaultPipeline({
      orgId: org.id,
    })
    console.log(`  ✅ Pipeline criado para organização: ${org.name}`)
  }
}

async function seedNotifications() {
  console.log('🔔 Seed: Notificações de teste (todas as variantes)...')

  // Buscar a primeira org com um OWNER que tenha userId
  const ownerMember = await db.member.findFirst({
    where: { role: 'OWNER', status: 'ACCEPTED', userId: { not: null } },
    include: {
      organization: { select: { id: true, slug: true, name: true } },
    },
  })

  if (!ownerMember || !ownerMember.userId) {
    console.warn('  ⚠️ Nenhuma org com OWNER encontrada. Pulando seed de notificações.')
    return
  }

  const orgId = ownerMember.organization.id
  const orgSlug = ownerMember.organization.slug
  const userId = ownerMember.userId

  // Limpar notificações anteriores do seed para evitar duplicatas
  await db.notification.deleteMany({
    where: {
      organizationId: orgId,
      userId,
      title: { startsWith: '[Seed]' },
    },
  })

  // Criar um membro PENDING fake para o convite actionable
  const fakePendingMember = await db.member.upsert({
    where: {
      organizationId_email: {
        organizationId: orgId,
        email: 'seed-invite@example.com',
      },
    },
    create: {
      organizationId: orgId,
      email: 'seed-invite@example.com',
      role: 'MEMBER',
      status: 'PENDING',
      invitationToken: 'a0000000-0000-0000-0000-000000000001',
    },
    update: {
      status: 'PENDING',
      invitationToken: 'a0000000-0000-0000-0000-000000000001',
    },
  })

  // Todas as notificações possíveis, cobrindo cada variante
  const notifications = [
    // ── ACTIONABLE (convite com aceite/recusa) ──
    {
      type: 'USER_ACTION' as const,
      title: '[Seed] Convite para organização',
      body: `Você foi convidado para participar de ${ownerMember.organization.name}.`,
      actionUrl: `/invite/${fakePendingMember.invitationToken}`,
      resourceType: 'member',
      resourceId: fakePendingMember.id,
      readAt: null,
    },

    // ── ASSIGNMENT (atribuições e transferências) ──
    {
      type: 'USER_ACTION' as const,
      title: '[Seed] Novo deal atribuído a você',
      body: 'O deal "Proposta Comercial ACME" foi atribuído a você.',
      actionUrl: `/org/${orgSlug}/crm/deals/seed-deal-id`,
      resourceType: 'deal',
      resourceId: 'seed-deal-id',
      readAt: null,
    },
    {
      type: 'USER_ACTION' as const,
      title: '[Seed] Deal transferido para você',
      body: 'O deal "Renovação Contrato XYZ" foi transferido para você (incluindo 3 contato(s) vinculado(s)).',
      actionUrl: `/org/${orgSlug}/crm/deals/seed-deal-transfer`,
      resourceType: 'deal',
      resourceId: 'seed-deal-transfer',
      readAt: null,
    },
    {
      type: 'USER_ACTION' as const,
      title: '[Seed] Nova tarefa atribuída a você',
      body: 'A tarefa "Ligar para cliente ACME" foi atribuída a você.',
      actionUrl: `/org/${orgSlug}/crm/tasks`,
      resourceType: 'task',
      resourceId: 'seed-task-id',
      readAt: null,
    },
    {
      type: 'USER_ACTION' as const,
      title: '[Seed] Tarefa transferida para você',
      body: 'A tarefa "Follow-up reunião" foi transferida para você.',
      actionUrl: `/org/${orgSlug}/crm/tasks`,
      resourceType: 'task',
      resourceId: 'seed-task-transfer',
      readAt: new Date(), // Lida
    },
    {
      type: 'USER_ACTION' as const,
      title: '[Seed] Contato transferido para você',
      body: 'O contato "Maria Silva" foi transferido para você (incluindo 2 negócio(s) vinculado(s)).',
      actionUrl: `/org/${orgSlug}/contacts/seed-contact-id`,
      resourceType: 'contact',
      resourceId: 'seed-contact-id',
      readAt: null,
    },
    {
      type: 'USER_ACTION' as const,
      title: '[Seed] Novo agendamento atribuído a você',
      body: 'O agendamento "Reunião de discovery" foi atribuído a você.',
      actionUrl: `/org/${orgSlug}/crm/appointments`,
      resourceType: 'appointment',
      resourceId: 'seed-appointment-id',
      readAt: null,
    },
    {
      type: 'USER_ACTION' as const,
      title: '[Seed] Agendamento transferido para você',
      body: 'O agendamento "Demo do produto" foi transferido para você.',
      actionUrl: `/org/${orgSlug}/crm/appointments`,
      resourceType: 'appointment',
      resourceId: 'seed-appointment-transfer',
      readAt: new Date(), // Lida
    },
    {
      type: 'USER_ACTION' as const,
      title: '[Seed] Transferência de atendimento',
      body: 'O agente Sales Bot transferiu a conversa com João Souza. Motivo: Cliente pediu para falar com humano.',
      actionUrl: `/org/${orgSlug}/inbox?conversationId=seed-conversation-id`,
      resourceType: 'conversation',
      resourceId: 'seed-conversation-id',
      readAt: null,
    },

    // ── ALERT (alertas do sistema) ──
    {
      type: 'SYSTEM' as const,
      title: '[Seed] WhatsApp desconectado',
      body: 'A conexão WhatsApp "+55 11 99999-0000" está desativada. Mensagens não estão sendo processadas.',
      actionUrl: `/org/${orgSlug}/settings/inboxes`,
      resourceType: 'inbox',
      resourceId: 'seed-inbox-id',
      readAt: null,
    },
    {
      type: 'SYSTEM' as const,
      title: '[Seed] Falha no pagamento',
      body: 'Houve um problema com o pagamento da sua assinatura. Verifique seu método de pagamento.',
      actionUrl: `/org/${orgSlug}/settings/billing`,
      resourceType: 'subscription',
      resourceId: 'seed-subscription-id',
      readAt: null,
    },
    {
      type: 'SYSTEM' as const,
      title: '[Seed] Créditos de IA esgotados',
      body: 'Seus créditos de IA acabaram. Recarregue para continuar usando o agente.',
      actionUrl: `/org/${orgSlug}/settings/billing`,
      resourceType: 'credit',
      resourceId: null,
      readAt: new Date(), // Lida
    },

    // ── INFO (informativos) ──
    {
      type: 'USER_ACTION' as const,
      title: '[Seed] Novo membro na equipe',
      body: 'joao@example.com aceitou o convite e entrou na equipe.',
      actionUrl: `/org/${orgSlug}/settings/members`,
      resourceType: 'member',
      resourceId: 'seed-member-id',
      readAt: null,
    },
    {
      type: 'PLATFORM_ANNOUNCEMENT' as const,
      title: '[Seed] Nova funcionalidade disponível',
      body: 'Agora você pode configurar follow-ups automáticos via IA diretamente no pipeline.',
      actionUrl: null,
      resourceType: null,
      resourceId: null,
      readAt: null,
    },
    {
      type: 'PLATFORM_ANNOUNCEMENT' as const,
      title: '[Seed] Manutenção programada',
      body: 'O sistema passará por manutenção no dia 30/03 das 02h às 04h. Nenhuma ação necessária.',
      actionUrl: null,
      resourceType: null,
      resourceId: null,
      readAt: new Date(), // Lida
    },
  ]

  for (const notification of notifications) {
    await db.notification.create({
      data: {
        organizationId: orgId,
        userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        actionUrl: notification.actionUrl,
        resourceType: notification.resourceType,
        resourceId: notification.resourceId,
        readAt: notification.readAt,
      },
    })
  }

  console.log(`  ✅ ${notifications.length} notificações criadas para ${ownerMember.organization.name} (user: ${userId})`)
  console.log(`  ✅ Membro PENDING fake criado (seed-invite@example.com) para testar variante actionable`)
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
