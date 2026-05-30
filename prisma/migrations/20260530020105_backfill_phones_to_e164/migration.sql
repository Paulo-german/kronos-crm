-- Backfill: converte phones legados para E.164 (+DDI + número)
-- Números com > 11 dígitos: adiciona '+' (já têm DDI)
-- Números com 10-11 dígitos: adiciona '+55' (Brasil sem DDI)
-- Números com < 10 dígitos ou já no formato E.164: não toca

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