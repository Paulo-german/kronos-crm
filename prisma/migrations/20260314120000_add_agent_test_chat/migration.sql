-- CreateTable
CREATE TABLE "agent_test_conversations" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_step_order" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_test_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_test_messages" (
    "id" TEXT NOT NULL,
    "test_conversation_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_test_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_test_conversations_agent_id_user_id_key" ON "agent_test_conversations"("agent_id", "user_id");

-- CreateIndex
CREATE INDEX "agent_test_conversations_organization_id_idx" ON "agent_test_conversations"("organization_id");

-- CreateIndex
CREATE INDEX "agent_test_messages_test_conversation_id_created_at_idx" ON "agent_test_messages"("test_conversation_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "agent_test_conversations" ADD CONSTRAINT "agent_test_conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_test_conversations" ADD CONSTRAINT "agent_test_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_test_messages" ADD CONSTRAINT "agent_test_messages_test_conversation_id_fkey" FOREIGN KEY ("test_conversation_id") REFERENCES "agent_test_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
