'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { updateDealCustomFields } from '@/_actions/deal/update-deal-custom-fields'
import { CustomFieldInlineEditor as BaseCustomFieldInlineEditor } from '@/_components/custom-fields/custom-field-inline-editor'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'

interface DealCustomFieldInlineEditorProps {
  dealId: string
  definition: FieldDefinitionDto
  rawValue: string | null
}

/**
 * Wrapper de negociação: injeta a action `updateDealCustomFields` no editor
 * inline genérico (agnóstico de entidade).
 */
export function DealCustomFieldInlineEditor({
  dealId,
  definition,
  rawValue,
}: DealCustomFieldInlineEditorProps) {
  const { execute, isPending } = useAction(updateDealCustomFields, {
    onSuccess: () => {
      toast.success(`${definition.label} atualizado.`, {
        position: 'bottom-right',
      })
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError ?? `Erro ao atualizar ${definition.label}.`,
        {
          position: 'bottom-right',
        },
      )
    },
  })

  return (
    <BaseCustomFieldInlineEditor
      definition={definition}
      rawValue={rawValue}
      isPending={isPending}
      onSave={(value) =>
        execute({
          dealId,
          values: [{ fieldDefinitionId: definition.id, value }],
        })
      }
    />
  )
}
