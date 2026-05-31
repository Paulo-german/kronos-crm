import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

const CACHE_TTL_SECONDS = 3600

const fetchContactCustomFieldValuesFromDb = async (
  contactId: string,
  orgId: string,
): Promise<Record<string, string | null>> => {
  // Join via fieldDefinition.organizationId garante isolamento de org
  const values = await db.customFieldValue.findMany({
    where: {
      entityId: contactId,
      fieldDefinition: {
        organizationId: orgId,
        isActive: true,
      },
    },
    select: {
      fieldDefinitionId: true,
      value: true,
    },
  })

  return values.reduce<Record<string, string | null>>((map, current) => {
    map[current.fieldDefinitionId] = current.value
    return map
  }, {})
}

/**
 * Mapa { [fieldDefinitionId]: value } dos valores de campos personalizados de um contato.
 * Facilita a hidratação do formulário de edição.
 *
 * A segunda tag (`field-definitions:${orgId}`) reflete mudanças quando uma
 * definição é desativada/reordenada.
 */
export const getContactCustomFieldValues = cache(
  async (contactId: string, orgId: string): Promise<Record<string, string | null>> => {
    const getCached = unstable_cache(
      async () => fetchContactCustomFieldValuesFromDb(contactId, orgId),
      [`contact-custom-fields-${contactId}`],
      {
        tags: [`contact-custom-fields:${contactId}`, `field-definitions:${orgId}`],
        revalidate: CACHE_TTL_SECONDS,
      },
    )

    return getCached()
  },
)
