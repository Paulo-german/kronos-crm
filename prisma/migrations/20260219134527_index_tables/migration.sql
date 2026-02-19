/*
  Warnings:

  - A unique constraint covering the columns `[stripe_customer_id]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "deal_lost_reasons_organization_id_idx";

-- DropIndex
DROP INDEX "wallet_transactions_wallet_id_idx";

-- CreateIndex
CREATE INDEX "activities_deal_id_created_at_idx" ON "activities"("deal_id", "created_at" DESC);

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
CREATE INDEX "deal_contacts_contact_id_idx" ON "deal_contacts"("contact_id");

-- CreateIndex
CREATE INDEX "deal_lost_reasons_organization_id_is_active_name_idx" ON "deal_lost_reasons"("organization_id", "is_active", "name");

-- CreateIndex
CREATE INDEX "deal_products_deal_id_idx" ON "deal_products"("deal_id");

-- CreateIndex
CREATE INDEX "deal_products_product_id_idx" ON "deal_products"("product_id");

-- CreateIndex
CREATE INDEX "deals_organization_id_pipeline_stage_id_assigned_to_idx" ON "deals"("organization_id", "pipeline_stage_id", "assigned_to");

-- CreateIndex
CREATE INDEX "deals_organization_id_pipeline_stage_id_created_at_idx" ON "deals"("organization_id", "pipeline_stage_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "deals_organization_id_status_assigned_to_idx" ON "deals"("organization_id", "status", "assigned_to");

-- CreateIndex
CREATE INDEX "deals_organization_id_status_updated_at_idx" ON "deals"("organization_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "members_organization_id_status_created_at_idx" ON "members"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "members_user_id_status_created_at_idx" ON "members"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "members_user_id_organization_id_idx" ON "members"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipeline_id_position_idx" ON "pipeline_stages"("pipeline_id", "position");

-- CreateIndex
CREATE INDEX "pipelines_organization_id_idx" ON "pipelines"("organization_id");

-- CreateIndex
CREATE INDEX "plan_limits_feature_id_idx" ON "plan_limits"("feature_id");

-- CreateIndex
CREATE INDEX "plans_slug_is_active_idx" ON "plans"("slug", "is_active");

-- CreateIndex
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_status_created_at_idx" ON "subscriptions"("organization_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_organization_id_assigned_to_is_completed_due_date_idx" ON "tasks"("organization_id", "assigned_to", "is_completed", "due_date");

-- CreateIndex
CREATE INDEX "tasks_organization_id_is_completed_due_date_idx" ON "tasks"("organization_id", "is_completed", "due_date" ASC);

-- CreateIndex
CREATE INDEX "tasks_deal_id_organization_id_idx" ON "tasks"("deal_id", "organization_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_created_at_idx" ON "wallet_transactions"("wallet_id", "created_at" DESC);
