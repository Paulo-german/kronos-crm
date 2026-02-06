-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'incomplete';

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_fkey";

-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "plan",
DROP COLUMN "subscription_status";

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "plan_id",
DROP COLUMN "user_id",
ADD COLUMN     "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "stripe_price_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL DEFAULT 'active';

-- DropEnum
DROP TYPE "OrganizationPlan";

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
