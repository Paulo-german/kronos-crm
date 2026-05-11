import { embed } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { db } from '@/_lib/prisma'

// Replica o setup de provider.ts sem depender de `server-only` (incompatível com tsx)
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})
const embeddingModel = openrouter.embedding('openai/text-embedding-3-small')

/**
 * Backfill de embeddings para serviços existentes.
 *
 * Roda 1x após a migration que adiciona a coluna `embedding`. Em produção, o
 * upsert do embedding deve acontecer no create/update do serviço — este script
 * é apenas para popular os dados legados sem embedding.
 */
async function main() {
  const services = await db.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name FROM services WHERE embedding IS NULL AND is_active = true
  `

  console.log(`Backfilling ${services.length} services...`)

  for (const service of services) {
    const { embedding } = await embed({
      model: embeddingModel,
      value: service.name,
    })
    const embeddingStr = `[${embedding.join(',')}]`
    await db.$executeRaw`
      UPDATE services SET embedding = ${embeddingStr}::vector WHERE id = ${service.id}
    `
    console.log(`✓ ${service.name}`)
  }

  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
