# Sidebar Colapsável

## Visao Geral

Implementacao de sidebar colapsavel com estado persistente em localStorage, animacao suave de largura e tooltips nos itens quando recolhida.

---

## Arquitetura

### Abordagem: Context API + localStorage

**Justificativa:**
- **Simplicidade**: Context API nativo do React, sem dependencias extras
- **Persistencia**: localStorage mantem preferencia do usuario entre sessoes
- **Performance**: Estado local, sem chamadas ao servidor
- **Reatividade**: Todos os componentes que usam o hook atualizam automaticamente

### Dimensoes

| Estado | Largura | CSS Class |
|--------|---------|-----------|
| Expandida | 256px | `w-64` |
| Colapsada | 68px | `w-[68px]` |

---

## Estrutura de Arquivos

### Arquivos Criados

```
app/
└── _contexts/
    └── sidebar-context.tsx    # Context + hook useSidebar
```

### Arquivos Modificados

| Arquivo | Modificacao |
|---------|-------------|
| `app/(authenticated)/layout.tsx` | Adicionado `SidebarProvider` e `TooltipProvider` |
| `app/_components/app-sidebar.tsx` | Largura dinamica, botao toggle, layout responsivo |
| `app/_components/sidebar-item.tsx` | Suporte a estado colapsado com tooltips |
| `app/_components/auth/sign-out-button.tsx` | Prop `isCollapsed` para layout compacto |

---

## Context API

### SidebarContext (`sidebar-context.tsx`)

```typescript
interface SidebarContextType {
  isCollapsed: boolean
  toggle: () => void
  collapse: () => void
  expand: () => void
}
```

### Hook `useSidebar`

```typescript
const { isCollapsed, toggle, collapse, expand } = useSidebar()
```

### Persistencia

- **Key**: `kronos-sidebar-collapsed`
- **Storage**: `localStorage`
- **Valores**: `'true'` | `'false'`

---

## Componentes

### AppSidebar

**Estados visuais:**

| Elemento | Expandida | Colapsada |
|----------|-----------|-----------|
| Logo | Icone + "KRONOS" | Apenas icone |
| Menu items | Icone + Label | Apenas icone |
| Botao Sair | Icone + "Sair" | Apenas icone |
| Toggle | No header | Flutuante a direita |

**Animacao:**
```css
transition-all duration-300 ease-in-out
```

### SidebarItem

- Extrai icone e label dos children automaticamente
- Quando colapsado: renderiza apenas icone + Tooltip
- Quando expandido: renderiza icone + label normalmente

```tsx
// Uso (nao muda)
<SidebarItem href="/dashboard">
  <LayoutDashboard className="h-4 w-4" />
  Dashboard
</SidebarItem>
```

### SignOutButton

Nova prop opcional:

```typescript
interface SignOutButtonProps {
  isCollapsed?: boolean  // default: false
}
```

---

## Providers

O layout autenticado envolve a aplicacao com os providers necessarios:

```tsx
// app/(authenticated)/layout.tsx
<SidebarProvider>
  <TooltipProvider>
    {/* ... */}
  </TooltipProvider>
</SidebarProvider>
```

---

## Fluxo de Uso

1. Usuario clica no botao de toggle (icone `PanelLeftClose` / `PanelLeft`)
2. Estado `isCollapsed` e invertido via `toggle()`
3. Novo estado e salvo em `localStorage`
4. Sidebar anima para nova largura (300ms)
5. Itens de menu mostram/escondem labels
6. Tooltips aparecem ao passar mouse sobre itens (quando colapsada)
7. Ao recarregar pagina, estado e restaurado do `localStorage`

---

## Tooltips

Tooltips aparecem apenas quando a sidebar esta colapsada:

| Componente | Posicao | Delay |
|------------|---------|-------|
| Menu items | `right` | 0ms |
| Botao Sair | `right` | 0ms |
| Botao Toggle | `right` (colapsado) / `top` (expandido) | 0ms |

---

## Icones Utilizados

| Icone | Uso |
|-------|-----|
| `PanelLeftClose` | Toggle quando expandida |
| `PanelLeft` | Toggle quando colapsada |

---

## Dependencias

Todas as dependencias ja estavam instaladas:

- `@radix-ui/react-tooltip` - Tooltips acessiveis
- `lucide-react` - Icones
- `class-variance-authority` - Utilitario cn()

**Nenhuma nova dependencia necessaria.**

---

## Acessibilidade

- Tooltips fornecem contexto para itens sem label visivel
- Botao toggle tem tooltip descritivo
- Navegacao por teclado preservada
- `TooltipProvider` com `delayDuration={0}` para feedback imediato

---

## Troubleshooting

### Estado nao persiste

**Causa:** localStorage pode estar desabilitado ou cheio.

**Solucao:** Verificar console do navegador para erros de storage.

### Tooltips nao aparecem

**Causa:** `TooltipProvider` ausente na arvore de componentes.

**Solucao:** Garantir que `TooltipProvider` envolve os componentes no layout.

### Animacao travando

**Causa:** Muitos re-renders ou CSS conflitante.

**Solucao:** Verificar se `transition-all` esta aplicado corretamente no elemento `<aside>`.

---

## Autor

Implementado com Claude Code em Janeiro/2026.
