-- CreateTable
CREATE TABLE "business_reports" (
    "id" TEXT NOT NULL,
    "singleton_key" TEXT NOT NULL DEFAULT 'singleton',
    "fixed_cost_infra" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fixed_cost_tools" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fixed_cost_payroll" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fixed_cost_other" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost_per_credit_usd" DECIMAL(12,8) NOT NULL DEFAULT 0,
    "exchange_rate_brl" DECIMAL(8,4) NOT NULL DEFAULT 5.70,
    "target_margin_pct" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_reports_singleton_key_key" ON "business_reports"("singleton_key");
