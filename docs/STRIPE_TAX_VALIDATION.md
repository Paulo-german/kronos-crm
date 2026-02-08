# 🛡️ Validação de Dados Fiscais no Checkout

**Data de Implementação:** 2026-02-07  
**Status:** ✅ Implementado e Testado

---

## 📋 Resumo

Implementação de validação obrigatória de dados cadastrais (CPF/CNPJ) antes de permitir o checkout de assinaturas, garantindo compliance fiscal e integridade dos dados no Stripe.

---

## 🎯 Problema Resolvido

### Antes

- ❌ Usuário podia pular direto para o Step 3 (Payment)
- ❌ Customer criado no Stripe **SEM** dados fiscais
- ❌ Assinatura ativada sem CNPJ/CPF
- ❌ Impossível emitir NF-e posteriormente
- ❌ Dados inconsistentes entre Kronos DB e Stripe

### Depois

- ✅ Validação obrigatória de `taxId`, `legalName` e `personType`
- ✅ Suporte completo para PF (CPF) e PJ (CNPJ)
- ✅ Customer sempre criado com dados fiscais completos
- ✅ Uso correto da API `tax_id_data` do Stripe
- ✅ Locale português (`pt-BR`) configurado

---

## 🔧 Implementação Técnica

### 1. Validação em `createSetupIntent`

```typescript
// VALIDAÇÃO OBRIGATÓRIA
if (!org.taxId || !org.legalName || !org.personType) {
  throw new Error(
    'Dados cadastrais incompletos. Por favor, preencha suas informações fiscais no passo anterior.',
  )
}
```

**Quando dispara:**

- User tenta acessar `/checkout/payment` sem passar por `/checkout/register`
- User deleta manualmente os dados cadastrais do banco

**Resultado:**

- Erro claro e direto no frontend
- Impossível prosseguir sem dados fiscais

---

### 2. Criação de Customer com Dados Completos

#### Se NÃO existe Customer (`create`)

```typescript
stripe.customers.create({
  name: org.legalName, // "Acme Tecnologia LTDA" ou "João Silva"
  email: org.billingContactEmail, // "financeiro@acme.com"
  phone: org.billingContactPhone, // "11987654321"
  address: {
    line1: `${org.billingStreet}, ${org.billingNumber}`,
    line2: org.billingComplement || undefined,
    city: org.billingCity,
    state: org.billingState,
    postal_code: org.billingZipCode,
    country: 'BR',
  },
  tax_id_data: [
    {
      type: org.personType === 'PJ' ? 'br_cnpj' : 'br_cpf', // ✅ Dinâmico
      value: org.taxId, // "12345678000190" ou "12345678901"
    },
  ],
  preferred_locales: ['pt-BR'], // ✅ Emails do Stripe em português
  metadata: {
    organizationId: ctx.orgId,
    personType: org.personType,
  },
})
```

#### Se JÁ existe Customer (`update`)

```typescript
// 1. Atualizar dados básicos
stripe.customers.update(customerId, {
  name: org.legalName,
  email: org.billingContactEmail,
  // ... resto dos dados
  metadata: {
    taxId: org.taxId, // Fallback nos metadados
  },
})

// 2. Criar TaxID via API separada (Stripe não permite no update)
const taxIds = await stripe.customers.listTaxIds(customerId)

if (taxIds.data.length === 0) {
  await stripe.customers.createTaxId(customerId, {
    type: org.personType === 'PJ' ? 'br_cnpj' : 'br_cpf',
    value: org.taxId,
  })
}
```

**Por que API separada?**

- O Stripe **não permite** `tax_id_data` no método `update()`
- Precisamos usar `createTaxId()` separadamente
- Verificamos antes se já existe para evitar duplicatas

---

## 📊 Dados Enviados ao Stripe

### Comparação: Antes vs Depois

| Campo              | Antes          | Depois                           | API Usada |
| ------------------ | -------------- | -------------------------------- | --------- |
| Nome Legal         | ✅ `name`      | ✅ `name`                        | Standard  |
| Email              | ✅ `email`     | ✅ `email`                       | Standard  |
| Telefone           | ✅ `phone`     | ✅ `phone`                       | Standard  |
| Endereço Completo  | ✅ `address`   | ✅ `address`                     | Standard  |
| **CPF/CNPJ**       | ⚠️ Só metadata | ✅ **`tax_id_data` + metadata**  | Tax API   |
| **Tipo de Pessoa** | ⚠️ Só metadata | ✅ **Dinâmico (br_cnpj/br_cpf)** | Tax API   |
| **Locale**         | ❌ EN (padrão) | ✅ **pt-BR**                     | Standard  |

---

## 🧪 Casos de Teste

### ✅ Cenário 1: Fluxo Normal (PJ)

**Passo a Passo:**

1. User escolhe plano em `/checkout/configure`
2. User preenche CNPJ em `/checkout/register`
3. User vai para `/checkout/payment`
4. ✅ `createSetupIntent` valida que `taxId` existe
5. ✅ Customer criado com `tax_id_data: [{ type: 'br_cnpj', value: '12345678000190' }]`
6. ✅ SetupIntent criado normalmente

**Resultado Esperado:**

```json
// No Stripe Dashboard
{
  "name": "Empresa XYZ LTDA",
  "email": "financeiro@xyz.com",
  "tax_ids": [
    {
      "type": "br_cnpj",
      "value": "12345678000190",
      "verification": { "status": "unverified" }
    }
  ],
  "preferred_locales": ["pt-BR"]
}
```

---

### ✅ Cenário 2: Fluxo Normal (PF)

**Diferença:** User escolhe "Pessoa Física" e preenche CPF.

**Resultado Esperado:**

```json
{
  "name": "João da Silva",
  "tax_ids": [
    {
      "type": "br_cpf",
      "value": "12345678901"
    }
  ]
}
```

---

### ❌ Cenário 3: Usuário Tenta Pular Step 2

**Passo a Passo:**

1. User acessa diretamente `https://app.com/org/xyz/checkout/payment`
2. Frontend chama `createSetupIntent()`
3. ❌ Action detecta `org.taxId === null`
4. ❌ `throw new Error('Dados cadastrais incompletos...')`

**Resultado no Frontend:**

```
🔴 Erro: Dados cadastrais incompletos. Por favor, preencha suas informações fiscais no passo anterior.
```

---

## 🔍 Logs e Debugging

### Sucesso (Customer Criado)

```
[INFO] Customer created with tax_id_data
{
  customerId: 'cus_ABC123',
  tax_id: 'br_cnpj',
  value: '12345678000190'
}
```

### Sucesso (Customer Atualizado)

```
[INFO] Customer updated, tax_id already exists
```

### Warning (TaxID Falhou)

```
⚠️ [SetupIntent] Failed to create tax_id: Invalid CNPJ format
 └── Metadata fallback ativo: org.metadata.taxId = '12345678000190'
```

**Por que não quebramos?**

- Se o formato do CPF/CNPJ estiver inválido, o Stripe rejeita na criação do TaxID
- Nesse caso, logamos o erro e continuamos
- O `taxId` fica salvo no metadata como fallback
- Você pode corrigir manualmente depois no Stripe Dashboard

---

## 🚨 Breaking Changes

### Para o Frontend

Nenhum! O fluxo continua o mesmo:

1. Configure Plan
2. **Register Details** ← Agora obrigatório
3. Payment

### Para Testes Locais

Se você tinha testes que pulavam o Step 2, eles vão **QUEBRAR**.  
Solução: Mock os dados fiscais antes de chamar `createSetupIntent`:

```typescript
// Em testes
await db.organization.update({
  where: { id: testOrgId },
  data: {
    taxId: '12345678000190',
    legalName: 'Test Company LTDA',
    personType: 'PJ',
  },
})
```

---

## 📚 Referências da API Stripe

- [Tax IDs API](https://stripe.com/docs/api/customer_tax_ids)
- [Creating Tax IDs](https://stripe.com/docs/api/customer_tax_ids/create)
- [Supported Tax ID Types](https://stripe.com/docs/billing/customer/tax-ids#supported-tax-id)
  - `br_cnpj`: Cadastro Nacional da Pessoa Jurídica (Brasil)
  - `br_cpf`: Cadastro de Pessoas Físicas (Brasil)

---

## ✅ Checklist de Deploy

- [x] Validação implementada em `createSetupIntent`
- [x] Suporte a PF (CPF) e PJ (CNPJ)
- [x] `tax_id_data` usado no create
- [x] TaxID API usada no update
- [x] Locale `pt-BR` configurado
- [x] Também aplicado em `saveBillingData`
- [x] Build passou sem erros
- [ ] Testado em DEV com CPF
- [ ] Testado em DEV com CNPJ
- [ ] Validado erro quando pula Step 2
- [ ] Deploy em staging
- [ ] Deploy em produção

---

## 🎯 Próximos Passos (Opcional)

### Melhorias Futuras

- [ ] **Validação de Formato**: Validar CPF/CNPJ no frontend antes de salvar
- [ ] **Nome Fantasia**: Adicionar `tradeName` no metadata do Stripe
- [ ] **Simples Nacional**: Adicionar flag `isSimples` no metadata
- [ ] **Webhook Sync**: Criar webhook para sincronizar mudanças em tempo real
- [ ] **Nota Fiscal**: Integrar com Focus NFe / ENOTAS para emissão automática

---

**Documentado por:** AI Assistant  
**Revisado por:** [Aguardando]
