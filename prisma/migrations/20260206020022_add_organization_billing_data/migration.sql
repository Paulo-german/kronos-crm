-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('PJ', 'PF');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "billing_city" TEXT,
ADD COLUMN     "billing_complement" TEXT,
ADD COLUMN     "billing_contact_email" TEXT,
ADD COLUMN     "billing_contact_name" TEXT,
ADD COLUMN     "billing_contact_phone" TEXT,
ADD COLUMN     "billing_country" TEXT DEFAULT 'BR',
ADD COLUMN     "billing_neighborhood" TEXT,
ADD COLUMN     "billing_number" TEXT,
ADD COLUMN     "billing_state" TEXT,
ADD COLUMN     "billing_street" TEXT,
ADD COLUMN     "billing_zip_code" TEXT,
ADD COLUMN     "is_simples" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legal_name" TEXT,
ADD COLUMN     "person_type" "PersonType",
ADD COLUMN     "tax_id" TEXT,
ADD COLUMN     "trade_name" TEXT;
