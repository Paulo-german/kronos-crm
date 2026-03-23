-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('PJ', 'PF');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');

-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('1-10', '11-50', '50+');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('note', 'call', 'email', 'meeting', 'stage_change', 'product_added', 'product_removed', 'task_created', 'task_completed', 'deal_won', 'deal_lost', 'deal_reopened', 'product_updated', 'assignee_changed', 'priority_changed', 'deal_paused', 'deal_unpaused', 'date_changed', 'contact_added', 'contact_removed', 'appointment_created', 'appointment_updated', 'appointment_canceled', 'appointment_deleted');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TASK', 'MEETING', 'CALL', 'WHATSAPP', 'VISIT', 'EMAIL');

-- CreateEnum
CREATE TYPE "GrantType" AS ENUM ('INTERNAL', 'PARTNER');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('STATIC', 'METERED');

-- CreateEnum
CREATE TYPE "FeatureValueType" AS ENUM ('NUMBER', 'BOOLEAN', 'STRING');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT_PURCHASE', 'USAGE_DEBIT', 'MONTHLY_RESET', 'AUTO_RECHARGE', 'MANUAL_ADJUSTMENT', 'REFUND', 'SYSTEM_REFUND', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "DealPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'PAUSED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "KnowledgeFileStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('EVOLUTION', 'META_CLOUD', 'Z_API');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system', 'tool');

-- CreateEnum
CREATE TYPE "InboxChannel" AS ENUM ('WHATSAPP', 'WEB_CHAT');

-- CreateEnum
CREATE TYPE "ConversationEventType" AS ENUM ('TOOL_SUCCESS', 'TOOL_FAILURE', 'PROCESSING_ERROR', 'INFO');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE_CALENDAR');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('CRM_TO_EXTERNAL', 'EXTERNAL_TO_CRM', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'USER_ACTION', 'PLATFORM_ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "notification_preferences" JSONB,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "billing_city" TEXT,
    "billing_complement" TEXT,
    "billing_contact_email" TEXT,
    "billing_contact_name" TEXT,
    "billing_contact_phone" TEXT,
    "billing_country" TEXT DEFAULT 'BR',
    "billing_neighborhood" TEXT,
    "billing_number" TEXT,
    "billing_state" TEXT,
    "billing_street" TEXT,
    "billing_zip_code" TEXT,
    "is_simples" BOOLEAN NOT NULL DEFAULT false,
    "legal_name" TEXT,
    "person_type" "PersonType",
    "tax_id" TEXT,
    "trade_name" TEXT,
    "trial_ends_at" TIMESTAMP(3),
    "is_read_only" BOOLEAN NOT NULL DEFAULT false,
    "grant_type" "GrantType",
    "plan_override_id" TEXT,
    "niche" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MemberStatus" NOT NULL DEFAULT 'PENDING',
    "invitation_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "organization_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "plan_id" TEXT,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "industry" TEXT,
    "size" "CompanySize",
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "cpf" TEXT,
    "is_decision_maker" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT NOT NULL,
    "assigned_to" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "color" TEXT,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "pipeline_stage_id" TEXT NOT NULL,
    "company_id" TEXT,
    "title" TEXT NOT NULL,
    "expected_close_date" TIMESTAMP(3),
    "assigned_to" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "lostReason" TEXT,
    "notes" TEXT,
    "paused_at" TIMESTAMP(3),
    "priority" "DealPriority" NOT NULL DEFAULT 'medium',
    "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
    "organization_id" TEXT NOT NULL,
    "loss_reason_id" TEXT,
    "value" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "assigned_to" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "TaskType" NOT NULL DEFAULT 'TASK',
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performed_by" TEXT,
    "metadata" JSONB,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "assigned_to" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(15,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_products" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "discount_type" "DiscountType" NOT NULL DEFAULT 'percentage',
    "discount_value" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "deal_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_contacts" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "role" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "deal_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_lost_reasons" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_lost_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "FeatureType" NOT NULL DEFAULT 'STATIC',
    "value_type" "FeatureValueType" NOT NULL DEFAULT 'NUMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "module_id" TEXT,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripe_product_id" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_limits" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "value_number" INTEGER,
    "value_boolean" BOOLEAN,
    "value_string" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_wallets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_balance" INTEGER NOT NULL DEFAULT 0,
    "top_up_balance" INTEGER NOT NULL DEFAULT 0,
    "auto_recharge_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_recharge_trigger" INTEGER NOT NULL DEFAULT 10,
    "auto_recharge_amount" INTEGER NOT NULL DEFAULT 100,
    "max_auto_recharges_per_month" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after_plan" INTEGER NOT NULL,
    "balance_after_top_up" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "total_messages_used" INTEGER NOT NULL DEFAULT 0,
    "total_credits_spent" INTEGER NOT NULL DEFAULT 0,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_modules" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "pipeline_ids" UUID[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "debounce_seconds" INTEGER NOT NULL DEFAULT 3,
    "model_id" TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
    "business_hours_config" JSONB,
    "business_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "business_hours_timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "out_of_hours_message" TEXT,
    "follow_up_business_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_business_hours_config" JSONB,
    "follow_up_business_hours_timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "prompt_config" JSONB,
    "follow_up_exhausted_action" TEXT NOT NULL DEFAULT 'NONE',
    "follow_up_exhausted_config" JSONB,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_steps" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "allowed_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activation_requirement" TEXT,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "actions" JSONB,
    "key_question" TEXT,
    "message_template" TEXT,

    CONSTRAINT "agent_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_knowledge_files" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "b2_url" TEXT,
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
    "embedding" vector NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent_id" TEXT NOT NULL,

    CONSTRAINT "agent_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "delay_minutes" INTEGER NOT NULL,
    "message_content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_agent_steps" (
    "id" TEXT NOT NULL,
    "follow_up_id" TEXT NOT NULL,
    "agent_step_id" TEXT NOT NULL,

    CONSTRAINT "follow_up_agent_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "auto_create_deal" BOOLEAN NOT NULL DEFAULT true,
    "distribution_user_ids" UUID[],
    "pipeline_id" UUID,
    "connection_type" "ConnectionType" NOT NULL DEFAULT 'EVOLUTION',
    "meta_access_token" TEXT,
    "meta_phone_display" TEXT,
    "meta_phone_number_id" TEXT,
    "meta_waba_id" TEXT,
    "zapi_instance_id" TEXT,
    "zapi_token" TEXT,
    "zapi_client_token" TEXT,

    CONSTRAINT "inboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "inbox_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "deal_id" TEXT,
    "channel" "InboxChannel" NOT NULL DEFAULT 'WHATSAPP',
    "ai_paused" BOOLEAN NOT NULL DEFAULT false,
    "paused_at" TIMESTAMP(3),
    "remote_jid" TEXT,
    "summary" TEXT,
    "current_step_order" INTEGER NOT NULL DEFAULT 0,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "next_follow_up_at" TIMESTAMP(3),
    "follow_up_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_events" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "type" "ConversationEventType" NOT NULL,
    "tool_name" TEXT,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "visible_to_user" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_events_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "user_integrations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "provider_account_id" TEXT,
    "provider_metadata" JSONB,
    "last_sync_at" TIMESTAMP(3),
    "sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_sync_mappings" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "external_calendar_id" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL DEFAULT 'CRM_TO_EXTERNAL',
    "last_synced_at" TIMESTAMP(3) NOT NULL,
    "external_updated_at" TIMESTAMP(3),
    "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_sync_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "action_url" TEXT,
    "target_org_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT NOT NULL,
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "action_url" TEXT,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_invitation_token_key" ON "members"("invitation_token");

-- CreateIndex
CREATE INDEX "members_organization_id_status_created_at_idx" ON "members"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "members_user_id_status_created_at_idx" ON "members"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "members_user_id_organization_id_idx" ON "members"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_organization_id_email_key" ON "members"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_status_created_at_idx" ON "subscriptions"("organization_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "companies_organization_id_name_idx" ON "companies"("organization_id", "name");

-- CreateIndex
CREATE INDEX "contacts_organization_id_assigned_to_created_at_idx" ON "contacts"("organization_id", "assigned_to", "created_at" DESC);

-- CreateIndex
CREATE INDEX "contacts_organization_id_name_idx" ON "contacts"("organization_id", "name");

-- CreateIndex
CREATE INDEX "contacts_organization_id_email_idx" ON "contacts"("organization_id", "email");

-- CreateIndex
CREATE INDEX "contacts_organization_id_phone_idx" ON "contacts"("organization_id", "phone");

-- CreateIndex
CREATE INDEX "contacts_company_id_organization_id_idx" ON "contacts"("company_id", "organization_id");

-- CreateIndex
CREATE INDEX "pipelines_organization_id_idx" ON "pipelines"("organization_id");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipeline_id_position_idx" ON "pipeline_stages"("pipeline_id", "position");

-- CreateIndex
CREATE INDEX "deals_organization_id_pipeline_stage_id_assigned_to_idx" ON "deals"("organization_id", "pipeline_stage_id", "assigned_to");

-- CreateIndex
CREATE INDEX "deals_organization_id_pipeline_stage_id_created_at_idx" ON "deals"("organization_id", "pipeline_stage_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "deals_organization_id_status_assigned_to_idx" ON "deals"("organization_id", "status", "assigned_to");

-- CreateIndex
CREATE INDEX "deals_organization_id_status_updated_at_idx" ON "deals"("organization_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "deals_organization_id_status_created_at_idx" ON "deals"("organization_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_organization_id_assigned_to_is_completed_due_date_idx" ON "tasks"("organization_id", "assigned_to", "is_completed", "due_date");

-- CreateIndex
CREATE INDEX "tasks_organization_id_is_completed_due_date_idx" ON "tasks"("organization_id", "is_completed", "due_date");

-- CreateIndex
CREATE INDEX "tasks_deal_id_organization_id_idx" ON "tasks"("deal_id", "organization_id");

-- CreateIndex
CREATE INDEX "activities_deal_id_created_at_idx" ON "activities"("deal_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "appointments_organization_id_idx" ON "appointments"("organization_id");

-- CreateIndex
CREATE INDEX "appointments_assigned_to_idx" ON "appointments"("assigned_to");

-- CreateIndex
CREATE INDEX "appointments_deal_id_idx" ON "appointments"("deal_id");

-- CreateIndex
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");

-- CreateIndex
CREATE INDEX "deal_products_deal_id_idx" ON "deal_products"("deal_id");

-- CreateIndex
CREATE INDEX "deal_products_product_id_idx" ON "deal_products"("product_id");

-- CreateIndex
CREATE INDEX "deal_contacts_contact_id_idx" ON "deal_contacts"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_contacts_deal_id_contact_id_key" ON "deal_contacts"("deal_id", "contact_id");

-- CreateIndex
CREATE INDEX "deal_lost_reasons_organization_id_is_active_name_idx" ON "deal_lost_reasons"("organization_id", "is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "features_key_key" ON "features"("key");

-- CreateIndex
CREATE INDEX "features_module_id_idx" ON "features"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "plans_slug_is_active_idx" ON "plans"("slug", "is_active");

-- CreateIndex
CREATE INDEX "plan_limits_feature_id_idx" ON "plan_limits"("feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_limits_plan_id_feature_id_key" ON "plan_limits"("plan_id", "feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_wallets_organization_id_key" ON "credit_wallets"("organization_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_created_at_idx" ON "wallet_transactions"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ai_usages_organization_id_period_year_period_month_key" ON "ai_usages"("organization_id", "period_year", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "modules_slug_key" ON "modules"("slug");

-- CreateIndex
CREATE INDEX "modules_slug_is_active_idx" ON "modules"("slug", "is_active");

-- CreateIndex
CREATE INDEX "plan_modules_module_id_idx" ON "plan_modules"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_modules_plan_id_module_id_key" ON "plan_modules"("plan_id", "module_id");

-- CreateIndex
CREATE INDEX "agents_organization_id_is_active_idx" ON "agents"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "agent_steps_agent_id_order_idx" ON "agent_steps"("agent_id", "order");

-- CreateIndex
CREATE INDEX "agent_knowledge_files_agent_id_status_idx" ON "agent_knowledge_files"("agent_id", "status");

-- CreateIndex
CREATE INDEX "agent_knowledge_chunks_file_id_idx" ON "agent_knowledge_chunks"("file_id");

-- CreateIndex
CREATE INDEX "agent_knowledge_chunks_agent_id_idx" ON "agent_knowledge_chunks"("agent_id");

-- CreateIndex
CREATE INDEX "follow_ups_agent_id_is_active_idx" ON "follow_ups"("agent_id", "is_active");

-- CreateIndex
CREATE INDEX "follow_ups_organization_id_idx" ON "follow_ups"("organization_id");

-- CreateIndex
CREATE INDEX "follow_up_agent_steps_agent_step_id_idx" ON "follow_up_agent_steps"("agent_step_id");

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_agent_steps_follow_up_id_agent_step_id_key" ON "follow_up_agent_steps"("follow_up_id", "agent_step_id");

-- CreateIndex
CREATE UNIQUE INDEX "inboxes_evolution_instance_name_key" ON "inboxes"("evolution_instance_name");

-- CreateIndex
CREATE UNIQUE INDEX "inboxes_zapi_instance_id_key" ON "inboxes"("zapi_instance_id");

-- CreateIndex
CREATE INDEX "inboxes_organization_id_idx" ON "inboxes"("organization_id");

-- CreateIndex
CREATE INDEX "inboxes_agent_id_idx" ON "inboxes"("agent_id");

-- CreateIndex
CREATE INDEX "inboxes_meta_phone_number_id_idx" ON "inboxes"("meta_phone_number_id");

-- CreateIndex
CREATE INDEX "inboxes_zapi_instance_id_idx" ON "inboxes"("zapi_instance_id");

-- CreateIndex
CREATE INDEX "conversations_organization_id_inbox_id_idx" ON "conversations"("organization_id", "inbox_id");

-- CreateIndex
CREATE INDEX "conversations_contact_id_idx" ON "conversations"("contact_id");

-- CreateIndex
CREATE INDEX "conversations_remote_jid_inbox_id_idx" ON "conversations"("remote_jid", "inbox_id");

-- CreateIndex
CREATE INDEX "conversations_deal_id_idx" ON "conversations"("deal_id");

-- CreateIndex
CREATE INDEX "conversations_next_follow_up_at_ai_paused_idx" ON "conversations"("next_follow_up_at", "ai_paused");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_inbox_id_contact_id_channel_key" ON "conversations"("inbox_id", "contact_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "messages_provider_message_id_key" ON "messages"("provider_message_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_is_archived_created_at_idx" ON "messages"("conversation_id", "is_archived", "created_at" DESC);

-- CreateIndex
CREATE INDEX "conversation_events_conversation_id_created_at_idx" ON "conversation_events"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "agent_test_conversations_organization_id_idx" ON "agent_test_conversations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_test_conversations_agent_id_user_id_key" ON "agent_test_conversations"("agent_id", "user_id");

-- CreateIndex
CREATE INDEX "agent_test_messages_test_conversation_id_created_at_idx" ON "agent_test_messages"("test_conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "user_integrations_organization_id_provider_status_idx" ON "user_integrations"("organization_id", "provider", "status");

-- CreateIndex
CREATE INDEX "user_integrations_user_id_provider_idx" ON "user_integrations"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "user_integrations_user_id_organization_id_provider_key" ON "user_integrations"("user_id", "organization_id", "provider");

-- CreateIndex
CREATE INDEX "calendar_sync_mappings_appointment_id_idx" ON "calendar_sync_mappings"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_sync_mappings_integration_id_appointment_id_key" ON "calendar_sync_mappings"("integration_id", "appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_sync_mappings_integration_id_external_event_id_key" ON "calendar_sync_mappings"("integration_id", "external_event_id");

-- CreateIndex
CREATE INDEX "announcements_created_at_idx" ON "announcements"("created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_created_at_idx" ON "notifications"("organization_id", "user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_plan_override_id_fkey" FOREIGN KEY ("plan_override_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_loss_reason_id_fkey" FOREIGN KEY ("loss_reason_id") REFERENCES "deal_lost_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_pipeline_stage_id_fkey" FOREIGN KEY ("pipeline_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_contacts" ADD CONSTRAINT "deal_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_contacts" ADD CONSTRAINT "deal_contacts_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_lost_reasons" ADD CONSTRAINT "deal_lost_reasons_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_limits" ADD CONSTRAINT "plan_limits_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_limits" ADD CONSTRAINT "plan_limits_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_wallets" ADD CONSTRAINT "credit_wallets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "credit_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usages" ADD CONSTRAINT "ai_usages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_steps" ADD CONSTRAINT "agent_steps_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge_files" ADD CONSTRAINT "agent_knowledge_files_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge_chunks" ADD CONSTRAINT "agent_knowledge_chunks_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge_chunks" ADD CONSTRAINT "agent_knowledge_chunks_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "agent_knowledge_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_agent_steps" ADD CONSTRAINT "follow_up_agent_steps_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "follow_ups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_agent_steps" ADD CONSTRAINT "follow_up_agent_steps_agent_step_id_fkey" FOREIGN KEY ("agent_step_id") REFERENCES "agent_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_inbox_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "inboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_test_conversations" ADD CONSTRAINT "agent_test_conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_test_conversations" ADD CONSTRAINT "agent_test_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_test_messages" ADD CONSTRAINT "agent_test_messages_test_conversation_id_fkey" FOREIGN KEY ("test_conversation_id") REFERENCES "agent_test_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_mappings" ADD CONSTRAINT "calendar_sync_mappings_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_mappings" ADD CONSTRAINT "calendar_sync_mappings_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "user_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

