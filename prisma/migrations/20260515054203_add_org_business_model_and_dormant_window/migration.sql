-- CreateEnum
CREATE TYPE "business_model" AS ENUM ('B2C', 'B2B', 'BOTH');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "business_model" "business_model" NOT NULL DEFAULT 'B2C',
ADD COLUMN     "dormant_after_months" INTEGER NOT NULL DEFAULT 12;
