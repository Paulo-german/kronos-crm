import { z } from 'zod'

// Modo "buscar existente": usuário seleciona contato via combobox
const existingContactSchema = z.object({
  contactMode: z.literal('existing'),
  contactId: z.string().uuid('ID do contato inválido').optional(),
})

// Modo "criar novo": usuário preenche campos inline
const newContactSchema = z.object({
  contactMode: z.literal('new'),
  contactName: z.string().trim().min(1, 'Nome do contato é obrigatório'),
  contactEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
})

// Campos base compartilhados por ambos os modos
const dealBaseSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  stageId: z.string().uuid('ID da etapa inválido'),
  companyId: z.string().uuid('ID da empresa inválido').optional().nullable(),
  expectedCloseDate: z.date().optional(),
  assignedTo: z.string().uuid().optional().nullable(),
})

// Schema principal da action: intersection garante que os campos base sempre existam
export const createDealWithContactSchema = z.intersection(
  dealBaseSchema,
  z.discriminatedUnion('contactMode', [existingContactSchema, newContactSchema]),
)

export type CreateDealWithContactInput = z.infer<typeof createDealWithContactSchema>

// Schema do formulário client-side: sem uuid rígido (stageId pode vir como string plain
// do <Select>), e inclui campos "fantasmas" do outro modo como optional para que o RHF
// não jogue fora os valores ao trocar de aba — evita reset indesejado no discriminatedUnion.
export const dealWithContactFormSchema = z.intersection(
  z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    stageId: z.string().min(1, 'Etapa é obrigatória'),
    companyId: z.string().optional(),
    expectedCloseDate: z.date().optional(),
    assignedTo: z.string().optional(),
  }),
  z.discriminatedUnion('contactMode', [
    z.object({
      contactMode: z.literal('existing'),
      contactId: z.string().optional(),
      // Campos do outro modo presentes, mas não validados neste branch
      contactName: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
    }),
    z.object({
      contactMode: z.literal('new'),
      contactName: z.string().min(1, 'Nome do contato é obrigatório'),
      contactEmail: z.string().email('Email inválido').optional().or(z.literal('')),
      contactPhone: z.string().optional(),
      // Campo do outro modo presente, mas não validado neste branch
      contactId: z.string().optional(),
    }),
  ]),
)

export type DealWithContactFormInput = z.infer<typeof dealWithContactFormSchema>
