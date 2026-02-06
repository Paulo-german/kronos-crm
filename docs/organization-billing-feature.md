# Feature: Dados Cadastrais da Organização

## Visão Geral

Esta feature implementa uma tela completa de "Dados Cadastrais" para organizações, suportando tanto Pessoa Jurídica (PJ) quanto Pessoa Física (PF), com campos dinâmicos, máscaras de input e integração com a API ViaCEP para busca automática de endereços.

---

## Helpers de Formatação

**Arquivo:** `app/_lib/utils.ts`

Foram adicionados helpers reutilizáveis para formatação e limpeza de dados:

### Formatters (para exibição)

| Helper | Input | Output | Uso |
|--------|-------|--------|-----|
| `formatCnpj` | `12345678000190` | `12.345.678/0001-90` | Tabelas, cards |
| `formatCpf` | `12345678901` | `123.456.789-01` | Tabelas, cards |
| `formatCep` | `01310100` | `01310-100` | Endereços |
| `formatPhone` | `11999998888` | `(11) 99999-8888` | Contatos |
| `formatDate` | `Date \| string` | `6 de fevereiro de 2026` | Datas por extenso |
| `formatDateShort` | `Date \| string` | `06/02/2026` | Datas curtas |
| `formatDateTime` | `Date \| string` | `6 de fevereiro de 2026 às 14:30` | Timestamps |

### Cleaners (para persistência)

| Helper | Descrição |
|--------|-----------|
| `onlyNumbers` | Remove todos os caracteres não numéricos |

**Por que separar formatters de componentes de input?**
- **Componentes** (CnpjInput, etc.): Para entrada de dados com máscara em tempo real
- **Helpers** (formatCnpj, etc.): Para exibir dados já salvos em tabelas, cards, exports

---

## Arquitetura da Implementação

### 1. Schema do Banco de Dados

**Arquivo:** `prisma/schema.prisma`

#### Enum PersonType

```prisma
enum PersonType {
  PJ // Pessoa Jurídica
  PF // Pessoa Física
}
```

**Por que um enum?**
- Garante integridade de dados no banco
- Evita valores inválidos (typos como "pj" ou "CNPJ")
- Facilita validação no Prisma e no TypeScript
- Permite extensão futura (ex: adicionar "EI" para Empresário Individual)

#### Novos Campos na Organization

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `personType` | `PersonType?` | Determina se é PJ ou PF, controla campos condicionais |
| `taxId` | `String?` | CNPJ (14 dígitos) ou CPF (11 dígitos), armazenado sem máscara |
| `legalName` | `String?` | Razão Social (PJ) ou Nome Completo (PF) |
| `tradeName` | `String?` | Nome Fantasia - apenas para PJ |
| `isSimples` | `Boolean` | Optante pelo Simples Nacional - apenas para PJ |
| `billingContact*` | `String?` | Dados do responsável financeiro |
| `billing*` | `String?` | Campos de endereço para faturamento |

**Por que campos nullable?**
- Plano FREE não exige dados cadastrais completos
- Permite cadastro progressivo (usuário pode preencher depois)
- Evita bloqueio de funcionalidades básicas

**Por que armazenar taxId sem máscara?**
- Facilita validação (apenas contar dígitos)
- Evita inconsistências de formatação
- Menor ocupação de espaço
- Formatação é responsabilidade da camada de apresentação

---

### 2. Validação com Zod

**Arquivo:** `app/_actions/organization/update-organization/schema.ts`

#### Validação Condicional

```typescript
.superRefine((data, ctx) => {
  if (data.personType && data.taxId && data.taxId.length > 0) {
    if (data.personType === 'PJ' && data.taxId.length !== 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CNPJ deve ter 14 dígitos',
        path: ['taxId'],
      })
    }
    // ...
  }
})
```

**Por que `superRefine` ao invés de `refine`?**
- Permite adicionar múltiplos erros de validação
- Acesso ao contexto (`ctx`) para erros customizados
- Pode especificar o `path` exato do campo com erro
- Melhor UX: mostra erro no campo correto, não no formulário inteiro

#### Campos com `.or(z.literal(''))`

```typescript
billingContactEmail: z
  .string()
  .email('Email inválido')
  .nullable()
  .optional()
  .or(z.literal(''))
```

**Por que essa abordagem?**
- Inputs HTML enviam string vazia `""` quando vazios, não `null`
- `.email()` falha para string vazia
- `.or(z.literal(''))` aceita string vazia como válida
- Evita erros de validação em campos opcionais não preenchidos

---

### 3. Server Action

**Arquivo:** `app/_actions/organization/update-organization/index.ts`

#### Limpeza de Campos PJ-only

```typescript
const isPF = personType === 'PF'

await db.organization.update({
  data: {
    tradeName: isPF ? null : (tradeName || null),
    isSimples: isPF ? false : (isSimples ?? false),
    // ...
  },
})
```

**Por que limpar campos quando muda para PF?**
- Consistência de dados: PF não tem Nome Fantasia nem Simples Nacional
- Evita dados órfãos no banco
- Se usuário mudar de PJ para PF e voltar para PJ, começa limpo
- Previne confusão em relatórios e exportações

#### Invalidação de Cache

```typescript
revalidateTag(`organization:${org.slug}`)
revalidateTag(`user-orgs:${ctx.userId}`)
```

**Por que duas tags?**
- `organization:${slug}`: Invalida cache da página de settings
- `user-orgs:${userId}`: Invalida lista de organizações do usuário (nome pode ter mudado)

---

### 4. Data Access Layer

**Arquivo:** `app/_data-access/organization/get-organization-by-slug.ts`

#### Select Explícito

```typescript
select: {
  id: true,
  name: true,
  // ... todos os campos listados
}
```

**Por que não usar `select: undefined` (todos os campos)?**
- Performance: traz apenas dados necessários
- Segurança: evita expor campos sensíveis acidentalmente
- Tipagem: TypeScript infere o tipo exato do retorno
- Documentação: fica claro quais dados a tela precisa

---

### 5. Componentes de Máscara

**Arquivos:**
- `app/_components/form-controls/cnpj-input.tsx`
- `app/_components/form-controls/cpf-input.tsx`
- `app/_components/form-controls/cep-input.tsx`

#### Padrão com react-number-format

```typescript
const CnpjInput = forwardRef<HTMLInputElement, CnpjInputProps>(
  ({ className, ...props }, ref) => {
    const format = (value: string) => {
      const numbers = value.replace(/\D/g, '')
      const limited = numbers.substring(0, 14)
      // ... formatação
    }

    return (
      <NumberFormatBase
        getInputRef={ref}
        format={format}
        customInput={Input}
        // ...
      />
    )
  },
)
```

**Por que `NumberFormatBase` ao invés de `PatternFormat`?**
- Controle total sobre a lógica de formatação
- Suporta inputs de tamanho variável (telefone fixo vs celular)
- Evita bugs com máscaras rígidas
- Consistente com o `phone-input.tsx` já existente no projeto

**Por que `forwardRef`?**
- Permite que React Hook Form acesse o input nativo
- Necessário para `focus()`, `blur()`, validação nativa
- Padrão de composição do React para inputs customizados

**Por que limitar caracteres na função `format`?**
```typescript
const limited = numbers.substring(0, 14) // CNPJ = 14 dígitos
```
- Previne overflow visual
- Evita dados inválidos antes mesmo de chegar no Zod
- Melhor UX: usuário não consegue digitar mais que o permitido

---

### 6. Hook de Busca CEP

**Arquivo:** `app/_hooks/use-cep-lookup.ts`

#### Estrutura do Hook

```typescript
export function useCepLookup(): UseCepLookupReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookup = useCallback(async (cep: string) => {
    // ...
  }, [])

  return { lookup, isLoading, error }
}
```

**Por que um hook customizado?**
- Encapsula lógica de loading e error
- Reutilizável em outros formulários
- Separa responsabilidades (formulário não sabe como buscar CEP)
- Testável isoladamente

**Por que `useCallback` no `lookup`?**
- Evita recriação da função a cada render
- Necessário para usar em `useEffect` ou passar como prop
- Boa prática para funções que fazem fetch

#### Escolha da API ViaCEP

```typescript
const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
```

**Por que ViaCEP?**
- Gratuita e sem limite de requisições
- Não requer autenticação
- Resposta rápida e confiável
- Cobre 100% dos CEPs brasileiros
- Retorna dados estruturados (logradouro, bairro, cidade, UF)

---

### 7. Constantes de Estados

**Arquivo:** `app/_constants/brazilian-states.ts`

```typescript
export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  // ...
] as const

export type BrazilianStateValue = (typeof BRAZILIAN_STATES)[number]['value']
```

**Por que `as const`?**
- Transforma o array em tupla readonly
- Permite inferir tipos literais ('AC', 'AL', etc.)
- Habilita o type helper `BrazilianStateValue`
- Previne modificação acidental do array

**Por que exportar o type?**
- Permite tipar props e estados em outros componentes
- Validação em tempo de compilação
- Autocomplete no editor

---

### 8. Formulário Principal

**Arquivo:** `app/(authenticated)/org/[orgSlug]/settings/organization/_components/organization-settings-form.tsx`

#### Campos Condicionais com useWatch

```typescript
const personType = useWatch({ control: form.control, name: 'personType' })
const isPJ = personType === 'PJ'
const isPF = personType === 'PF'

// No JSX:
{(isPJ || isPF) && (
  <>
    {/* Campos de CNPJ/CPF */}
    {isPJ && (
      <>
        {/* Campos exclusivos de PJ */}
      </>
    )}
  </>
)}
```

**Por que `useWatch` ao invés de `watch`?**
- `useWatch` é otimizado para re-renders isolados
- `watch` causa re-render do formulário inteiro
- Melhor performance em formulários grandes
- Mesma API, mas mais eficiente

#### Merge de Refs

```typescript
<Input
  {...field}
  ref={(el) => {
    field.ref(el)
    numberInputRef.current = el
  }}
/>
```

**Por que esse padrão?**
- React Hook Form precisa do ref para validação
- Nosso código precisa do ref para `focus()` após busca CEP
- Não é possível passar dois `ref` props
- Callback ref permite registrar em ambos

#### Limpeza de Máscaras no Submit

```typescript
const onSubmit = (data: UpdateOrganizationInput) => {
  const cleanData = {
    ...data,
    taxId: data.taxId?.replace(/\D/g, '') || null,
    billingContactPhone: data.billingContactPhone?.replace(/\D/g, '') || null,
    billingZipCode: data.billingZipCode?.replace(/\D/g, '') || null,
  }
  execute(cleanData)
}
```

**Por que limpar no submit e não no servidor?**
- Servidor não deve assumir formato do input
- Validação Zod espera apenas dígitos
- Mantém consistência: mesma lógica de limpeza para todos os campos
- Debugar é mais fácil (console.log no cliente)

#### Botão Sticky

```typescript
<div className="bg-background sticky bottom-0 border-t py-4">
  <Button disabled={isPending || !form.formState.isDirty}>
    Salvar alterações
  </Button>
</div>
```

**Por que sticky?**
- Formulário é longo (4 cards)
- Usuário não precisa scrollar até o final para salvar
- Padrão comum em configurações (Stripe, GitHub, etc.)
- `isDirty` previne submits desnecessários

---

## Fluxo de Dados

```
┌─────────────────┐
│   Formulário    │
│  (React Hook    │
│     Form)       │
└────────┬────────┘
         │ onSubmit
         ▼
┌─────────────────┐
│  Limpa máscaras │
│  (replace /\D/) │
└────────┬────────┘
         │ execute()
         ▼
┌─────────────────┐
│  Server Action  │
│  (next-safe-    │
│    action)      │
└────────┬────────┘
         │ Zod validation
         ▼
┌─────────────────┐
│    Prisma       │
│   (update)      │
└────────┬────────┘
         │ revalidateTag
         ▼
┌─────────────────┐
│  Cache Next.js  │
│  (invalidado)   │
└─────────────────┘
```

---

## Decisões de UX

| Decisão | Motivo |
|---------|--------|
| Campos PJ-only ocultos por padrão | Evita confusão inicial |
| Busca CEP automática no blur | Menos cliques, mais fluidez |
| Botão "Buscar" visível | Affordance para usuários que não percebem o auto-fill |
| Focus no "Número" após CEP | Próximo campo que precisa de input manual |
| Toast de sucesso/erro | Feedback claro da operação |
| Desabilitar salvar se não mudou nada | Evita requests desnecessários |

---

## Possíveis Melhorias Futuras

1. **Validação de CNPJ/CPF real** - Implementar algoritmo de dígitos verificadores
2. **Consulta CNPJ na Receita** - Auto-preencher Razão Social e endereço
3. **Histórico de alterações** - Audit log para compliance
4. **Campos obrigatórios por plano** - PRO/Enterprise exigem dados completos
5. **Exportação de NF-e** - Usar dados cadastrais para emissão
