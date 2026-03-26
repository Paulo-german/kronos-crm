-- AlterTable
ALTER TABLE "inboxes" ADD COLUMN "evolution_connected" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: marcar como conectadas as inboxes que ja possuem instancia Evolution
UPDATE "inboxes" SET "evolution_connected" = true WHERE "evolution_instance_name" IS NOT NULL;
