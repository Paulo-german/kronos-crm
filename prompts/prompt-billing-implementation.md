## Identidade

Você é um Engenheiro de Software Senior especialista em integrações de Pagamento (Stripe) e Next.js App Router.

## Contexto

O Schema do banco de dados (Prisma) já foi refatorado. Agora, a tabela `Subscription` é a fonte da verdade e está vinculada à `Organization`.
Precisamos implementar o "Motor de Billing" que conecta o Kronos CRM ao Stripe.

## Objetivo

Implementar a infraestrutura de backend (SDK, Webhooks) e a interface de Checkout Customizado (Embedded Checkout), separando a visualização de planos da tela de pagamento.

## Estrutura de Rotas (Padrão de Mercado)

Seguindo a solicitação, dividiremos a experiência em duas etapas:

1.  **Vitrine (`/org/[slug]/settings/billing`):** Exibe detalhes da assinatura atual e cards comparativos dos planos (Free vs Pro). Botão "Assinar Pro" redireciona para o checkout.
2.  **Checkout Dedicado (`/org/[slug]/checkout`):** Rota focada ("Page Shield") onde ocorre o pagamento. Contém o resumo do pedido e o `PaymentElement` do Stripe.

## Tarefas de Implementação

### 1. Infraestrutura Stripe (Backend)

- Instalar `stripe` (`pnpm add stripe`).
- Criar `app/_lib/stripe.ts`: Singleton para inicializar a SDK.
- Configurar variáveis de ambiente (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).

### 2. Webhook Handler (Crítico)

Criar a rota de API `app/api/webhooks/stripe/route.ts` para ouvir eventos e sincronizar o banco:

- **Eventos:**
  - `checkout.session.completed`: (Fallback) Garantia de criação.
  - `invoice.payment_succeeded`: Principal evento para B2B. Atualiza `currentPeriodEnd` e status para `active`.
  - `customer.subscription.updated`: Trata upgrades/downgrades.
  - `customer.subscription.deleted`: Marca como `canceled` no banco.
- **Lógica de Identificação do Produto (Clean Arch):**
  - Ao processar a subscription, o código deve buscar o `product_key`.
  - **Prioridade 1:** Ler `metadata.product_key` direto da Subscription (se gravado no checkout).
  - **Prioridade 2:** Se não tiver, buscar o Produto no Stripe (`stripe.products.retrieve(price.product)`) e ler o `metadata.product_key` de lá.
  - **Fallback:** Apenas se falhar os acima, usar a lógica de comparação de Price ID via env vars.
- **Log:** Deve logar erros de sincronização para debug.

### 3. Server Action: Criar Sessão/Intent

Criar `app/_actions/billing/create-checkout-session.ts`:

- **Input:** `priceId` (Pro/Enterprise).
- **Lógica:**
  1. Verifica se a Org já tem stripeCustomerId (se não, cria no Stripe e salva na Org).
  2. Cria uma Checkout Session do Stripe (mode: subscription).
  3. Passa `metadata: { organizationId, product_key }`.
  4. Retorna o `clientSecret` da sessão para o Embedded Checkout.

### 4. Página de Checkout (`/org/[slug]/checkout/page.tsx`)

- Deve ser uma página limpa (sem sidebar/header complexos, foco na conversão).
- Recebe `plan` via query param (ex: `?plan=pro`).
- Usa a Server Action acima para pegar o `clientSecret`.
- Renderiza o `<EmbeddedCheckoutProvider>` e `<EmbeddedCheckout>` do pacote `@stripe/react-stripe-js`.
- **Sucesso:** Redireciona para `/org/[slug]/settings/billing?success=true`.

### 5. Configuração no Stripe (Mock)

- Como estamos em dev, instrua a criação de um Produto "Kronos CRM Pro" no Dashboard de Teste do Stripe para obter um `price_ID` válido para teste.

## Requisitos Técnicos

- **Segurança:** A rota de checkout deve ser protegida (apenas `OWNER` ou `ADMIN` da org podem acessar).
- **Robustez:** O Webhook deve ser idempotente (tratar o mesmo evento 2x sem quebrar).
- **Stack:** Next.js 15, Stripe SDK, Prisma, Tailwind/Shadcn.

### 6. Requisitos Críticos de Código (Arquitetura)

IMPORTANTE: Todo código de backend (Server Actions e Webhooks) DEVE seguir estritamente o `Server Action Pattern` definido na arquitetura:

- **Library:** Use `next-safe-action` (`orgActionClient`) para TODAS as actions de billing.
- **Validação:** Use `zod` para validar inputs (ex: `priceId`, `orgId`).
- **Segurança (RBAC):**
  - **Obrigatório:** Verifique permissão no início da action: `requirePermission(canPerformAction(ctx, 'billing', 'manage'))`.
  - **Isolamento:** Sempre use `ctx.orgId` para queries no banco. Nunca confie em IDs vindos do client sem validar que pertencem à org do contexto.
- **Cache Tags:** Use `revalidateTag` (`organization:[id]`, `subscriptions:[id]`) após mutações.

### 7. O Que NÃO Fazer

- Não criar lógica de "Cartão de Crédito" manual (inputs HTML). Use o componente oficial do Stripe.
