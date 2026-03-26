-- CreateEnum
CREATE TYPE "AgentExecutionStatus" AS ENUM ('COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AgentExecutionStepType" AS ENUM ('DEBOUNCE_CHECK', 'AUDIO_TRANSCRIPTION', 'IMAGE_TRANSCRIPTION', 'MEDIA_DOWNLOAD', 'CONTEXT_LOADING', 'CREDIT_CHECK', 'LLM_CALL', 'TOOL_CALL', 'SEND_MESSAGE', 'FOLLOW_UP_SCHEDULE', 'MEMORY_COMPRESSION', 'FALLBACK_LLM_CALL', 'PAUSE_CHECK');

-- CreateEnum
CREATE TYPE "AgentExecutionStepStatus" AS ENUM ('PASSED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "agent_executions" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "trigger_message_id" TEXT,
    "status" "AgentExecutionStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "model_id" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "credits_cost" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_execution_steps" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "AgentExecutionStepType" NOT NULL,
    "status" "AgentExecutionStepStatus" NOT NULL,
    "tool_name" TEXT,
    "input" JSONB,
    "output" JSONB,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_execution_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_executions_agent_id_created_at_idx" ON "agent_executions"("agent_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "agent_executions_organization_id_agent_id_status_idx" ON "agent_executions"("organization_id", "agent_id", "status");

-- CreateIndex
CREATE INDEX "agent_executions_conversation_id_idx" ON "agent_executions"("conversation_id");

-- CreateIndex
CREATE INDEX "agent_execution_steps_execution_id_order_idx" ON "agent_execution_steps"("execution_id", "order");

-- AddForeignKey
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_execution_steps" ADD CONSTRAINT "agent_execution_steps_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
