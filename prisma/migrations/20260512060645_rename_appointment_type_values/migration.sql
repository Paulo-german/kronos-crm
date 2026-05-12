-- Rename enum values in-place to preserve data.
-- Prisma would otherwise generate a destructive DROP+CREATE, which loses rows.
ALTER TYPE "AppointmentType" RENAME VALUE 'COMMERCIAL' TO 'MEETING';
ALTER TYPE "AppointmentType" RENAME VALUE 'SERVICE' TO 'BOOKING';

-- Update default on appointments.type column (depends on enum literal name)
ALTER TABLE "appointments" ALTER COLUMN "type" SET DEFAULT 'MEETING';
