import { PrismaClient, CaptureChannel } from '@prisma/client'
import { resolveLegalBasisForChannel } from '../app/_lib/privacy/legal-basis-map'

const prisma = new PrismaClient()

// Tamanho do lote de contatos processados por iteração.
const BATCH_SIZE = 200

const BACKFILL_NOTES = 'Backfill automático da migração de compliance'

interface BackfillContact {
  id: string
  firstCaptureChannel: CaptureChannel | null
  firstCaptureAt: Date | null
  createdAt: Date
}

async function processBatch(contacts: BackfillContact[]): Promise<number> {
  // Resolve a base legal de cada contato a partir do canal de origem (nullable -> UNKNOWN).
  const privacyData = contacts.map((contact) => {
    const basis = resolveLegalBasisForChannel(contact.firstCaptureChannel)
    return {
      contactId: contact.id,
      legalBasis: basis.legalBasis,
      legalBasisSource: basis.legalBasisSource,
      // consentedAt só faz sentido quando a base legal é consentimento.
      // firstCaptureAt e createdAt são a melhor aproximação disponível.
      consentedAt:
        basis.legalBasis === 'CONSENT'
          ? (contact.firstCaptureAt ?? contact.createdAt)
          : null,
    }
  })

  const createdPrivacies = await prisma.contactPrivacy.createManyAndReturn({
    data: privacyData,
    select: { id: true, contactId: true, legalBasis: true, legalBasisSource: true },
  })

  await prisma.consentEvent.createMany({
    data: createdPrivacies.map((privacy) => ({
      contactId: privacy.contactId,
      privacyId: privacy.id,
      eventType: 'GRANTED' as const,
      legalBasis: privacy.legalBasis,
      legalBasisSource: privacy.legalBasisSource,
      performedBy: null,
      notes: BACKFILL_NOTES,
    })),
  })

  return createdPrivacies.length
}

async function main(): Promise<void> {
  console.log('Iniciando backfill de ContactPrivacy + ConsentEvent...')

  let totalProcessed = 0
  let batchNumber = 0

  // Idempotente: filtra contatos SEM ContactPrivacy (relação 1:1 opcional).
  // A cada iteração busca o próximo lote — contatos já processados saem do filtro.
  while (true) {
    const contacts = await prisma.contact.findMany({
      where: { privacy: null },
      select: {
        id: true,
        firstCaptureChannel: true,
        firstCaptureAt: true,
        createdAt: true,
      },
      take: BATCH_SIZE,
    })

    if (contacts.length === 0) break

    batchNumber += 1

    try {
      const processed = await processBatch(contacts)
      totalProcessed += processed
      console.log(
        `Lote ${batchNumber}: ${processed} contatos processados (total: ${totalProcessed}).`,
      )
    } catch (error) {
      console.error(
        `Falha no lote ${batchNumber} (${contacts.length} contatos). Pulando para o próximo.`,
        error,
      )
      // Evita loop infinito: se um lote falhou, ele continua sem privacy e
      // reapareceria no próximo findMany. Interrompemos para inspeção manual.
      break
    }
  }

  console.log(`\nBackfill finalizado: ${totalProcessed} contatos processados.`)
}

async function run(): Promise<void> {
  try {
    await main()
    process.exitCode = 0
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

await run()
