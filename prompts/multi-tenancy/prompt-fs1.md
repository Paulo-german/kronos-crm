# 📋 KRONOS CRM: Protocolo de Migração Multi-tenant (SaaS)

> **Contexto:** O projeto atualmente é "Single-player" (tudo atrelado ao `User`). O objetivo é transformar em "Multiplayer" (tudo atrelado à `Organization`), onde usuários são `Members` com permissões específicas.

---

## 🏗️ FASE 1: Fundação & Schema (Database Core)

**Objetivo:** Alterar a estrutura do banco de dados para suportar organizações e ajustar a camada de autenticação.

### 1.1. Atualização do Prisma Schema

Modifique o arquivo `schema.prisma` seguindo estas regras estritas:

1.  **Nova Model `Organization`:**
    - Deve conter os dados macro: `id`, `name`, `slug` (unique), `stripeCustomerId`.
    - Deve controlar o plano: `plan` (Enum: FREE, PRO, ENTERPRISE) e `subscriptionStatus`.
2.  **Nova Model `Member`:**
    - Tabela pivô entre `User` e `Organization`.
    - Campos: `role` (Enum: OWNER, ADMIN, MEMBER), `status` (PENDING, ACCEPTED), `email` (para convites), `invitationToken` (unique).
    - **Constraint:** `@@unique([organizationId, email])` (Um email só pode ser convidado uma vez por org).
3.  **Refatoração das Entidades de Negócio (`Contact`, `Deal`, `Product`, `Task`, `Pipeline`):**
    - **Obrigatório:** Todas devem ganhar o campo `organizationId` (FK para Organization).
    - **Ownership:** `Contact` e `Deal` devem manter/ter o campo `assignedTo` (FK para User) para indicar o responsável direto.

### 1.2. Auth & Context Injection

Atualize a configuração do `safe-action` (`authActionClient`):

- **Middleware de Contexto (Next.js Middleware):** Implementar `middleware.ts` para ler o slug da organização na URL (ex: `app.com/[slug]/dashboard`). Se o usuário não for membro desta org, redirecionar para `/404` ou `/dashboard` (home).
- **Injeção de Contexto:** O `ctx` das actions deve retornar:
  ```typescript
  {
    userId: string
    orgId: string
    userRole: 'OWNER' | 'ADMIN' | 'MEMBER'
  }
  ```

---
