# 📋 Módulo de Tarefas (Tasks)

## 🎯 Visão Geral

Este módulo gerencia as atividades do usuário ("Getting Things Done"). Ele opera de forma híbrida:

1.  **Stand-alone:** Tarefas avulsas (ex: "Enviar relatório mensal").
2.  **Integrado:** Tarefas vinculadas a um Deal/Oportunidade (ex: "Ligar para cliente X sobre proposta Y").

---

## 📂 Estrutura de Arquivos

### View Layer (`app/(authenticated)/tasks`)

Responsável pela interface do usuário.

- **`page.tsx`**: Server Component principal. Busca os dados iniciais (`getTasks`) e renderiza a tabela.
- **`_components/`**:
  - `tasks-data-table.tsx`: Grid principal. Gerencia a exibição da lista.
  - `upsert-dialog-content.tsx`: **Componente Crítico**. Formulário unificado para Criação (Insert) e Edição (Update). Gerencia estado do formulário (`react-hook-form` + `zod`).
  - `create-task-button.tsx`: Trigger isolado que abre o modal de criação.
  - `table-dropdown-menu.tsx`: Menu de ações (3 pontinhos) da tabela (Editar/Excluir).
  - `delete-dialog-content.tsx`: Modal de confirmação destrutiva.

### Controller Layer (`app/_actions/task`)

Responsável pela lógica de escrita e validação. Segue o padrão `next-safe-action`.

- `create-task/`: Criação de nova tarefa.
- `update-task/`: Edição de tarefa existente.
- `delete-task/`: Remoção de tarefa.
- `toggle-task-status/`: Action específica para marcar como feito/pendente rapidamente.

### Model Layer (`app/_data-access/task`)

Responsável pela leitura de dados (Leitura direta do Prisma).

- `get-tasks.ts`: Query principal. Retorna array de `TaskDto`. Filtra por usuário (owner) ou atribuição.

---

## 🛠️ Planejamento de Melhorias (Refactor V2)

Melhorias planejadas para aumentar a utilidade do módulo:

### 1. Tipagem & Banco de Dados

- [ ] Criar Enum `TaskType`: `TASK` (Padrão), `MEETING`, `CALL`, `WHATSAPP`, `VISIT`, `EMAIL`.
- [ ] Adicionar campo `type` no modelo `Task`.

### 2. Formulário Avançado (`upsert-dialog-content.tsx`)

- [ ] **Seleção de Horário:** Inputs separados para Data (Calendar) e Hora (Select/Input).
- [ ] **Vínculo com Deal:** Combobox para selecionar a qual oportunidade esta tarefa pertence.
- [ ] **Tipo de Tarefa:** Seletor visual (com ícones) para o `TaskType`.
- [ ] **Status Inicial:** Checkbox "Marcar como concluída" no momento da criação.

### 3. Visualização

- [ ] Ícones distintos na tabela baseados no `TaskType`.
- [ ] Formatação de data incluindo o horário (ex: `23/01 às 14:00`).
