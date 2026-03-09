/*
  Warnings:

  - You are about to drop the column `owner_id` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `owner_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `billing_plan` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_customer_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_status` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT "companies_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "pipelines" DROP CONSTRAINT "pipelines_created_by_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_owner_id_fkey";

-- AlterTable
ALTER TABLE "companies" DROP COLUMN "owner_id";

-- AlterTable
ALTER TABLE "pipelines" DROP COLUMN "created_by";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "owner_id";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "billing_plan",
DROP COLUMN "role",
DROP COLUMN "stripe_customer_id",
DROP COLUMN "subscription_status";

-- DropEnum
DROP TYPE "BillingPlan";

-- DropEnum
DROP TYPE "Role";
