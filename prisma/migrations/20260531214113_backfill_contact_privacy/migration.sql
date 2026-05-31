-- Backfill: criar ContactPrivacy + ConsentEvent para todos os contatos existentes.
-- Idempotente: WHERE NOT EXISTS garante re-execução segura sem duplicatas.

-- Passo 1: ContactPrivacy — base legal derivada do canal de origem do contato.
INSERT INTO "contact_privacy" (
  "id",
  "contact_id",
  "legal_basis",
  "legal_basis_source",
  "consented_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  c."id",
  CASE c."first_capture_channel"
    WHEN 'EMBED_FORM'    THEN 'CONSENT'::legal_basis
    WHEN 'FACEBOOK_LEAD' THEN 'CONSENT'::legal_basis
    ELSE                      'LEGITIMATE_INTEREST'::legal_basis
  END,
  CASE c."first_capture_channel"
    WHEN 'EMBED_FORM'     THEN 'EMBED_FORM'::legal_basis_source
    WHEN 'FACEBOOK_LEAD'  THEN 'EMBED_FORM'::legal_basis_source
    WHEN 'WHATSAPP'       THEN 'WHATSAPP_INBOUND'::legal_basis_source
    WHEN 'INSTAGRAM'      THEN 'WHATSAPP_INBOUND'::legal_basis_source
    WHEN 'WEBSITE_CHAT'   THEN 'WHATSAPP_INBOUND'::legal_basis_source
    WHEN 'PHONE_CALL'     THEN 'MANUAL_CREATION'::legal_basis_source
    WHEN 'IN_PERSON'      THEN 'MANUAL_CREATION'::legal_basis_source
    WHEN 'IMPORT'         THEN 'IMPORT'::legal_basis_source
    ELSE                       'API'::legal_basis_source
  END,
  CASE
    WHEN c."first_capture_channel" IN ('EMBED_FORM', 'FACEBOOK_LEAD')
    THEN COALESCE(c."first_capture_at", c."created_at")
    ELSE NULL
  END,
  NOW(),
  NOW()
FROM "contacts" c
WHERE NOT EXISTS (
  SELECT 1 FROM "contact_privacy" cp WHERE cp."contact_id" = c."id"
);

-- Passo 2: ConsentEvent GRANTED — um por ContactPrivacy, marca o estado inicial.
INSERT INTO "consent_events" (
  "id",
  "contact_id",
  "privacy_id",
  "event_type",
  "legal_basis",
  "legal_basis_source",
  "performed_by",
  "notes",
  "created_at"
)
SELECT
  gen_random_uuid(),
  cp."contact_id",
  cp."id",
  'GRANTED'::consent_event_type,
  cp."legal_basis",
  cp."legal_basis_source",
  NULL,
  'Backfill automático da migração de compliance',
  NOW()
FROM "contact_privacy" cp
WHERE NOT EXISTS (
  SELECT 1 FROM "consent_events" ce WHERE ce."privacy_id" = cp."id"
);
