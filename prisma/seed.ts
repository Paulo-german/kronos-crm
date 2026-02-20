import { db } from '@/_lib/prisma'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'

// Execução direta via CLI: pnpm prisma db seed
async function main() {
  console.log('🌱 Iniciando seed...')

  await seedFeaturesAndPlans()
  await seedModules()
  await seedPipelines()

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
    { key: 'ai.messages_quota', name: 'Quota de IA', type: 'METERED' as const, valueType: 'NUMBER' as const },
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
    { planSlug: 'light', featureKey: 'crm.max_products', valueNumber: 10 },
    { planSlug: 'light', featureKey: 'crm.max_members', valueNumber: 1 },
    { planSlug: 'light', featureKey: 'ai.messages_quota', valueNumber: 100 },

    { planSlug: 'essential', featureKey: 'crm.max_contacts', valueNumber: 25000 },
    { planSlug: 'essential', featureKey: 'crm.max_deals', valueNumber: 25000 },
    { planSlug: 'essential', featureKey: 'crm.max_products', valueNumber: 25 },
    { planSlug: 'essential', featureKey: 'crm.max_members', valueNumber: 3 },
    { planSlug: 'essential', featureKey: 'ai.messages_quota', valueNumber: 400 },

    { planSlug: 'scale', featureKey: 'crm.max_contacts', valueNumber: 50000 },
    { planSlug: 'scale', featureKey: 'crm.max_deals', valueNumber: 50000 },
    { planSlug: 'scale', featureKey: 'crm.max_products', valueNumber: 100 },
    { planSlug: 'scale', featureKey: 'crm.max_members', valueNumber: 8 },
    { planSlug: 'scale', featureKey: 'ai.messages_quota', valueNumber: 1200 },

    { planSlug: 'enterprise', featureKey: 'crm.max_contacts', valueNumber: 50000 },
    { planSlug: 'enterprise', featureKey: 'crm.max_deals', valueNumber: 50000 },
    { planSlug: 'enterprise', featureKey: 'crm.max_products', valueNumber: 999999 },
    { planSlug: 'enterprise', featureKey: 'crm.max_members', valueNumber: 12 },
    { planSlug: 'enterprise', featureKey: 'ai.messages_quota', valueNumber: 2500 },
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

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
