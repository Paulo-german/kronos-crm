-- Corrige BOOKINGs gravados antes do fix de timezone (21/05/2026):
-- o horário SP era tratado como UTC, gerando diferença de -3h na exibição.
-- Adicionamos 3h para converter para UTC correto antes de mudar o tipo da coluna.
UPDATE "appointments"
SET
  "start_date" = "start_date" + INTERVAL '3 hours',
  "end_date"   = "end_date"   + INTERVAL '3 hours',
  "updated_at" = NOW()
WHERE "type" = 'BOOKING'
  AND "created_at" < '2026-05-21 00:00:00';

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "start_date" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "end_date" SET DATA TYPE TIMESTAMPTZ;
