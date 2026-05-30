-- Migração de telefones para formato E.164
-- Converte números no formato legado (dígitos brutos/mascarados) para E.164 (+DDI + número)
-- Regras:
--   - Já começa com '+' → não toca
--   - Apenas dígitos, comprimento > 11 → já tem DDI, só adiciona '+'
--   - Apenas dígitos, comprimento 10-11 → número BR sem DDI, adiciona '+55'
--   - Comprimento < 10 → dado inválido, não toca

BEGIN;

UPDATE users
SET phone = CASE
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') = '' THEN phone
  WHEN LENGTH(regexp_replace(phone, '[^0-9]', '', 'g')) > 11
    THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
  WHEN LENGTH(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10
    THEN '+55' || regexp_replace(phone, '[^0-9]', '', 'g')
  ELSE phone
END
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone NOT LIKE '+%';

UPDATE contacts
SET phone = CASE
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') = '' THEN phone
  WHEN LENGTH(regexp_replace(phone, '[^0-9]', '', 'g')) > 11
    THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
  WHEN LENGTH(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10
    THEN '+55' || regexp_replace(phone, '[^0-9]', '', 'g')
  ELSE phone
END
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone NOT LIKE '+%';

UPDATE professionals
SET phone = CASE
  WHEN regexp_replace(phone, '[^0-9]', '', 'g') = '' THEN phone
  WHEN LENGTH(regexp_replace(phone, '[^0-9]', '', 'g')) > 11
    THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
  WHEN LENGTH(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10
    THEN '+55' || regexp_replace(phone, '[^0-9]', '', 'g')
  ELSE phone
END
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone NOT LIKE '+%';

COMMIT;
