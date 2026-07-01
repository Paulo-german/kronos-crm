-- CreateEnum
CREATE TYPE "field_result_polarity" AS ENUM ('ANY', 'POSITIVE_ONLY');

-- CreateEnum
CREATE TYPE "engine_step_kind" AS ENUM ('GREETING', 'QUALIFICATION', 'PRESENTATION', 'SCHEDULING', 'NEGOTIATION', 'CLOSING', 'POST_SALE', 'OTHER');

-- CreateEnum
CREATE TYPE "engine_step_field_source" AS ENUM ('AGENT', 'CUSTOM_FIELD');

-- CreateTable
CREATE TABLE "agent_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "state" JSONB NOT NULL DEFAULT '{}',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "current_step_order" INTEGER NOT NULL DEFAULT 0,
    "turn_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_engine_steps" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "kind" "engine_step_kind" NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "key_question" TEXT,
    "guidance_note" TEXT,
    "message_examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actions" JSONB,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_engine_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_engine_step_fields" (
    "id" TEXT NOT NULL,
    "agent_engine_step_id" TEXT NOT NULL,
    "source" "engine_step_field_source" NOT NULL DEFAULT 'AGENT',
    "agent_field_key" TEXT,
    "field_definition_id" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "result_polarity" "field_result_polarity" NOT NULL DEFAULT 'ANY',
    "on_negative_step_id" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "agent_engine_step_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_sessions_conversation_id_key" ON "agent_sessions"("conversation_id");

-- CreateIndex
CREATE INDEX "agent_sessions_agent_id_idx" ON "agent_sessions"("agent_id");

-- CreateIndex
CREATE INDEX "agent_sessions_organization_id_idx" ON "agent_sessions"("organization_id");

-- CreateIndex
CREATE INDEX "agent_engine_steps_agent_id_order_idx" ON "agent_engine_steps"("agent_id", "order");

-- CreateIndex
CREATE INDEX "agent_engine_step_fields_agent_engine_step_id_position_idx" ON "agent_engine_step_fields"("agent_engine_step_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "agent_engine_step_fields_agent_engine_step_id_field_definit_key" ON "agent_engine_step_fields"("agent_engine_step_id", "field_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_engine_step_fields_agent_engine_step_id_agent_field_k_key" ON "agent_engine_step_fields"("agent_engine_step_id", "agent_field_key");

-- AddForeignKey
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_engine_steps" ADD CONSTRAINT "agent_engine_steps_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_engine_step_fields" ADD CONSTRAINT "agent_engine_step_fields_agent_engine_step_id_fkey" FOREIGN KEY ("agent_engine_step_id") REFERENCES "agent_engine_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_engine_step_fields" ADD CONSTRAINT "agent_engine_step_fields_on_negative_step_id_fkey" FOREIGN KEY ("on_negative_step_id") REFERENCES "agent_engine_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_engine_step_fields" ADD CONSTRAINT "agent_engine_step_fields_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
