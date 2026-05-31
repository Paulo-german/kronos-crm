import { z } from 'zod'
import {
  CONTACT_NAME_MAX,
  CONTACT_EMAIL_MAX,
  CONTACT_PHONE_MAX,
  CONTACT_ROLE_MAX,
} from '@/_lib/constants/field-limits'

export const updateContactSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Nome não pode ser vazio').max(CONTACT_NAME_MAX).optional(),
    email: z.string().email('Email inválido').max(CONTACT_EMAIL_MAX).optional().or(z.literal('')),
    phone: z.string().max(CONTACT_PHONE_MAX).optional(),
    role: z.string().max(CONTACT_ROLE_MAX).optional(),
    companyId: z.string().uuid().optional().nullable(),
    isDecisionMaker: z.boolean().optional(),
    assignedTo: z.string().uuid().optional().nullable(), // RBAC: transferência de ownership
  })
  .refine((data) => Object.keys(data).length > 1, {
    message: 'Envie pelo menos um campo para atualizar',
  })

export type UpdateContactInput = z.infer<typeof updateContactSchema>
