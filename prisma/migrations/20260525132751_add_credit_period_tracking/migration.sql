-- AlterTable
ALTER TABLE "credit_wallets" ADD COLUMN     "credits_last_reset_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "current_period_start" TIMESTAMP(3);
