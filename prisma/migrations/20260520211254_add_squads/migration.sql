-- CreateEnum
CREATE TYPE "squad_type" AS ENUM ('SALES', 'SUPPORT', 'CS', 'GENERAL');

-- CreateEnum
CREATE TYPE "squad_role" AS ENUM ('LEADER', 'SDR', 'CLOSER', 'FARMER', 'SUPPORT', 'MEMBER');

-- AlterTable
ALTER TABLE "inboxes" ADD COLUMN     "squad_id" TEXT;

-- CreateTable
CREATE TABLE "squads" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "type" "squad_type" NOT NULL DEFAULT 'GENERAL',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "distribution_model" "sales_distribution_model" NOT NULL DEFAULT 'ROUND_ROBIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "squads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squad_members" (
    "id" TEXT NOT NULL,
    "squad_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "squad_role" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "squad_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "squads_organization_id_idx" ON "squads"("organization_id");

-- CreateIndex
CREATE INDEX "squad_members_squad_id_idx" ON "squad_members"("squad_id");

-- CreateIndex
CREATE UNIQUE INDEX "squad_members_squad_id_user_id_key" ON "squad_members"("squad_id", "user_id");

-- CreateIndex
CREATE INDEX "inboxes_squad_id_idx" ON "inboxes"("squad_id");

-- AddForeignKey
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squads" ADD CONSTRAINT "squads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

