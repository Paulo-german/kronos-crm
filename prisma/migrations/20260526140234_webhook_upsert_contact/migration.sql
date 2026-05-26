-- AlterEnum
ALTER TYPE "webhook_event_type" ADD VALUE 'UPSERT_CONTACT';

-- DataMigration: converter eventos de contato legados para UPSERT_CONTACT
UPDATE webhook_sources SET event_type = 'UPSERT_CONTACT' WHERE event_type IN ('NEW_CONTACT', 'UPDATE_CONTACT');
