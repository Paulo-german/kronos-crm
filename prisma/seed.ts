import { db } from '@/_lib/prisma'
import { createDefaultPipeline } from '@/_data-access/pipeline/create-default-pipeline'

// Execução direta via CLI: pnpm prisma db seed
async function main() {
  console.log('🌱 Iniciando seed...')

  await seedFeaturesAndPlans()
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

  const planRecords: Record<string, { id: string }> = {}

  for (const plan of plans) {
    const record = await db.plan.upsert({
      where: { slug: plan.slug },
      create: plan,
      update: { name: plan.name, description: plan.description, isActive: plan.isActive, stripeProductId: plan.stripeProductId },
      select: { id: true, slug: true },
    })
    planRecords[plan.slug] = record
  }

  console.log(`  ✅ ${plans.length} planos sincronizados`)

  // Limites por plano (valueNumber)
  // 999999 representa "ilimitado" para o plano Enterprise
  const planLimits: Array<{ planSlug: string; featureKey: string; valueNumber: number }> = [
    { planSlug: 'essential', featureKey: 'crm.max_contacts', valueNumber: 500 },
    { planSlug: 'essential', featureKey: 'crm.max_deals', valueNumber: 250 },
    { planSlug: 'essential', featureKey: 'crm.max_products', valueNumber: 25 },
    { planSlug: 'essential', featureKey: 'crm.max_members', valueNumber: 5 },
    { planSlug: 'essential', featureKey: 'ai.messages_quota', valueNumber: 200 },

    { planSlug: 'scale', featureKey: 'crm.max_contacts', valueNumber: 5000 },
    { planSlug: 'scale', featureKey: 'crm.max_deals', valueNumber: 2500 },
    { planSlug: 'scale', featureKey: 'crm.max_products', valueNumber: 100 },
    { planSlug: 'scale', featureKey: 'crm.max_members', valueNumber: 15 },
    { planSlug: 'scale', featureKey: 'ai.messages_quota', valueNumber: 1000 },

    { planSlug: 'enterprise', featureKey: 'crm.max_contacts', valueNumber: 999999 },
    { planSlug: 'enterprise', featureKey: 'crm.max_deals', valueNumber: 999999 },
    { planSlug: 'enterprise', featureKey: 'crm.max_products', valueNumber: 999999 },
    { planSlug: 'enterprise', featureKey: 'crm.max_members', valueNumber: 999999 },
    { planSlug: 'enterprise', featureKey: 'ai.messages_quota', valueNumber: 5000 },
  ]

  for (const limit of planLimits) {
    const planId = planRecords[limit.planSlug]?.id
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
