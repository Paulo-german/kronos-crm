-- AlterEnum
ALTER TYPE "AutomationTrigger" ADD VALUE 'CONTACT_CREATED';

-- AlterTable
ALTER TABLE "automation_executions" ADD COLUMN     "contact_id" TEXT;

-- CreateIndex
CREATE INDEX "automation_executions_automation_id_contact_id_executed_at_idx" ON "automation_executions"("automation_id", "contact_id", "executed_at" DESC);

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
