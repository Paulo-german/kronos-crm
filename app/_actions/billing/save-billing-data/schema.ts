import { z } from 'zod'

export const saveBillingDataSchema = z.object({
  personType: z.enum(['PJ', 'PF']),
  taxId: z
    .string()
    .min(11, 'CPF/CNPJ inválido')
    .max(14, 'CPF/CNPJ inválido')
    .regex(/^\d+$/, 'Apenas números'),
  legalName: z.string().min(2, 'Nome obrigatório'),
  tradeName: z.string().optional(),

  billingContactName: z.string().min(2, 'Nome do contato obrigatório'),
  billingContactEmail: z.string().email('Email inválido'),
  billingContactPhone: z.string().min(10, 'Telefone inválido'),

  billingZipCode: z.string().min(8, 'CEP inválido').max(8, 'CEP inválido'),
  billingStreet: z.string().min(2, 'Rua obrigatória'),
  billingNumber: z.string().min(1, 'Número obrigatório'),
  billingComplement: z.string().optional(),
  billingNeighborhood: z.string().min(2, 'Bairro obrigatório'),
  billingCity: z.string().min(2, 'Cidade obrigatória'),
  billingState: z.string().length(2, 'UF obrigatória'),
})

export type SaveBillingDataInput = z.infer<typeof saveBillingDataSchema>
