import type { Prisma } from '@prisma/client'
import { EntityType, FieldType } from '@prisma/client'

// Campos editáveis do sistema para CONTACT (espelham colunas reais do Prisma).
// São representados como FieldDefinition com isSystem: true para que a UI de
// formulário renderize todos os campos de forma uniforme e ordenada.
const CONTACT_SYSTEM_FIELDS: Array<{
  key: string
  label: string
  type: FieldType
  isRequired: boolean
}> = [
  { key: 'name', label: 'Nome', type: FieldType.TEXT, isRequired: true },
  { key: 'email', label: 'Email', type: FieldType.EMAIL, isRequired: false },
  { key: 'phone', label: 'Telefone', type: FieldType.PHONE, isRequired: false },
  { key: 'role', label: 'Cargo', type: FieldType.TEXT, isRequired: false },
  { key: 'cpf', label: 'CPF', type: FieldType.TEXT, isRequired: false },
]

/**
 * Cria os campos do sistema para uma organização.
 * Recebe o `tx` da transação de criação da org.
 * `skipDuplicates` torna a operação idempotente (unique: orgId+entityType+key).
 */
export async function seedSystemFieldsForOrg(
  tx: Prisma.TransactionClient,
  orgId: string,
): Promise<void> {
  await tx.fieldDefinition.createMany({
    data: CONTACT_SYSTEM_FIELDS.map((field, index) => ({
      organizationId: orgId,
      entityType: EntityType.CONTACT,
      key: field.key,
      label: field.label,
      type: field.type,
      isSystem: true,
      isRequired: field.isRequired,
      // Sistema sempre no topo, ordem fixa pela posição no array
      position: index,
      isActive: true,
    })),
    skipDuplicates: true,
  })
}
