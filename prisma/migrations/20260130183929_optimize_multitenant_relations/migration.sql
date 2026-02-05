/*
  Warnings:

  - You are about to drop the column `owner_id` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `contact_id` on the `deals` table. All the data in the column will be lost.
  - Added the required column `organization_id` to the `deals` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT "companies_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "deals" DROP CONSTRAINT "deals_contact_id_fkey";

-- DropForeignKey
ALTER TABLE "pipelines" DROP CONSTRAINT "pipelines_created_by_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_owner_id_fkey";

-- AlterTable
ALTER TABLE "contacts" DROP COLUMN "owner_id";

-- AlterTable
ALTER TABLE "deal_contacts" ADD COLUMN     "is_primary" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "role" SET DEFAULT 'Stakeholder';

-- AlterTable
ALTER TABLE "deals" DROP COLUMN "contact_id",
ADD COLUMN     "organization_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
