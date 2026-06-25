'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { updateContactCustomFields } from '@/_actions/contact/update-contact-custom-fields'
import { CustomFieldInlineEditor as BaseCustomFieldInlineEditor } from '@/_components/custom-fields/custom-field-inline-editor'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'

interface CustomFieldInlineEditorProps {
  contactId: string
  definition: FieldDefinitionDto
  rawValue: string | null
}

/**
 * Wrapper de contato: injeta a action `updateContactCustomFields` no editor
 * inline genérico (agnóstico de entidade).
 */
export function CustomFieldInlineEditor({
  contactId,
  definition,
  rawValue,
}: CustomFieldInlineEditorProps) {
  const { execute, isPending } = useAction(updateContactCustomFields, {
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
          contactId,
          values: [{ fieldDefinitionId: definition.id, value }],
        })
      }
    />
  )
}
