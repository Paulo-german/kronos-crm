-- 1. Deletar tasks órfãs (SEM deal)
DELETE FROM "tasks" WHERE "deal_id" IS NULL;

-- 2. Definir data padrão para tasks sem dueDate
UPDATE "tasks"
SET "due_date" = "created_at"
WHERE "due_date" IS NULL;

-- 3. Tornar dealId NOT NULL
ALTER TABLE "tasks"
ALTER COLUMN "deal_id" SET NOT NULL;

-- 4. Tornar dueDate NOT NULL
ALTER TABLE "tasks"
ALTER COLUMN "due_date" SET NOT NULL;
