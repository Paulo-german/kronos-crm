import { z } from 'zod'

export const personTypeEnum = z.enum(['PJ', 'PF'])

export const updateOrganizationSchema = z
  .object({
    // Informações Básicas
    name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),

    // Dados Cadastrais
    personType: personTypeEnum.nullable().optional(),
    taxId: z
      .string()
      .regex(/^\d*$/, 'Apenas números são permitidos')
      .nullable()
      .optional(),
    legalName: z.string().max(200, 'Nome muito longo').nullable().optional(),
    tradeName: z.string().max(200, 'Nome muito longo').nullable().optional(),
    isSimples: z.boolean().optional(),

    // Contato Financeiro
    billingContactName: z
      .string()
      .max(100, 'Nome muito longo')
      .nullable()
      .optional(),
    billingContactEmail: z
      .string()
      .email('Email inválido')
      .nullable()
      .optional()
      .or(z.literal('')),
    billingContactPhone: z
      .string()
      .regex(/^\d*$/, 'Apenas números são permitidos')
      .max(11, 'Telefone inválido')
      .nullable()
      .optional(),

    // Endereço de Faturamento
    billingZipCode: z
      .string()
      .regex(/^\d{8}$/, 'CEP deve ter 8 dígitos')
      .nullable()
      .optional()
      .or(z.literal('')),
    billingStreet: z.string().max(200, 'Endereço muito longo').nullable().optional(),
    billingNumber: z.string().max(20, 'Número muito longo').nullable().optional(),
    billingComplement: z
      .string()
      .max(100, 'Complemento muito longo')
      .nullable()
      .optional(),
    billingNeighborhood: z.string().max(100, 'Bairro muito longo').nullable().optional(),
    billingCity: z.string().max(100, 'Cidade muito longa').nullable().optional(),
    billingState: z.string().max(2, 'Use a sigla do estado').nullable().optional(),
    billingCountry: z.string().max(2, 'Use a sigla do país').nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Validação condicional: CNPJ (14 dígitos) para PJ, CPF (11 dígitos) para PF
    if (data.personType && data.taxId && data.taxId.length > 0) {
      if (data.personType === 'PJ' && data.taxId.length !== 14) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CNPJ deve ter 14 dígitos',
          path: ['taxId'],
        })
      }
      if (data.personType === 'PF' && data.taxId.length !== 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CPF deve ter 11 dígitos',
          path: ['taxId'],
        })
      }
    }
  })

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
