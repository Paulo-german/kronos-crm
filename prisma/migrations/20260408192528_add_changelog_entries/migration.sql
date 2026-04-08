-- CreateEnum
CREATE TYPE "changelog_entry_type" AS ENUM ('NEW', 'IMPROVEMENT', 'FIX');

-- CreateTable
CREATE TABLE "changelog_entries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "changelog_entry_type" NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "changelog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "changelog_entries_is_published_published_at_idx" ON "changelog_entries"("is_published", "published_at" DESC);

-- CreateIndex
CREATE INDEX "changelog_entries_created_at_idx" ON "changelog_entries"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
