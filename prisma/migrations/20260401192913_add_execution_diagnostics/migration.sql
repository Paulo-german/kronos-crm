-- AlterTable
ALTER TABLE "agent_executions" ADD COLUMN     "finish_reason" TEXT,
ADD COLUMN     "metadata" JSONB;
