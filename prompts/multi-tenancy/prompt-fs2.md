# 📋 KRONOS CRM: Protocolo de Migração Multi-tenant (SaaS)

> **Contexto:** O projeto atualmente é "Single-player" (tudo atrelado ao `User`). O objetivo é transformar em "Multiplayer" (tudo atrelado à `Organization`), onde usuários são `Members` com permissões específicas.

---

## 👥 FASE 2: Motor de Colaboração (Onboarding & Invites)

**Objetivo:** Permitir que empresas sejam criadas e membros sejam convidados com segurança.

### 2.1. Fluxo "Create Organization"

- Se o usuário logar e não possuir nenhuma organização, ele deve ser redirecionado para uma página de "Criar Workspace".
- Ao criar a organização:
  1.  Salvar a `Organization`.
  2.  Criar registro em `Member` vinculando o usuário atual como `OWNER` e status `ACCEPTED`.

### 2.2. Sistema de Convites (Secure Invite)

Implementar Server Action `inviteMember(email, role)`:

1.  **Verificação:** Checar se o e-mail já faz parte da org.
2.  **Criação:** Criar registro em `Member` com status `PENDING` e um token único.
3.  **Disparo:** Enviar email (simulado ou via provider) com Magic Link.
4.  **Aceite (Link Handler):**
    - Ao clicar no link, o sistema deve verificar se o usuário logado possui o **mesmo e-mail** do convite.
    - Se sim: Atualizar `Member` para `ACCEPTED` e vincular o `userId`.
    - Se não: Bloquear e avisar que o convite pertence a outro e-mail.

---
