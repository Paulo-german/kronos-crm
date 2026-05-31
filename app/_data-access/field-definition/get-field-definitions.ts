import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { EntityType } from '@prisma/client'
import { db } from '@/_lib/prisma'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'
import { parseFieldOptions } from '@/_lib/custom-fields/serialize'

const CACHE_TTL_SECONDS = 3600

const fetchFieldDefinitionsFromDb = async (
  orgId: string,
  entityType: EntityType,
): Promise<FieldDefinitionDto[]> => {
  const definitions = await db.fieldDefinition.findMany({
    where: {
      organizationId: orgId,
      entityType,
      isActive: true,
    },
    orderBy: { position: 'asc' },
    include: {
      _count: {
        select: { values: true },
      },
    },
  })

  return definitions.map((definition) => ({
    id: definition.id,
    entityType: definition.entityType,
    key: definition.key,
    label: definition.label,
    type: definition.type,
    isSystem: definition.isSystem,
    isRequired: definition.isRequired,
    options: parseFieldOptions(definition.options),
    position: definition.position,
    valueCount: definition._count.values,
  }))
}

/**
 * Lê as definições de campos (sistema + custom) de uma organização para uma entidade.
 * Definições são globais da org — sem RBAC de ownership; qualquer membro lê.
 */
export const getFieldDefinitions = cache(
  async (orgId: string, entityType: EntityType): Promise<FieldDefinitionDto[]> => {
    const getCached = unstable_cache(
      async () => fetchFieldDefinitionsFromDb(orgId, entityType),
      [`field-definitions-${orgId}-${entityType}`],
      {
        tags: [`field-definitions:${orgId}`],
        revalidate: CACHE_TTL_SECONDS,
      },
    )

    return getCached()
  },
)
