-- Add assignedTo field to Contact model
-- Fase 1 requirement: Contact and Deal should have assignedTo field

-- Add nullable column first
ALTER TABLE "contacts" ADD COLUMN "assigned_to" TEXT;

-- Add foreign key constraint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assigned_to_fkey"
    FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
