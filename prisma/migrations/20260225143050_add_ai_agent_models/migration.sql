-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "KnowledgeFileStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentMessageRole" AS ENUM ('user', 'assistant', 'system', 'tool');

-- CreateEnum
CREATE TYPE "AgentConversationChannel" AS ENUM ('WHATSAPP', 'WEB_CHAT');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "pipeline_ids" UUID[],
    "tools_enabled" TEXT[] DEFAULT ARRAY['search_knowledge', 'move_deal', 'update_contact', 'create_task', 'hand_off_to_human']::TEXT[],
    "evolution_instance_name" TEXT,
    "evolution_instance_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_steps" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "allowed_actions" TEXT[],
    "activation_requirement" TEXT,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_knowledge_files" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "b2_url" TEXT NOT NULL,
    "status" "KnowledgeFileStatus" NOT NULL DEFAULT 'PENDING',
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "error_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_knowledge_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_knowledge_chunks" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_conversations" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "deal_id" TEXT,
    "channel" "AgentConversationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "ai_paused" BOOLEAN NOT NULL DEFAULT false,
    "remote_jid" TEXT,
    "summary" TEXT,
    "current_step_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "AgentMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agents_organization_id_is_active_idx" ON "agents"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "agent_steps_agent_id_order_idx" ON "agent_steps"("agent_id", "order");

-- CreateIndex
CREATE INDEX "agent_knowledge_files_agent_id_status_idx" ON "agent_knowledge_files"("agent_id", "status");

-- CreateIndex
CREATE INDEX "agent_knowledge_chunks_file_id_idx" ON "agent_knowledge_chunks"("file_id");

-- CreateIndex
CREATE INDEX "agent_conversations_organization_id_agent_id_idx" ON "agent_conversations"("organization_id", "agent_id");

-- CreateIndex
CREATE INDEX "agent_conversations_contact_id_idx" ON "agent_conversations"("contact_id");

-- CreateIndex
CREATE INDEX "agent_conversations_remote_jid_agent_id_idx" ON "agent_conversations"("remote_jid", "agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_conversations_agent_id_contact_id_channel_key" ON "agent_conversations"("agent_id", "contact_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "agent_messages_provider_message_id_key" ON "agent_messages"("provider_message_id");

-- CreateIndex
CREATE INDEX "agent_messages_conversation_id_is_archived_created_at_idx" ON "agent_messages"("conversation_id", "is_archived", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_steps" ADD CONSTRAINT "agent_steps_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge_files" ADD CONSTRAINT "agent_knowledge_files_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge_chunks" ADD CONSTRAINT "agent_knowledge_chunks_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "agent_knowledge_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "agent_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HNSW index for vector similarity search (cosine)
CREATE INDEX idx_agent_knowledge_chunks_embedding
ON agent_knowledge_chunks
USING hnsw (embedding vector_cosine_ops);
