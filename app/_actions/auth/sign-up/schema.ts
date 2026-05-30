import { z } from 'zod'
import { BLUEPRINTS } from '@/_lib/onboarding/blueprints'

const SIGNUP_NICHE_KEYS = BLUEPRINTS
  .filter((blueprint) => blueprint.key !== 'ai_generated')
  .map((blueprint) => blueprint.key) as [string, ...string[]]

export const passwordRules = [
  { label: 'Mínimo de 8 caracteres', regex: /.{8,}/ },
  { label: 'Uma letra maiúscula', regex: /[A-Z]/ },
  { label: 'Uma letra minúscula', regex: /[a-z]/ },
  { label: 'Um número', regex: /[0-9]/ },
  { label: 'Um caractere especial', regex: /[\W_]/ },
]

const BLOCKED_COMPANY_NAMES = [
  'teste',
  'test',
  'testing',
  'pessoal',
  'particular',
  'empresa',
  'minha empresa',
  'company',
  'negocio',
  'negócio',
  'meu negocio',
  'meu negócio',
  'loja',
  'oi',
  'aaa',
  'asdf',
  'qwerty',
  'abc',
  '123',
  'exemplo',
  'example',
]

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(4, 'Você precisa preencher seu nome completo')
    .refine(
      (val) => val.trim().split(/\s+/).length >= 2,
      'Informe seu nome e sobrenome',
    )
    .refine(
      (val) => /^[a-zA-ZÀ-ÿ\s''-]+$/.test(val.trim()),
      'O nome não pode conter números ou caracteres especiais',
    ),
  companyName: z
    .string()
    .trim()
    .min(2, 'Nome da empresa é obrigatório')
    .max(100, 'Nome muito longo')
    .refine(
      (val) => !BLOCKED_COMPANY_NAMES.includes(val.toLowerCase().trim()),
      'Use o nome real da sua empresa',
    ),
  websiteOrInstagram: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        const isUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#]\S*)?$/.test(val)
        const isInstagram =
          /^(https?:\/\/)?(www\.)?instagram\.com\/[\w.]+\/?$/.test(val) ||
          /^@?[\w.][\w.]{2,}$/.test(val)
        return isUrl || isInstagram
      },
      'Informe um site válido ou perfil do Instagram (@usuario)',
    ),
  phone: z.string().min(10, 'Telefone inválido').max(20, 'Telefone muito longo'),
  niche: z.enum(SIGNUP_NICHE_KEYS, { message: 'Selecione um segmento' }),
  email: z.string().email('Por favor, insira um e-mail válido'),
  password: passwordRules.reduce(
    (schema, rule) =>
      schema.refine((val) => rule.regex.test(val), { message: rule.label }),
    z.string(),
  ),
  captchaToken: z.string().min(1, 'Token de verificação é obrigatório'),
})

export type SignUpSchema = z.infer<typeof signUpSchema>

export const signUpFormSchema = signUpSchema.omit({ captchaToken: true })
export type SignUpFormSchema = z.infer<typeof signUpFormSchema>
