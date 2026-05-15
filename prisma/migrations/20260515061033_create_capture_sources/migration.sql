-- CreateEnum
CREATE TYPE "capture_channel" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'WEBSITE_CHAT', 'EMBED_FORM', 'FACEBOOK_LEAD', 'API', 'PHONE_CALL', 'IN_PERSON', 'EVENT', 'EMAIL', 'REFERRAL', 'IMPORT', 'UNKNOWN');

-- CreateTable
CREATE TABLE "capture_sources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "channel" "capture_channel" NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_ad_hoc" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" TEXT,
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capture_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "capture_sources_organization_id_channel_is_active_idx" ON "capture_sources"("organization_id", "channel", "is_active");

-- CreateIndex
CREATE INDEX "capture_sources_organization_id_is_ad_hoc_idx" ON "capture_sources"("organization_id", "is_ad_hoc");

-- AddForeignKey
ALTER TABLE "capture_sources" ADD CONSTRAINT "capture_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
