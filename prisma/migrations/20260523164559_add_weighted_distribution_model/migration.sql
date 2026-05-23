-- AlterEnum
ALTER TYPE "sales_distribution_model" ADD VALUE 'WEIGHTED';

-- AlterTable
ALTER TABLE "squad_members" ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 1;
