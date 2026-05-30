-- AlterTable: adicionar colunas de distribuição antes de remover a coluna legada
ALTER TABLE "capture_forms" ADD COLUMN "distribution_user_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
ALTER TABLE "capture_forms" ADD COLUMN "squad_id" TEXT;

-- Migrar responsável fixo para lista de distribuição (rodar ANTES do DROP COLUMN)
UPDATE "capture_forms"
SET "distribution_user_ids" = ARRAY["assigned_to"]::UUID[]
WHERE "assigned_to" IS NOT NULL;

-- DropForeignKey da relação antiga assignee
ALTER TABLE "capture_forms" DROP CONSTRAINT IF EXISTS "capture_forms_assigned_to_fkey";

-- DropColumn legada
ALTER TABLE "capture_forms" DROP COLUMN "assigned_to";

-- CreateIndex
CREATE INDEX "capture_forms_squad_id_idx" ON "capture_forms"("squad_id");

-- AddForeignKey
ALTER TABLE "capture_forms" ADD CONSTRAINT "capture_forms_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
