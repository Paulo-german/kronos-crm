# Plano de Refatoração: Estrutura N:N Completa (Deals <-> Contacts)

Este documento detalha o plano de arquitetura para migrar o relacionamento entre Negociações (`Deal`) e Contatos (`Contact`) de **1:N** para **N:N (Muitos-para-Muitos)**, eliminando o campo legado e adotando a estrutura normalizada correta.

> **Objetivo:** Permitir que uma negociação tenha múltiplos contatos (ex: Decisor, Influenciador, Técnico) e padronizar o acesso aos dados.

---

## 1. Alterações no Banco de Dados (Prisma Schema)

### O que muda:

1.  **Remover** `contactId` e a relação direta `contact` do modelo `Deal`.
2.  **Criar** tabela intermediária `DealContact`.
3.  **Adicionar** campos de controle na intermediária (`role`, `isPrimary`).

### Novo Schema (Referência):

```prisma
model Deal {
  id              String   @id @default(uuid())
  // ... outros campos (title, status, etc)

  // REMOVER:
  // contactId    String?
  // contact      Contact?

  // ADICIONAR:
  contacts        DealContact[]

  // ...
}

model Contact {
  id              String   @id @default(uuid())
  // ...

  // ATUALIZAR:
  deals           DealContact[]
}

model DealContact {
  id        String   @id @default(uuid())

  dealId    String   @map("deal_id")
  deal      Deal     @relation(fields: [dealId], references: [id], onDelete: Cascade)

  contactId String   @map("contact_id")
  contact   Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  // Metadados da Relação
  role      String?  @default("Stakeholder") // Ex: Decisor, Influenciador
  isPrimary Boolean  @default(false) @map("is_primary") // Define o contato principal para exibição em listas

  @@unique([dealId, contactId]) // Um contato só pode estar uma vez no mesmo deal
  @@map("deal_contacts")
}
```

---

## 2. Refatoração de Código (Necessária)

A mudança acima é uma **Breaking Change**. O código existente que acessa `deal.contact` irá quebrar e precisa ser atualizado conforme os padrões abaixo.

### Padrão de Leitura (Queries)

Sempre que buscar um `Deal` para exibir em listas (Kanban/Tabelas), devemos buscar o **Contato Principal**.

**Antes:**

```ts
const deal = await db.deal.findFirst({
  include: { contact: true },
})
console.log(deal.contact.name)
```

**Depois (Novo Padrão):**

```ts
const deal = await db.deal.findFirst({
  include: {
    contacts: {
      where: { isPrimary: true }, // Busca apenas o principal
      take: 1,
      include: { contact: true },
    },
  },
})
// Acesso:
const primaryContact = deal.contacts[0]?.contact
console.log(primaryContact?.name)
```

### Padrão de Escrita (Mutations)

Ao criar um Deal, é obrigatório definir pelo menos um contato como `isPrimary`.

**Exemplo de Criação:**

```ts
await db.deal.create({
  data: {
    title: 'Novo Negócio',
    contacts: {
      create: [
        {
          contactId: 'id-joao',
          isPrimary: true,
          role: 'Decisor',
        },
        {
          contactId: 'id-maria',
          isPrimary: false,
          role: 'Influenciador',
        },
      ],
    },
  },
})
```

---

## 3. Checklist de Tarefas para o Agente

### Fase 1: Banco de Dados

- [ ] Ajustar `schema.prisma` removendo campos legados (`contactId`, `legacyDeals`) e consolidando `DealContact`.
- [ ] Criar Script de Migração (se houver dados importantes) ou Resetar Banco (`prisma migrate reset`) se for ambiente dev limpo.

### Fase 2: Data Access Layer (DAL)

Atualizar arquivos em `_data-access/deal/`:

- [ ] `get-deals.ts` / `get-deals-by-pipeline.ts`: Ajustar query para fazer include de `contacts` filtrando por `isPrimary`.
- [ ] `get-deal-details.ts`: Ajustar query para buscar **todos** os contatos e mapear para uma lista de stakeholders no DTO. Atualizar o DTO para retornar `contacts: StakeholderDto[]` em vez de campos soltos (`contactName`, `contactEmail`).

### Fase 3: Componentes de UI

- [ ] **Kanban Card (`kanban-card.tsx`):** Atualizar para ler o nome do contato de `deal.primaryContact`.
- [ ] **Deal Page (`pipeline/deal/[id]/page.tsx`):**
  - Substituir o widget de contato único por um componente **"Stakeholders"** ou **"Contatos Envolvidos"**.
  - Este componente deve listar todos os contatos e permitir adicionar/remover.
- [ ] **Upsert Deal Dialog:** Atualizar o formulário para permitir selecionar múltiplos contatos (ex: `MultiSelect` ou `Combobox` múltiplo) e definir quem é o principal.

### Fase 4: Server Actions

- [ ] `upsert-deal.ts`: Atualizar lógica de salvamento para lidar com a tabela `deal_contacts`. Garantir que se o usuário mudar a seleção, as relações no banco sejam atualizadas (delete removed, create new).

---

## 4. Benefícios Esperados

1.  **Realidade B2B:** Reflete como vendas complexas funcionam.
2.  **Escalabilidade:** Permite adicionar N papéis na negociação sem mudar o banco.
3.  **Analytics:** Melhora a capacidade de analisar quem são os decisores mais frequentes.
