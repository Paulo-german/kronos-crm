-- Fase 0 do Kronos Work: rename da model `Task` (CRM) para `CrmTask`.
--
-- Por que SQL manual (e não o diff automático do Prisma):
-- o Prisma NÃO detecta rename de tabela — ele geraria DROP TABLE "tasks" + CREATE TABLE
-- "crm_tasks", apagando todas as linhas. Este `ALTER TABLE ... RENAME` é metadata-only:
-- preserva dados, FKs, índices, RLS e policies (atrelados por OID, não por nome).
-- Lock ACCESS EXCLUSIVE de milissegundos, sem reescrita de linhas. Zero downtime.
--
-- Os renames de constraints/índices abaixo são cosméticos (anti-drift: alinham os nomes
-- ao padrão `crm_tasks_*` que o Prisma espera após o rename). São idempotentes e protegidos
-- por checagem de existência para nunca abortar o deploy de produção caso algum nome divirja.

-- 1. Rename da tabela (essencial — preserva todos os dados).
ALTER TABLE "tasks" RENAME TO "crm_tasks";

-- 2. Rename da primary key (renomeia também o índice de suporte associado).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_pkey' AND conrelid = 'public.crm_tasks'::regclass) THEN
    ALTER TABLE "crm_tasks" RENAME CONSTRAINT "tasks_pkey" TO "crm_tasks_pkey";
  END IF;
END $$;

-- 3. Rename das foreign keys.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_assigned_to_fkey' AND conrelid = 'public.crm_tasks'::regclass) THEN
    ALTER TABLE "crm_tasks" RENAME CONSTRAINT "tasks_assigned_to_fkey" TO "crm_tasks_assigned_to_fkey";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_created_by_fkey' AND conrelid = 'public.crm_tasks'::regclass) THEN
    ALTER TABLE "crm_tasks" RENAME CONSTRAINT "tasks_created_by_fkey" TO "crm_tasks_created_by_fkey";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_deal_id_fkey' AND conrelid = 'public.crm_tasks'::regclass) THEN
    ALTER TABLE "crm_tasks" RENAME CONSTRAINT "tasks_deal_id_fkey" TO "crm_tasks_deal_id_fkey";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_organization_id_fkey' AND conrelid = 'public.crm_tasks'::regclass) THEN
    ALTER TABLE "crm_tasks" RENAME CONSTRAINT "tasks_organization_id_fkey" TO "crm_tasks_organization_id_fkey";
  END IF;
END $$;

-- 4. Rename dos índices secundários (IF EXISTS é nativo para ALTER INDEX).
ALTER INDEX IF EXISTS "tasks_deal_id_organization_id_idx" RENAME TO "crm_tasks_deal_id_organization_id_idx";
ALTER INDEX IF EXISTS "tasks_organization_id_assigned_to_is_completed_due_date_idx" RENAME TO "crm_tasks_organization_id_assigned_to_is_completed_due_date_idx";
ALTER INDEX IF EXISTS "tasks_organization_id_is_completed_due_date_idx" RENAME TO "crm_tasks_organization_id_is_completed_due_date_idx";
