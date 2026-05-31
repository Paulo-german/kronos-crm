-- CreateEnum
CREATE TYPE "legal_basis" AS ENUM ('CONSENT', 'LEGITIMATE_INTEREST', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK');

-- CreateEnum
CREATE TYPE "legal_basis_source" AS ENUM ('MANUAL_CREATION', 'IMPORT', 'EMBED_FORM', 'WHATSAPP_INBOUND', 'API', 'ADMIN_UPDATE');

-- CreateEnum
CREATE TYPE "consent_event_type" AS ENUM ('GRANTED', 'WITHDRAWN', 'UPDATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "dsr_request_type" AS ENUM ('ACCESS', 'ERASURE', 'PORTABILITY', 'RECTIFICATION', 'OBJECTION');

-- CreateEnum
CREATE TYPE "dsr_request_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- AlterTable
ALTER TABLE "capture_forms" ADD COLUMN     "consent_required" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "consent_text" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "anonymized_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "contact_privacy" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "legal_basis" "legal_basis" NOT NULL,
    "legal_basis_source" "legal_basis_source" NOT NULL,
    "consent_text" TEXT,
    "consent_version" TEXT,
    "consented_at" TIMESTAMP(3),
    "consent_ip" TEXT,
    "ccpa_sale_opt_out" BOOLEAN NOT NULL DEFAULT false,
    "ccpa_known_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_privacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_events" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "privacy_id" TEXT NOT NULL,
    "event_type" "consent_event_type" NOT NULL,
    "legal_basis" "legal_basis" NOT NULL,
    "legal_basis_source" "legal_basis_source" NOT NULL,
    "consent_text" TEXT,
    "consent_ip" TEXT,
    "performed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_activities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purposes" TEXT[],
    "data_categories" TEXT[],
    "data_subject_types" TEXT[],
    "legal_basis" "legal_basis" NOT NULL,
    "recipients" TEXT[],
    "international_transfer" BOOLEAN NOT NULL DEFAULT false,
    "transfer_safeguards" TEXT,
    "retention_period" TEXT NOT NULL,
    "security_measures" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_blocklist" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'GDPR_ERASURE',
    "blocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocked_by" TEXT,

    CONSTRAINT "email_blocklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dsr_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "request_type" "dsr_request_type" NOT NULL,
    "status" "dsr_request_status" NOT NULL DEFAULT 'PENDING',
    "requester_email" TEXT NOT NULL,
    "requester_name" TEXT,
    "notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dsr_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_privacy_contact_id_key" ON "contact_privacy"("contact_id");

-- CreateIndex
CREATE INDEX "consent_events_contact_id_idx" ON "consent_events"("contact_id");

-- CreateIndex
CREATE INDEX "processing_activities_organization_id_idx" ON "processing_activities"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_blocklist_organization_id_email_key" ON "email_blocklist"("organization_id", "email");

-- CreateIndex
CREATE INDEX "dsr_requests_organization_id_status_idx" ON "dsr_requests"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "contact_privacy" ADD CONSTRAINT "contact_privacy_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_privacy_id_fkey" FOREIGN KEY ("privacy_id") REFERENCES "contact_privacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_activities" ADD CONSTRAINT "processing_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_blocklist" ADD CONSTRAINT "email_blocklist_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dsr_requests" ADD CONSTRAINT "dsr_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
