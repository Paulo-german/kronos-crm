# Checkout — Documentação Técnica

Fluxo de checkout multi-etapa para assinaturas do Kronos CRM.
Usa a estratégia **Setup Intent First** recomendada pela Stripe para SaaS.

---

## Visão Geral

O checkout é composto por **3 etapas** sequenciais, cada uma em sua própria rota:

```
/checkout/configure  →  /checkout/register  →  /checkout/payment
     (Step 1)              (Step 2)               (Step 3)
```

O estado do checkout é mantido inteiramente via **query params** (`plan`, `interval`, `seats`), sem necessidade de estado server-side ou sessão.

### Ponto de Entrada

O usuário inicia o checkout a partir da página de billing (`/settings/billing`), clicando no CTA de um plano pago. Isso redireciona para:

```
/org/{slug}/checkout?plan=pro
```

A `page.tsx` raiz do checkout é um redirect automático para `/checkout/configure?plan=pro`.

---

## Layout (`layout.tsx`)

O layout do checkout é compartilhado entre todas as etapas e contém:

- **Header** com logo Kronos e botão "Voltar" para `/settings/billing`
- **Stepper** (`CheckoutStepper`) que indica a etapa atual (Configurar → Cadastro → Pagamento)
- **Grid 2 colunas**: conteúdo principal (formulário) + sidebar com `OrderSummary`

```
┌─────────────────────────────────────────────┐
│  [Logo KRONOS]                    [← Voltar]│
├─────────────────────────────────────────────┤
│           ① Configurar → ② Cadastro → ③ Pagamento           │
├──────────────────────────┬──────────────────┤
│                          │  ┌────────────┐  │
│   Formulário da etapa    │  │  Resumo do │  │
│   atual (children)       │  │   Pedido   │  │
│                          │  └────────────┘  │
└──────────────────────────┴──────────────────┘
```

### OrderSummary (`_components/order-summary.tsx`)

Componente client que lê os query params (`plan`, `interval`, `seats`) e exibe:

- Nome do plano selecionado
- Intervalo de cobrança (Mensal/Anual)
- Quantidade de licenças
- Preço por licença
- Total (com badge de desconto para planos anuais)

O summary é **sticky** na sidebar e se atualiza automaticamente quando os params mudam.

### CheckoutStepper (`_components/checkout-stepper.tsx`)

Componente client que usa `usePathname()` para detectar a etapa atual.
Renderiza os 3 steps com indicadores visuais:

- **Completo**: ícone de check, cor primary
- **Atual**: borda primary, sem preenchimento
- **Futuro**: cor muted, desabilitado

Steps definidos em `_components/checkout-types.ts`:

```ts
export const CHECKOUT_STEPS = [
  { id: 'configure', label: 'Configurar', path: '/checkout/configure' },
  { id: 'register', label: 'Cadastro', path: '/checkout/register' },
  { id: 'payment', label: 'Pagamento', path: '/checkout/payment' },
] as const
```

---

## Step 1: Configurar Plano (`/checkout/configure`)

**Objetivo:** Escolher intervalo de cobrança (mensal/anual) e quantidade de licenças.

### Server Component (`configure/page.tsx`)

1. Valida que o `plan` existe nos query params e não é `free`
2. Verifica RBAC: apenas usuários com role elevada (OWNER/ADMIN) podem acessar
3. Renderiza `ConfigureForm` passando os dados do plano

### Client Component (`configure/_components/configure-form.tsx`)

**Estado:**
- `interval`: `'monthly' | 'annual'` (default: `'monthly'`)
- `seats`: `number` entre 1 e 100 (default: `1`)

**Comportamento:**
- Inicializa estado a partir dos query params (permite deep links)
- Sincroniza estado com a URL via `useEffect` + `router.replace()` (scroll: false)
- O `OrderSummary` no layout reage automaticamente à mudança de params

**UI:**
- Seletor de intervalo: 2 cards clicáveis (Mensal / Anual com badge de desconto)
- O seletor anual só aparece se o plano tiver `annualPrice` e `stripePriceIdAnnual`
- Seletor de seats: botões -/+ com limites MIN_SEATS=1, MAX_SEATS=100
- Botão "Continuar" → navega para `/checkout/register?plan=X&interval=Y&seats=Z`

---

## Step 2: Cadastro de Dados Fiscais (`/checkout/register`)

**Objetivo:** Coletar dados cadastrais/fiscais da organização e sincronizar com o Stripe Customer.

### Server Component (`register/page.tsx`)

1. Valida plano e RBAC (mesmo padrão do step 1)
2. Carrega dados existentes da organização do banco via Prisma (`db.organization.findUniqueOrThrow`)
3. Constrói URLs de navegação:
   - `backUrl` → `/checkout/configure?plan=X`
   - `nextUrl` → `/checkout/payment?plan=X&interval=Y&seats=Z`
4. Renderiza `RegisterForm` com `defaultValues` pré-preenchidos

### Client Component (`register/_components/register-form.tsx`)

**Formulário com React Hook Form + Zod:**

Campos coletados:

| Seção | Campos |
|-------|--------|
| Tipo de Pessoa | `personType` (PJ/PF) |
| Identificação | `taxId` (CPF/CNPJ), `legalName`, `tradeName` (apenas PJ) |
| Contato Financeiro | `billingContactName`, `billingContactEmail`, `billingContactPhone` |
| Endereço | `billingZipCode`, `billingStreet`, `billingNumber`, `billingComplement`, `billingNeighborhood`, `billingCity`, `billingState` |

**Validação Zod (`save-billing-data/schema.ts`):**

```ts
z.object({
  personType: z.enum(['PJ', 'PF']),
  taxId: z.string().min(11).max(14).regex(/^\d+$/),
  legalName: z.string().min(2),
  tradeName: z.string().optional(),
  billingContactName: z.string().min(2),
  billingContactEmail: z.string().email(),
  billingContactPhone: z.string().min(10),
  billingZipCode: z.string().min(8).max(8),
  billingStreet: z.string().min(2),
  billingNumber: z.string().min(1),
  billingComplement: z.string().optional(),
  billingNeighborhood: z.string().min(2),
  billingCity: z.string().min(2),
  billingState: z.string().length(2),
})
```

**Auto-preenchimento de CEP:**
- No `onBlur` do campo CEP, faz fetch para `https://viacep.com.br/ws/{cep}/json/`
- Se encontrado, preenche automaticamente: rua, bairro, cidade, UF
- Campos auto-preenchidos ficam disabled durante o loading

**Submissão:**
- Usa `useAction(saveBillingData)` do `next-safe-action/hooks`
- No sucesso, navega para o step de pagamento (`nextUrl`)
- No erro, exibe toast com mensagem do servidor

### Server Action: `saveBillingData` (`_actions/billing/save-billing-data/index.ts`)

**RBAC:** `requirePermission(canPerformAction(ctx, 'billing', 'create'))`

**Fluxo:**

1. **Salva no banco:** Atualiza a organização com todos os campos de billing via `db.organization.update()`

2. **Sincroniza com Stripe Customer:**
   - Se `stripeCustomerId` já existe: atualiza o Customer existente com `stripe.customers.update()` + tenta criar TaxID se não existir
   - Se não existe: cria novo Customer com `stripe.customers.create()` incluindo `tax_id_data`

3. **Dados enviados ao Stripe:**
   ```ts
   {
     name: legalName,
     email: billingContactEmail,
     phone: billingContactPhone,
     address: {
       line1: "{rua}, {número}",
       line2: complemento,
       city, state, postal_code, country: 'BR'
     },
     preferred_locales: ['pt-BR'],
     metadata: { organizationId, taxId, personType }
   }
   ```

4. **TaxID:** Tipo derivado automaticamente do `personType`:
   - PJ → `br_cnpj`
   - PF → `br_cpf`

**Importância:** Este step é pré-requisito para o Step 3. O `createSetupIntent` no Step 3 assume que o `stripeCustomerId` já existe.

---

## Step 3: Pagamento (`/checkout/payment`)

**Objetivo:** Tokenizar o cartão de crédito via Stripe SetupIntent e criar a assinatura ativa.

### Server Component (`payment/page.tsx`)

1. Valida plano e RBAC
2. Resolve `priceId` baseado no plano e intervalo:
   - `interval === 'annual'` → `selectedPlan.stripePriceIdAnnual`
   - caso contrário → `selectedPlan.stripePriceId`
3. Renderiza `PaymentForm` com `priceId`, `seats`, `orgSlug`, `plan`, `interval`

### Client Component (`payment/_components/payment-form.tsx`)

Este componente tem 2 níveis: `PaymentForm` (wrapper) e `CheckoutPaymentForm` (formulário).

#### PaymentForm (Wrapper)

**Responsabilidade:** Criar o SetupIntent e prover o contexto Stripe Elements.

**Fluxo de inicialização:**

```
Mount → initSetup() → createSetupIntent({}) → setupSecret
                                                    ↓
                                            <Elements clientSecret={setupSecret}>
                                              <CheckoutPaymentForm />
                                            </Elements>
```

1. No mount, chama `createSetupIntent({})` via server action
2. Se sucesso, recebe `setupSecret` (client_secret do SetupIntent)
3. Renderiza `<Elements>` com o secret, configurando:
   - Tema: `stripe`
   - Locale: `pt-BR`
   - BorderRadius: `8px`

**Estados de UI:**
- **Loading:** Spinner centralizado
- **Erro:** Card com mensagem de erro + botão "Tentar novamente" (re-executa `initSetup`)
- **Sucesso:** Renderiza Elements com o formulário de pagamento

#### CheckoutPaymentForm (Formulário)

**Hooks:** `useStripe()`, `useElements()`, `useRouter()`

**Fluxo de submissão (`handleSubmit`):**

```
User submete → confirmSetup() ──→ Sem 3DS: retorna setupIntent
                                │
                                └→ Com 3DS: redirect → /setup-complete (fallback)
                                              ↓
                              Sem redirect: extrai paymentMethodId
                                              ↓
                              createSubscription({ priceId, seats, paymentMethodId })
                                              ↓
                              Sucesso → redirect /settings/billing?success=true
```

1. **`stripe.confirmSetup()`** — Confirma o SetupIntent, validando e tokenizando o cartão
   - `redirect: 'if_required'` — Só redireciona se o banco exigir 3DS com redirect
   - `return_url` — Aponta para `/checkout/payment/setup-complete?plan=X&interval=Y&seats=Z`

2. **Se 3DS sem redirect (maioria dos casos):**
   - Extrai `paymentMethodId` do `setupIntent.payment_method`
   - Chama `createSubscription()` com `{ priceId, seats, paymentMethodId }`
   - Sucesso: toast + redirect para billing page

3. **Se 3DS com redirect (fallback):**
   - O browser é redirecionado para o banco
   - Ao retornar, cai na rota `/checkout/payment/setup-complete` (ver seção abaixo)

4. **Erro de cartão:** Exibe toast com a mensagem do Stripe

### Server Action: `createSetupIntent` (`_actions/billing/create-setup-intent/index.ts`)

**RBAC:** `requirePermission(canPerformAction(ctx, 'billing', 'create'))`

**Fluxo simples:**

1. Busca `stripeCustomerId` da organização
2. Se não existe → lança erro pedindo para voltar ao step anterior (step 2 cria o Customer)
3. Cria SetupIntent no Stripe:
   ```ts
   stripe.setupIntents.create({
     customer: stripeCustomerId,
     payment_method_types: ['card'],
     usage: 'off_session',  // Para cobranças recorrentes
     metadata: { organizationId }
   })
   ```
4. Retorna `{ setupSecret, customerId }`

### Server Action: `createSubscription` (`_actions/billing/create-subscription/index.ts`)

**RBAC:** `requirePermission(canPerformAction(ctx, 'billing', 'create'))`

**Input (Zod):**
```ts
z.object({
  priceId: z.string().min(1),
  seats: z.number().int().min(1).max(100),
  paymentMethodId: z.string().min(1),
})
```

**Fluxo:**

1. Busca `stripeCustomerId` da organização
2. Resolve `productKey` a partir do `priceId` (via env vars)
3. Cria subscription no Stripe:
   ```ts
   stripe.subscriptions.create({
     customer: stripeCustomerId,
     items: [{ price: priceId, quantity: seats }],
     default_payment_method: paymentMethodId,  // Stripe anexa PM ao Customer automaticamente
     expand: ['latest_invoice.payment_intent'],
     metadata: { organizationId, product_key: productKey },
     payment_behavior: 'error_if_incomplete',  // Falha imediatamente se cartão recusado
   })
   ```
4. Trata `StripeCardError` especificamente com mensagem user-friendly
5. Persiste no banco via `db.subscription.upsert()`:
   - `stripeSubscriptionId`, `stripePriceId`, `status`, `currentPeriodEnd`, `cancelAtPeriodEnd`
   - `metadata: { product_key }` — usado pelo RBAC para determinar o plano da organização

**Design decisions:**
- **Sem `paymentMethods.attach` separado:** O Stripe anexa o PM automaticamente via `default_payment_method` na criação da subscription. Se a criação falhar, não sobra PaymentMethod órfão.
- **`payment_behavior: 'error_if_incomplete'`:** A subscription nasce `active` ou lança erro. Nunca fica `incomplete`.
- **`current_period_end`:** Lido de `subscription.items.data[0].current_period_end` (API Stripe v2026-01-28.clover — o campo mudou de localização).

---

## Fallback 3DS (`/checkout/payment/setup-complete`)

**Objetivo:** Completar o fluxo quando o banco exige redirect para autenticação 3D Secure.

### Como funciona

Quando `stripe.confirmSetup()` no client precisa redirecionar para 3DS:

1. Browser vai para o site do banco para autenticação
2. Banco redireciona de volta para `return_url` com `?setup_intent=seti_xxx` nos query params
3. A page `setup-complete` recebe a request e completa o fluxo server-side

### Server Component (`payment/setup-complete/page.tsx`)

**Fluxo:**

```
Stripe redireciona → /setup-complete?setup_intent=seti_xxx&plan=pro&interval=monthly&seats=3
                                          ↓
                      stripe.setupIntents.retrieve(setup_intent)
                                          ↓
                      Valida status === 'succeeded'
                                          ↓
                      Extrai paymentMethodId do SetupIntent
                                          ↓
                      Resolve priceId a partir de plan + interval (mesma lógica do payment/page.tsx)
                                          ↓
                      createSubscription({ priceId, seats, paymentMethodId })
                                          ↓
                      redirect → /settings/billing?success=true
```

**Tratamento de erros com query params:**
- `?error=missing_setup_intent` — Param `setup_intent` ausente
- `?error=setup_failed` — SetupIntent não está em status `succeeded`
- `?error=no_payment_method` — SetupIntent sem PaymentMethod
- `?error=invalid_plan` — Plano inválido ou `free`
- `?error=invalid_price` — PriceId não encontrado para o plano/intervalo
- `?error=subscription_failed` — Falha ao criar a subscription

Todos os erros redirecionam para `/settings/billing?error=xxx`.

---

## Infraestrutura Stripe

### Inicialização do SDK (`_lib/stripe.ts`)

Usa **Proxy pattern** para lazy initialization, evitando erros em build-time quando `STRIPE_SECRET_KEY` não está disponível:

```ts
const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return Reflect.get(getStripe(), prop)  // Instancia na primeira chamada
  },
})
```

API Version: `2026-01-28.clover`

### Utilitários (`_lib/stripe-utils.ts`)

**`getSubscriptionPeriodEnd(subscription)`**
- Extrai `current_period_end` de `subscription.items.data[0]` (localização na API clover)
- Converte de unix timestamp para `Date`

**`resolveProductKeyFromPriceId(priceId)`**
- Mapeia Price IDs das env vars para `product_key` (`'pro'` ou `'enterprise'`)
- Env vars suportadas: `STRIPE_PRO_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`, `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID`
- Fallback: retorna `'pro'`

### Planos (`settings/billing/_components/plans-data.ts`)

Definidos no array `PLANS: PlanInfo[]`:

| ID | Nome | Preço Mensal | Preço Anual | Desconto |
|----|------|-------------|-------------|----------|
| `free` | Gratuito | R$ 0 | — | — |
| `pro` | Pro | R$ 119,90 | R$ 95,92/mês (R$ 1.150,80/ano) | 20% |
| `enterprise` | Empresarial | R$ 199,00 | R$ 159,20/mês (R$ 1.910,40/ano) | 20% |

Cada plano pago tem `stripePriceId` e `stripePriceIdAnnual` vindos de env vars `NEXT_PUBLIC_STRIPE_*`.

---

## Webhook (`/api/webhooks/stripe/route.ts`)

O webhook é o segundo pilar de sincronização (além das ações do checkout). Ele garante que o estado do banco reflita mudanças feitas diretamente no Stripe (portal, renovações automáticas, cancelamentos).

### Eventos Tratados

| Evento | Handler | O que faz |
|--------|---------|-----------|
| `checkout.session.completed` | `handleCheckoutSessionCompleted` | Salva `stripeCustomerId`, cria/atualiza subscription no banco |
| `invoice.payment_succeeded` | `handleInvoicePaymentSucceeded` | Atualiza status para `active` e renova `currentPeriodEnd` |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Sincroniza `status`, `priceId`, `cancelAtPeriodEnd`, `product_key` |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Marca subscription como `canceled` |

### Verificação de Assinatura

Todos os webhooks validam a assinatura da request via `stripe.webhooks.constructEvent()` com `STRIPE_WEBHOOK_SECRET`. Requests inválidas retornam 400.

### Resolução de `product_key` (Webhook)

O webhook usa uma cadeia de fallbacks mais robusta que a action:

1. `subscription.metadata.product_key` (gravado pelo checkout)
2. `stripe.products.retrieve(productId).metadata.product_key` (configurado no dashboard Stripe)
3. Comparação por Price ID via env vars (legado)

### Cache Invalidation

Todos os handlers chamam `revalidateTag(`subscriptions:${organizationId}`)` para invalidar o cache de subscriptions da organização.

### Mapeamento de Status

```
Stripe Status        → DB Status
─────────────────────────────────
active               → active
past_due              → past_due
canceled              → canceled
trialing              → trialing
incomplete            → incomplete
incomplete_expired    → canceled
unpaid                → past_due
paused                → canceled
```

---

## Ações Auxiliares

### `createCheckoutSession` (Legado)

Action que cria uma Checkout Session em modo `embedded` usando `EmbeddedCheckout` do Stripe.
**Nota:** Esta action existe como alternativa ao fluxo Setup Intent First, mas o fluxo principal usa o padrão de 3 steps descrito acima.

### `createPortalSession`

Action que cria uma sessão do Stripe Customer Portal para gerenciamento self-service (atualizar cartão, cancelar, ver faturas).

**RBAC:** `requirePermission(canPerformAction(ctx, 'billing', 'update'))`

Retorna `{ url }` que o front-end abre em nova tab/redirect.

---

## Variáveis de Ambiente

### Server-side

| Variável | Descrição |
|----------|-----------|
| `STRIPE_SECRET_KEY` | Chave secreta da API Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret para validar webhooks |
| `STRIPE_PRO_PRICE_ID` | Price ID do plano Pro (mensal) |
| `STRIPE_ENTERPRISE_PRICE_ID` | Price ID do plano Empresarial (mensal) |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Price ID do plano Pro (anual) |
| `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID` | Price ID do plano Empresarial (anual) |

### Client-side

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave pública para `loadStripe()` |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Price ID público do plano Pro (mensal) |
| `NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID` | Price ID público do plano Pro (anual) |
| `NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID` | Price ID público do plano Empresarial (mensal) |
| `NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID` | Price ID público do plano Empresarial (anual) |

---

## Segurança

### RBAC

Todas as pages do checkout verificam `isElevated(userRole)` — apenas OWNER e ADMIN podem acessar.
Todas as server actions verificam `requirePermission(canPerformAction(ctx, 'billing', 'create'))`.

### Validação de Input

Todas as actions usam `next-safe-action` com schemas Zod para validação de input antes de execução.

### PCI Compliance

O cartão de crédito **nunca** passa pelo nosso servidor. O Stripe Elements (`PaymentElement`) captura os dados diretamente no iframe do Stripe. O server só recebe o `paymentMethodId` (token).

### Webhook Security

O webhook valida a assinatura criptográfica de toda request usando `STRIPE_WEBHOOK_SECRET`.

---

## Mapa de Arquivos

```
checkout/
├── README.md                          # Esta documentação
├── layout.tsx                         # Layout compartilhado (header, stepper, summary)
├── page.tsx                           # Redirect → /configure?plan=X
│
├── _components/
│   ├── checkout-types.ts              # Types: PlanInterval, CheckoutSearchParams, CHECKOUT_STEPS
│   ├── checkout-stepper.tsx           # Componente visual do stepper (3 etapas)
│   ├── checkout-form.tsx              # EmbeddedCheckout (alternativa legada)
│   └── order-summary.tsx              # Sidebar com resumo do pedido
│
├── configure/                         # Step 1: Configurar plano
│   ├── page.tsx                       # Server component (validação, RBAC)
│   └── _components/
│       └── configure-form.tsx         # Client form (intervalo, seats)
│
├── register/                          # Step 2: Dados cadastrais
│   ├── page.tsx                       # Server component (pré-preenche dados)
│   └── _components/
│       └── register-form.tsx          # Client form (RHF + Zod + CEP auto-fill)
│
└── payment/                           # Step 3: Pagamento
    ├── page.tsx                       # Server component (resolve priceId)
    ├── _components/
    │   └── payment-form.tsx           # Client form (Stripe Elements + SetupIntent)
    └── setup-complete/
        └── page.tsx                   # Fallback pós-3DS redirect

_actions/billing/
├── create-setup-intent/               # Cria SetupIntent para tokenizar cartão
│   ├── index.ts
│   └── schema.ts
├── create-subscription/               # Cria subscription com PM validado
│   ├── index.ts
│   └── schema.ts
├── save-billing-data/                 # Salva dados fiscais + sync Stripe Customer
│   ├── index.ts
│   └── schema.ts
├── create-checkout-session/           # Checkout Session (modo embedded, legado)
│   ├── index.ts
│   └── schema.ts
└── create-portal-session/             # Stripe Customer Portal
    ├── index.ts
    └── schema.ts

_lib/
├── stripe.ts                          # SDK Stripe com lazy init (Proxy)
└── stripe-utils.ts                    # Helpers: getSubscriptionPeriodEnd, resolveProductKeyFromPriceId

api/webhooks/stripe/
└── route.ts                           # Webhook handler (checkout.completed, invoice.paid, sub.updated/deleted)
```

---

## Diagramas de Sequência

### Fluxo Normal (sem 3DS redirect)

```
Browser                    Server Actions                Stripe API              Database
  │                              │                           │                      │
  ├─ GET /configure ────────────►│                           │                      │
  │◄── Render form ──────────────│                           │                      │
  │                              │                           │                      │
  ├─ Seleciona plano/seats ──────│                           │                      │
  ├─ Click "Continuar" ─────────►│                           │                      │
  │                              │                           │                      │
  ├─ GET /register ─────────────►│                           │                      │
  │◄── Form pré-preenchido ──────│◄──────────────────────────┤◄─ org billing data ──│
  │                              │                           │                      │
  ├─ Preenche dados fiscais ─────│                           │                      │
  ├─ Submit ────────────────────►│ saveBillingData()          │                      │
  │                              ├──────────────────────────►│ customers.create/    │
  │                              │                           │ update + taxId       │
  │                              ├─────────────────────────────────────────────────►│
  │                              │                           │  org.update()        │
  │◄── Redirect /payment ───────│                           │                      │
  │                              │                           │                      │
  ├─ GET /payment ──────────────►│                           │                      │
  │  (mount PaymentForm)         │                           │                      │
  │  ├─ createSetupIntent() ────►│                           │                      │
  │  │                           ├──────────────────────────►│ setupIntents.create  │
  │  │◄── setupSecret ──────────│◄──────────────────────────│                      │
  │  │                           │                           │                      │
  │  ├─ Render PaymentElement    │                           │                      │
  │  │  (Stripe iframe)          │                           │                      │
  │  │                           │                           │                      │
  │  ├─ User digita cartão ──────│                           │                      │
  │  ├─ Submit ─────────────────────────────────────────────►│ confirmSetup()       │
  │  │◄── setupIntent (success) ─────────────────────────────│                      │
  │  │                           │                           │                      │
  │  ├─ createSubscription() ───►│                           │                      │
  │  │                           ├──────────────────────────►│ subscriptions.create │
  │  │                           │◄──────────────────────────│ (status: active)     │
  │  │                           ├─────────────────────────────────────────────────►│
  │  │                           │                           │  subscription.upsert │
  │  │◄── success ──────────────│                           │                      │
  │  │                           │                           │                      │
  ├─ Redirect /billing?success ──│                           │                      │
  │                              │                           │                      │
```

### Fluxo com 3DS Redirect

```
Browser                    Server Actions                Stripe API              Database
  │                              │                           │                      │
  │  ├─ Submit ─────────────────────────────────────────────►│ confirmSetup()       │
  │  │                           │                           │                      │
  │  │◄── redirect required ─────────────────────────────────│                      │
  │  │                           │                           │                      │
  ├─ Redirect → Banco 3DS ──────────────────────────────────►│                      │
  │  (autenticação no banco)     │                           │                      │
  │◄── Redirect return_url ──────────────────────────────────│                      │
  │                              │                           │                      │
  ├─ GET /setup-complete ───────►│                           │                      │
  │  ?setup_intent=seti_xxx      │                           │                      │
  │  &plan=pro&interval=monthly  │                           │                      │
  │  &seats=3                    │                           │                      │
  │                              ├──────────────────────────►│ setupIntents.retrieve│
  │                              │◄──────────────────────────│ (status: succeeded)  │
  │                              │                           │                      │
  │                              │ createSubscription()      │                      │
  │                              ├──────────────────────────►│ subscriptions.create │
  │                              ├─────────────────────────────────────────────────►│
  │                              │                           │  subscription.upsert │
  │◄── Redirect /billing?success │                           │                      │
  │                              │                           │                      │
```

---

## Por que Setup Intent First?

Comparação com a alternativa `PaymentIntent` (criado automaticamente pela Stripe ao criar subscription com `payment_behavior: 'default_incomplete'`):

| Aspecto | Setup Intent First (atual) | PaymentIntent automático |
|---------|---------------------------|--------------------------|
| Validação do cartão | Antes de criar a subscription | Durante a criação da subscription |
| Estado da subscription | Nasce `active` ou falha | Pode ficar `incomplete` |
| Race conditions | Nenhuma | Possível se webhook chega antes do confirm |
| PaymentMethods órfãos | Não (attach é atômico) | Possível se flow é abandonado |
| Complexidade do webhook | Menor (subscription já nasce completa) | Maior (precisa tratar `incomplete`) |
| 3DS | Tratado no SetupIntent (antes da sub) | Tratado no PaymentIntent (durante a sub) |
