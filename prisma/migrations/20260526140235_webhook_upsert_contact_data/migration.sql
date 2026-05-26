-- DataMigration: converter eventos de contato legados para UPSERT_CONTACT
-- Executado em transação separada pois PostgreSQL não permite usar novo valor de enum
-- na mesma transação em que foi adicionado (error 55P04).
UPDATE webhook_sources SET event_type = 'UPSERT_CONTACT' WHERE event_type IN ('NEW_CONTACT', 'UPDATE_CONTACT');
