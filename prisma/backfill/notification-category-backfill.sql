-- ============================================================================
-- Backfill de notifications.category (registros pré-migração ficam NULL)
-- ----------------------------------------------------------------------------
-- Espelha a derivação de app/_lib/notifications/notification-category.ts
-- (resolveCategoryFromSource) — manter as duas em sincronia.
--
-- Rodar MANUALMENTE no SQL editor do Supabase APÓS o deploy da migration
-- 20260616043759_notification_category_nullable. Idempotente (WHERE category IS NULL).
-- ============================================================================

UPDATE notifications
SET category = (
  CASE
    WHEN type = 'SYSTEM' THEN 'ALERTS'
    WHEN type = 'PLATFORM_ANNOUNCEMENT' THEN 'ANNOUNCEMENTS'
    WHEN type = 'USER_ACTION'
         AND resource_type = 'member'
         AND action_url LIKE '%/invite/%' THEN 'ACTIONS'
    WHEN type = 'USER_ACTION'
         AND resource_type = 'member' THEN 'ANNOUNCEMENTS'
    WHEN type = 'USER_ACTION' THEN 'ASSIGNMENTS'
    ELSE 'GENERAL'
  END
)::"NotificationCategory"
WHERE category IS NULL;
