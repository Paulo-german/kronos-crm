/*
  Warnings:

  - Added the required column `agent_id` to the `agent_knowledge_chunks` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "idx_agent_knowledge_chunks_embedding";

-- AlterTable
ALTER TABLE "agent_knowledge_chunks" ADD COLUMN     "agent_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "agent_knowledge_chunks_agent_id_idx" ON "agent_knowledge_chunks"("agent_id");

-- AddForeignKey
ALTER TABLE "agent_knowledge_chunks" ADD CONSTRAINT "agent_knowledge_chunks_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
