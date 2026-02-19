-- =============================================================================
-- KRONOS CRM — Migration V3.2
-- Planos DB-driven + Infraestrutura de Créditos (Dual Bucket)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE "FeatureType" AS ENUM ('STATIC', 'METERED');
CREATE TYPE "FeatureValueType" AS ENUM ('NUMBER', 'BOOLEAN', 'STRING');
CREATE TYPE "WalletTransactionType" AS ENUM (
  'CREDIT_PURCHASE',
  'USAGE_DEBIT',
  'MONTHLY_RESET',
  'AUTO_RECHARGE',
  'MANUAL_ADJUSTMENT',
  'REFUND',
  'SYSTEM_REFUND',
  'EXPIRATION'
);

-- ActivityType: novos valores (drift pré-existente)
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'assignee_changed';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'priority_changed';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'deal_paused';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'deal_unpaused';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'date_changed';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'contact_added';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'contact_removed';

-- -----------------------------------------------------------------------------
-- DRIFT PRÉ-EXISTENTE (tabelas/colunas que já deveriam existir)
-- -----------------------------------------------------------------------------

-- deal_lost_reasons
CREATE TABLE IF NOT EXISTS "deal_lost_reasons" (
    "id"              TEXT        NOT NULL,
    "organization_id" TEXT        NOT NULL,
    "name"            TEXT        NOT NULL,
    "is_active"       BOOLEAN     NOT NULL DEFAULT true,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deal_lost_reasons_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "deal_lost_reasons_organization_id_idx"
    ON "deal_lost_reasons"("organization_id");

-- activities: coluna performed_by
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "performed_by" TEXT;

-- deals: coluna loss_reason_id
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "loss_reason_id" TEXT;

-- organizations: campos de trial e bloqueio
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "is_read_only"  BOOLEAN NOT NULL DEFAULT false;

-- subscriptions: FK para plano
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan_id" TEXT;

-- -----------------------------------------------------------------------------
-- PLANOS DB-DRIVEN
-- -----------------------------------------------------------------------------

-- Feature: catálogo de funcionalidades
CREATE TABLE "features" (
    "id"         TEXT             NOT NULL,
    "key"         TEXT             NOT NULL,
    "name"        TEXT             NOT NULL,
    "description" TEXT,
    "type"        "FeatureType"    NOT NULL DEFAULT 'STATIC',
    "value_type" "FeatureValueType" NOT NULL DEFAULT 'NUMBER',
    "created_at" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "features_key_key" ON "features"("key");

-- Plan: catálogo de planos
CREATE TABLE "plans" (
    "id"                TEXT         NOT NULL,
    "slug"              TEXT         NOT NULL,
    "name"              TEXT         NOT NULL,
    "stripe_product_id" TEXT,
    "description"       TEXT,
    "is_active"         BOOLEAN      NOT NULL DEFAULT true,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- PlanLimit: valores de cada feature por plano
-- NOTA: value_number usa INTEGER pois créditos são unidades inteiras
CREATE TABLE "plan_limits" (
    "id"            TEXT         NOT NULL,
    "plan_id"       TEXT         NOT NULL,
    "feature_id"    TEXT         NOT NULL,
    "value_number"  INTEGER,
    "value_boolean" BOOLEAN,
    "value_string"  TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plan_limits_plan_id_feature_id_key"
    ON "plan_limits"("plan_id", "feature_id");

-- -----------------------------------------------------------------------------
-- INFRAESTRUTURA DE CRÉDITOS IA
-- -----------------------------------------------------------------------------

-- CreditWallet: Dual Bucket (planBalance + topUpBalance)
-- NOTA: Saldos são INTEGER — créditos são unidade virtual inteira (sem centavos)
CREATE TABLE "credit_wallets" (
    "id"                          TEXT         NOT NULL,
    "organization_id"             TEXT         NOT NULL,

    -- BUCKET 1: Franquia mensal (Use-it-or-lose-it, reseta todo ciclo)
    "plan_balance"                INTEGER      NOT NULL DEFAULT 0,

    -- BUCKET 2: Créditos comprados (perpétuos, nunca expiram)
    "top_up_balance"              INTEGER      NOT NULL DEFAULT 0,

    -- Auto-Recarga Inteligente
    "auto_recharge_enabled"       BOOLEAN      NOT NULL DEFAULT false,
    -- Gatilho: recarga quando (plan_balance + top_up_balance) < trigger
    "auto_recharge_trigger"       INTEGER      NOT NULL DEFAULT 10,
    -- Ação: quantidade de créditos adicionados ao top_up_balance na recarga
    "auto_recharge_amount"        INTEGER      NOT NULL DEFAULT 100,
    -- Trava de segurança: máximo de recargas automáticas por mês
    "max_auto_recharges_per_month" INTEGER     NOT NULL DEFAULT 5,

    "created_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "credit_wallets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "credit_wallets_organization_id_key"
    ON "credit_wallets"("organization_id");

-- CONSTRAINT CRÍTICA: O banco nunca aceita saldo negativo.
-- Essa é a última linha de defesa contra race conditions e bugs de débito.
ALTER TABLE "credit_wallets"
    ADD CONSTRAINT "chk_balances_non_negative"
    CHECK (plan_balance >= 0 AND top_up_balance >= 0);

-- WalletTransaction: extrato imutável (apenas INSERT, nunca UPDATE/DELETE)
-- Snapshot dual-bucket: registra o estado de CADA bucket após a transação
CREATE TABLE "wallet_transactions" (
    "id"                   TEXT                   NOT NULL,
    "wallet_id"            TEXT                   NOT NULL,
    "type"                 "WalletTransactionType" NOT NULL,
    -- Positivo para créditos, negativo para débitos
    "amount"               INTEGER                NOT NULL,
    -- Snapshot pós-transação: permite auditoria sem recalcular histórico
    "balance_after_plan"   INTEGER                NOT NULL,
    "balance_after_top_up" INTEGER                NOT NULL,
    -- Descrição legível para o extrato do cliente (obrigatório)
    "description"          TEXT                   NOT NULL,
    -- Detalhes técnicos: ticket_id, tokens consumidos, modelo de IA, etc.
    "metadata"             JSONB,
    "created_at"           TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "wallet_transactions_wallet_id_idx" ON "wallet_transactions"("wallet_id");

-- AiUsage: histórico por período para BI e Analytics
-- Modelo por período (year/month) permite gráficos históricos sem recalcular transações
CREATE TABLE "ai_usages" (
    "id"                  TEXT         NOT NULL,
    "organization_id"     TEXT         NOT NULL,
    "total_messages_used" INTEGER      NOT NULL DEFAULT 0,
    "total_credits_spent" INTEGER      NOT NULL DEFAULT 0,
    "period_year"         INTEGER      NOT NULL,
    "period_month"        INTEGER      NOT NULL,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_usages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ai_usages_organization_id_period_year_period_month_key"
    ON "ai_usages"("organization_id", "period_year", "period_month");

-- -----------------------------------------------------------------------------
-- FOREIGN KEYS
-- -----------------------------------------------------------------------------

ALTER TABLE "deal_lost_reasons"
    ADD CONSTRAINT "deal_lost_reasons_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activities"
    ADD CONSTRAINT "activities_performed_by_fkey"
    FOREIGN KEY ("performed_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deals"
    ADD CONSTRAINT "deals_loss_reason_id_fkey"
    FOREIGN KEY ("loss_reason_id") REFERENCES "deal_lost_reasons"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "plan_limits"
    ADD CONSTRAINT "plan_limits_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plan_limits"
    ADD CONSTRAINT "plan_limits_feature_id_fkey"
    FOREIGN KEY ("feature_id") REFERENCES "features"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "credit_wallets"
    ADD CONSTRAINT "credit_wallets_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_wallet_id_fkey"
    FOREIGN KEY ("wallet_id") REFERENCES "credit_wallets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_usages"
    ADD CONSTRAINT "ai_usages_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
