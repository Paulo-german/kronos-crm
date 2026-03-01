-- DropIndex
DROP INDEX "idx_agent_knowledge_chunks_embedding";

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "business_hours_config" JSONB,
ADD COLUMN     "business_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "business_hours_timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
ADD COLUMN     "out_of_hours_message" TEXT;
