/*
  Warnings:

  - You are about to drop the column `cost_per_credit_usd` on the `business_reports` table. All the data in the column will be lost.
  - You are about to drop the column `exchange_rate_brl` on the `business_reports` table. All the data in the column will be lost.
  - You are about to drop the column `fixed_cost_infra` on the `business_reports` table. All the data in the column will be lost.
  - You are about to drop the column `fixed_cost_other` on the `business_reports` table. All the data in the column will be lost.
  - You are about to drop the column `fixed_cost_payroll` on the `business_reports` table. All the data in the column will be lost.
  - You are about to drop the column `fixed_cost_tools` on the `business_reports` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "business_reports" DROP COLUMN "cost_per_credit_usd",
DROP COLUMN "exchange_rate_brl",
DROP COLUMN "fixed_cost_infra",
DROP COLUMN "fixed_cost_other",
DROP COLUMN "fixed_cost_payroll",
DROP COLUMN "fixed_cost_tools",
ADD COLUMN     "ai_monthly_cost_brl" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cost_items" JSONB NOT NULL DEFAULT '[]';
