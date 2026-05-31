'use server'

import { EntityType } from '@prisma/client'
import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { findContactWithRBAC } from '@/_lib/rbac'
import { serializeFieldValue, parseFieldOptions } from '@/_lib/custom-fields/serialize'
import { updateContactCustomFieldsSchema } from './schema'

export const updateContactCustomFields = orgActionClient
  .schema(updateContactCustomFieldsSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC + ownership do contato (MEMBER só edita os próprios; valida org)
    await findContactWithRBAC(data.contactId, ctx)

    // 2. Carregar definições ativas da org para validar cada fieldDefinitionId
    const definitions = await db.fieldDefinition.findMany({
      where: {
        organizationId: ctx.orgId,
        entityType: EntityType.CONTACT,
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        isRequired: true,
        options: true,
        label: true,
      },
    })

    const definitionById = new Map(definitions.map((definition) => [definition.id, definition]))

    // 3. Validar e serializar cada valor por tipo
    const upserts: Array<{ fieldDefinitionId: string; value: string }> = []
    const deletions: string[] = []

    for (const entry of data.values) {
      const definition = definitionById.get(entry.fieldDefinitionId)
      if (!definition) {
        throw new Error('Campo personalizado inválido ou inativo.')
      }

      const serialized = serializeFieldValue(
        definition.type,
        entry.value,
        parseFieldOptions(definition.options),
      )

      if (!serialized.ok) {
        throw new Error(`${definition.label}: ${serialized.error}`)
      }

      if (serialized.value === null) {
        if (definition.isRequired) {
          throw new Error(`${definition.label} é obrigatório.`)
        }
        // Valor limpo → remove a linha em vez de gravar vazio
        deletions.push(entry.fieldDefinitionId)
        continue
      }

      upserts.push({ fieldDefinitionId: entry.fieldDefinitionId, value: serialized.value })
    }

    // 4. Aplicar em transação para atomicidade
    await db.$transaction([
      ...deletions.map((fieldDefinitionId) =>
        db.customFieldValue.deleteMany({
          where: { fieldDefinitionId, entityId: data.contactId },
        }),
      ),
      ...upserts.map((upsert) =>
        db.customFieldValue.upsert({
          where: {
            fieldDefinitionId_entityId: {
              fieldDefinitionId: upsert.fieldDefinitionId,
              entityId: data.contactId,
            },
          },
          create: {
            fieldDefinitionId: upsert.fieldDefinitionId,
            entityId: data.contactId,
            value: upsert.value,
          },
          update: { value: upsert.value },
        }),
      ),
    ])

    revalidateTag(`contact-custom-fields:${data.contactId}`)

    return { success: true }
  })
