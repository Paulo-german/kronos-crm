# 🐛 Post-Mortem: O Loop Infinito de Redirecionamento (Auth/Org)

> **Data:** 31/01/2026
> **Contexto:** Usuário criava uma organização ou tentava acessar uma org deletada e entrava num loop `307 Redirect` eterno entre `/org` e `/org/[slug]/dashboard`.

## 🚨 O Problema

O sistema entrava em um ciclo vicioso de redirecionamentos:

1.  **Middleware:** Detectava cookie `LAST_ORG_COOKIE` e redirecionava para `/org/SLUG/dashboard`.
2.  **App (Layout/Context):** Tentava validar o membro na org (`validateMembership`).
3.  **Falha:** Como a org havia sido deletada (ou cache estava staled), a validação falhava.
4.  **App:** Redirecionava de volta para `/org`.
5.  **Middleware:** Via o cookie novamente e redirecionava de volta para o Dashboard.
6.  **Loop:** O ciclo se repetia a cada ~100ms.

## 🛠️ A Solução "Auto-Healing"

Implementamos uma defesa em profundidade em 3 camadas para garantir que o sistema se recupere sozinho desse estado.

### 1. Invalidação de Cache na Origem (`validate-membership.ts`)

Mudamos a estratégia de cache da função `validateMembership` para usar `unstable_cache` do Next.js com Tags (`membership:userId:orgSlug`).
Isso permite invalidar o cache explicitamente quando um membro entra na organização, evitando leituras obsoletas ("stale reads") logo após a criação.

### 2. Flag de Limpeza de Cookie (`middleware.ts`)

Adicionamos lógica no Middleware para interceptar um parâmetro de URL especial: `?clear_last_org=true`.

```typescript
// app/_lib/supabase/middleware.ts
const shouldClearCookie =
  request.nextUrl.searchParams.get('clear_last_org') === 'true'
if (shouldClearCookie) {
  supabaseResponse.cookies.delete(LAST_ORG_COOKIE)
  request.cookies.delete(LAST_ORG_COOKIE)
}
```

### 3. Redirect Inteligente nos Server Components

Nos locais onde detectamos falha de acesso (Org não existe ou Usuário não é membro), alteramos o redirect padrão para incluir a flag de limpeza.

- `app/_data-access/organization/get-organization-context.ts`
- `app/(authenticated)/org/[orgSlug]/layout.tsx`

**Antes:** `redirect('/org')`
**Depois:** `redirect('/org?clear_last_org=true')`

## 🎯 Resultado

Se o usuário tentar acessar uma organização inválida (por cookie antigo ou link quebrado):

1.  O Server Component detecta o erro.
2.  Redireciona para `/org?clear_last_org=true`.
3.  O Middleware limpa o cookie "teimoso".
4.  O usuário pousa em segurança na tela de seleção de organizações `/org`.

---

**Arquivos Afetados:**

- `app/_lib/supabase/middleware.ts`
- `app/_data-access/organization/validate-membership.ts`
- `app/_data-access/organization/get-organization-context.ts`
- `app/(authenticated)/org/[orgSlug]/layout.tsx`
