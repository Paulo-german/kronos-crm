-- CreateTable
CREATE TABLE "capture_form_fields" (
    "capture_form_id" TEXT NOT NULL,
    "field_definition_id" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "label_override" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "capture_form_fields_pkey" PRIMARY KEY ("capture_form_id","field_definition_id")
);

-- CreateTable
CREATE TABLE "capture_submissions" (
    "id" TEXT NOT NULL,
    "capture_form_id" TEXT NOT NULL,
    "capture_event_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "snapshot" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capture_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "capture_form_fields_capture_form_id_position_idx" ON "capture_form_fields"("capture_form_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "capture_submissions_capture_event_id_key" ON "capture_submissions"("capture_event_id");

-- CreateIndex
CREATE INDEX "capture_submissions_capture_form_id_submitted_at_idx" ON "capture_submissions"("capture_form_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "capture_submissions_contact_id_idx" ON "capture_submissions"("contact_id");

-- AddForeignKey
ALTER TABLE "capture_form_fields" ADD CONSTRAINT "capture_form_fields_capture_form_id_fkey" FOREIGN KEY ("capture_form_id") REFERENCES "capture_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capture_form_fields" ADD CONSTRAINT "capture_form_fields_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capture_submissions" ADD CONSTRAINT "capture_submissions_capture_form_id_fkey" FOREIGN KEY ("capture_form_id") REFERENCES "capture_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capture_submissions" ADD CONSTRAINT "capture_submissions_capture_event_id_fkey" FOREIGN KEY ("capture_event_id") REFERENCES "capture_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capture_submissions" ADD CONSTRAINT "capture_submissions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
