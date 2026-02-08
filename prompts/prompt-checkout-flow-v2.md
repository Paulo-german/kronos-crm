## Identidade

Você é um Engenheiro de Frontend Senior e Especialista em UX de SaaS (Next.js 15).

## Contexto

O sistema de billing (backend) já está estruturado. Agora precisamos implementar um **Fluxo de Checkout Multi-Etapa (Funnel)** similar ao do RD Station/SaaS B2B modernos, onde o usuário configura o plano, preenche dados da empresa e paga.

## Objetivo

Implementar a nova rota de Checkout com 3 passos visuais, substituindo a página de checkout simples anterior.

## Estrutura de Rotas (Checkout Funnel)

O fluxo deve rodar em um layout dedicado (sem sidebar, focado em conversão).

### Layout: `app/(authenticated)/org/[orgSlug]/checkout/layout.tsx`

- **Visual:** Header minimalista (Logo Kronos apenas).
- **Componente:** `CheckoutStepper` (Barra de progresso: "Configurar" > "Dados Cadastrais" > "Pagamento").

### Passo 1: Configuração (`/checkout/configure`)

**Objetivo:** Usuário define O QUE quer comprar.

```text
+---------------------------------------------------------------+
|  [ KRONOS ]                                                   |
|                                                               |
|  1. Escolher Plano  >  2. Cadastro  >  3. Pagamento           |
|  [===========]         [.........]     [.........]            |
|                                                               |
|  +---------------------------+    +-----------------------+   |
|  | Configurar Assinatura     |    | Resumo do Pedido      |   |
|  |                           |    |                       |   |
|  | Plano: PRO                |    | Plano Pro    R$ 99,00 |   |
|  | [ Switch: Mês | Ano ]     |    | 3 Usuários   R$ 87,00 |   |
|  |                           |    |                       |   |
|  | Quantidade de Usuários:   |    | Total        R$186,00 |   |
|  | [ - ]  3  [ + ]           |    |                       |   |
|  |                           |    +-----------------------+   |
|  | [ CONTINUAR CADASTRO > ]  |                            |   |
|  +---------------------------+                            |   |
+---------------------------------------------------------------+
```

- **Entrada:** Recebe `?plan=pro` via URL.
- **UI:**
  - Card resumo do plano escolhido.
  - **Toggle:** Mensal / Anual (Switch visível com badge de desconto).
  - **Counter:** Input de Número de Usuários (Seats).
  - **Resumo (Direita):** Card fixo estilo "Carrinho de Compras" mostrando Subtotal e Total.
  - **Botão:** "Continuar para Cadastro" -> Vai para o passo 2.

### Passo 2: Cadastro (`/checkout/register`)

**Objetivo:** Coletar dados fiscais (Obrigatório para NFe).

```text
+---------------------------------------------------------------+
|  1. Escolher Plano  >  2. Cadastro  >  3. Pagamento           |
|  [===========]         [=========]     [.........]            |
|                                                               |
|  +---------------------------+    +-----------------------+   |
|  | Dados da Empresa          |    | Resumo do Pedido      |   |
|  |                           |    |                       |   |
|  | [ CPF ] [ CNPJ ]          |    | Plano Pro    R$ 99,00 |   |
|  |                           |    | ...                   |   |
|  | CNPJ: [__.___.___/____]   |    |                       |   |
|  | Razão: [ Acme Corp ]      |    | Total        R$186,00 |   |
|  | Endereço: [ Rua X... ]    |    |                       |   |
|  |                           |    +-----------------------+   |
|  | [ IR PARA PAGAMENTO > ]   |                            |   |
|  +---------------------------+                            |   |
+---------------------------------------------------------------+
```

- **UI:** Formulário `OrganizationForm` (Pessoa Física ou Jurídica).
- **Campos:** CPF/CNPJ, Razão Social, Endereço Completo, Email Financeiro.
- **Ação:** Ao clicar "Ir para Pagamento":
  1. Salva os dados na `Organization` (DB).
  2. Sincroniza/Atualiza o `Stripe Customer` via API (Server Action `updateBillingDetails`).
  3. Redireciona para o passo 3.

### Passo 3: Pagamento (`/checkout/payment`)

**Objetivo:** Fechar a compra com UI 100% customizada (Rocketseat Style).

```text
+---------------------------------------------------------------+
|  1. Escolher Plano  >  2. Cadastro  >  3. Pagamento           |
|  [===========]         [=========]     [=========]            |
|                                                               |
|  +---------------------------+    +-----------------------+   |
|  | Pagamento Seguro          |    | Resumo do Pedido      |   |
|  |                           |    |                       |   |
|  | [ Cartão de Crédito ]     |    | Plano Pro    R$ 99,00 |   |
|  |                           |    | ...                   |   |
|  | [ **** **** **** 4242 ]   |    | Total        R$186,00 |   |
|  | [ MM/AA ] [ CVC ]         |    |                       |   |
|  |                           |    +-----------------------+   |
|  | [ FINALIZAR PEDIDO   ]    |                            |   |
|  +---------------------------+                            |   |
+---------------------------------------------------------------+
```

- **UI:**
  - Resumo final do pedido (Plano + Qtd Usuários + Ciclo).
  - **Componente de Pagamento Customizado:**
    - Usar `<PaymentElement />` do `@stripe/react-stripe-js` (NÃO usar Embedded Checkout iframe).
    - Customizar aparência via prop `appearance` do `Elements` provider para corresponder exatamente ao tema Dark/Shadcn do Kronos (fontes, bordas, cores).
    - **Botão de Ação:** O botão "FINALIZAR PEDIDO" deve ser um componente `Button` (Shadcn) nosso, externo ao elemento do Stripe.
- **Integração:**
  - O frontend recebe `clientSecret` e monta o `Elements` provider.
  - Ao clicar no botão, chama `stripe.confirmPayment` redirecionando para a página de sucesso.

## Gerenciamento de Estado (URL State)

Para manter a simplicidade e permitir compatilhamento de links:

- Use **Query Params** para persistir o estado entre os passos 1 e 3.
- Ex: `/checkout/register?plan=pro&interval=yearly&seats=5`

## Requisitos de Código

- **Componentes:** Crie componentes isolados em `checkout/_components/`:
  - `PlanConfigurationForm.tsx`
  - `OrganizationBillingForm.tsx` (Reutilizar lógica do Zod existente se houver)
  - `CheckoutSummary.tsx` (Card lateral direito)
  - `PaymentForm.tsx` (Componente wrapper do Stripe Elements)
- **Cálculos:** Crie um hook `usePlanCalculator` para centralizar a lógica de preço (ex: `(price * seats) * (interval === 'year' ? 0.9 : 1)`).

## Ajustes no Backend (Server Actions)

- **Refatorar/Criar Action:** `createSubscription` (em vez de `createCheckoutSession`).
  - **Lógica:**
    1. Cria/Atualiza Customer no Stripe (Sincronizar `name`, `email`, `address`, `tax_id` da Org para o Customer). **Vital:** Garante que o Payment Sheet do frontend já venha preenchido.
    2. Cria uma **Subscription** com status `incomplete` e `payment_behavior: 'default_incomplete'`.
    3. Expande `latest_invoice.payment_intent`.
    4. Retorna o `client_secret` desse PaymentIntent para o frontend.
  - **Metadata:** Continuar gravando `organizationId` e `product_key` no metadata da Subscription.
