-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system', 'tool');

-- CreateEnum
CREATE TYPE "InboxChannel" AS ENUM ('WHATSAPP', 'WEB_CHAT');

-- CreateTable: inboxes
CREATE TABLE "inboxes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "InboxChannel" NOT NULL DEFAULT 'WHATSAPP',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "evolution_instance_name" TEXT,
    "evolution_instance_id" TEXT,
    "agent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inboxes_pkey" PRIMARY KEY ("id")
);

-- Migrate data: create one Inbox per Agent that has an evolutionInstanceName
INSERT INTO "inboxes" ("id", "organization_id", "name", "channel", "is_active", "evolution_instance_name", "evolution_instance_id", "agent_id", "created_at", "updated_at")
SELECT gen_random_uuid(), "organization_id", "name", 'WHATSAPP'::"InboxChannel", "is_active", "evolution_instance_name", "evolution_instance_id", "id", NOW(), NOW()
FROM "agents" WHERE "evolution_instance_name" IS NOT NULL;

-- Rename table: agent_conversations -> conversations
ALTER TABLE "agent_conversations" RENAME TO "conversations";

-- Rename table: agent_messages -> messages
ALTER TABLE "agent_messages" RENAME TO "messages";

-- Add inbox_id column to conversations (nullable first for data migration)
ALTER TABLE "conversations" ADD COLUMN "inbox_id" TEXT;

-- Add unread_count column to conversations
ALTER TABLE "conversations" ADD COLUMN "unread_count" INTEGER NOT NULL DEFAULT 0;

-- Populate inbox_id from agent_id -> inboxes mapping
UPDATE "conversations" SET "inbox_id" = (
    SELECT "inboxes"."id" FROM "inboxes"
    WHERE "inboxes"."agent_id" = "conversations"."agent_id"
    LIMIT 1
);

-- For any conversations whose agent didn't have an evolution instance (orphaned),
-- create a fallback inbox per agent
INSERT INTO "inboxes" ("id", "organization_id", "name", "channel", "is_active", "agent_id", "created_at", "updated_at")
SELECT DISTINCT gen_random_uuid(), a."organization_id", a."name", 'WHATSAPP'::"InboxChannel", a."is_active", a."id", NOW(), NOW()
FROM "agents" a
WHERE a."id" IN (
    SELECT DISTINCT c."agent_id" FROM "conversations" c WHERE c."inbox_id" IS NULL
)
AND a."id" NOT IN (
    SELECT DISTINCT i."agent_id" FROM "inboxes" i WHERE i."agent_id" IS NOT NULL
);

-- Populate remaining null inbox_id values
UPDATE "conversations" SET "inbox_id" = (
    SELECT "inboxes"."id" FROM "inboxes"
    WHERE "inboxes"."agent_id" = "conversations"."agent_id"
    LIMIT 1
)
WHERE "inbox_id" IS NULL;

-- Now make inbox_id NOT NULL
ALTER TABLE "conversations" ALTER COLUMN "inbox_id" SET NOT NULL;

-- Drop old agent_id column and its constraints from conversations
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "agent_conversations_agent_id_contact_id_channel_key";
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "agent_conversations_agent_id_fkey";
ALTER TABLE "conversations" DROP COLUMN "agent_id";

-- Rename foreign key constraints from old names to new
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "agent_conversations_pkey";
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");

ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "agent_conversations_organization_id_fkey";
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "agent_conversations_contact_id_fkey";
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "agent_conversations_deal_id_fkey";

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "agent_messages_pkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "agent_messages_conversation_id_fkey";

-- Drop old indexes
DROP INDEX IF EXISTS "agent_conversations_agent_id_contact_id_channel_key";
DROP INDEX IF EXISTS "agent_conversations_organization_id_agent_id_idx";
DROP INDEX IF EXISTS "agent_conversations_contact_id_idx";
DROP INDEX IF EXISTS "agent_conversations_remote_jid_agent_id_idx";
DROP INDEX IF EXISTS "agent_messages_conversation_id_is_archived_created_at_idx";
DROP INDEX IF EXISTS "agent_messages_provider_message_id_key";

-- Rename the channel column enum type references
-- The column type in conversations was AgentConversationChannel, now it should be InboxChannel
-- Since both enums have the same values, we can cast
ALTER TABLE "conversations" ALTER COLUMN "channel" TYPE "InboxChannel" USING "channel"::text::"InboxChannel";

-- Rename the role column enum in messages
ALTER TABLE "messages" ALTER COLUMN "role" TYPE "MessageRole" USING "role"::text::"MessageRole";

-- Drop old enum types
DROP TYPE IF EXISTS "AgentConversationChannel";
DROP TYPE IF EXISTS "AgentMessageRole";

-- Remove evolution fields from agents
ALTER TABLE "agents" DROP COLUMN IF EXISTS "evolution_instance_name";
ALTER TABLE "agents" DROP COLUMN IF EXISTS "evolution_instance_id";

-- Add new foreign key constraints
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_inbox_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "inboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new unique constraint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_inbox_id_contact_id_channel_key" UNIQUE ("inbox_id", "contact_id", "channel");

-- Add new indexes
CREATE INDEX "inboxes_organization_id_idx" ON "inboxes"("organization_id");
CREATE INDEX "inboxes_evolution_instance_name_idx" ON "inboxes"("evolution_instance_name");
CREATE INDEX "conversations_organization_id_inbox_id_idx" ON "conversations"("organization_id", "inbox_id");
CREATE INDEX "conversations_contact_id_idx" ON "conversations"("contact_id");
CREATE INDEX "conversations_remote_jid_inbox_id_idx" ON "conversations"("remote_jid", "inbox_id");
CREATE INDEX "messages_conversation_id_is_archived_created_at_idx" ON "messages"("conversation_id", "is_archived", "created_at" DESC);
CREATE UNIQUE INDEX "messages_provider_message_id_key" ON "messages"("provider_message_id");
