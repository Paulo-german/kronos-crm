-- CreateEnum
CREATE TYPE "GrantType" AS ENUM ('INTERNAL', 'PARTNER');

-- AlterTable
ALTER TABLE "agent_conversations" ADD COLUMN     "paused_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "grant_type" "GrantType",
ADD COLUMN     "plan_override_id" TEXT;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_plan_override_id_fkey" FOREIGN KEY ("plan_override_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
