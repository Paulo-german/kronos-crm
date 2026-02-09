'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { updateContact } from '@/_actions/contact/update-contact'
import type { UpdateContactInput } from '@/_actions/contact/update-contact/schema'

interface UseContactFieldUpdateOptions {
  contactId: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export const useContactFieldUpdate = ({
  contactId,
  onSuccess,
  onError,
}: UseContactFieldUpdateOptions) => {
  const router = useRouter()

  const { execute, isPending } = useAction(updateContact, {
    onSuccess: () => {
      toast.success('Contato atualizado com sucesso!')
      router.refresh()
      onSuccess?.()
    },
    onError: ({ error }) => {
      const errorMessage = error.serverError || 'Erro ao atualizar contato.'
      toast.error(errorMessage)
      onError?.(errorMessage)
    },
  })

  const updateField = <K extends keyof UpdateContactInput>(
    field: K,
    value: UpdateContactInput[K],
  ) => {
    execute({ id: contactId, [field]: value })
  }

  return {
    updateField,
    isPending,
  }
}
