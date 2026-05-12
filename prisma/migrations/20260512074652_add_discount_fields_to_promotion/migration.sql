-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "discount_type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "discount_value" DECIMAL(15,2) NOT NULL DEFAULT 0;
