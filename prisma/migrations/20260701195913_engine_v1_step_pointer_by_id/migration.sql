/*
  Warnings:

  - You are about to drop the column `current_step_order` on the `agent_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "agent_sessions" DROP COLUMN "current_step_order",
ADD COLUMN     "current_step_id" TEXT;

-- AddForeignKey
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_current_step_id_fkey" FOREIGN KEY ("current_step_id") REFERENCES "agent_engine_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
