-- Renomeia os valores do campo agent_version para a taxonomia canonical.
-- Backward compat: o router aceita tanto legacy quanto canonical via alias map.
UPDATE agents SET agent_version = 'single-v1' WHERE agent_version = 'v1';
UPDATE agents SET agent_version = 'single-v2' WHERE agent_version = 'v2';
UPDATE agents SET agent_version = 'crew-v1' WHERE agent_version = 'v3';

ALTER TABLE agents ALTER COLUMN agent_version SET DEFAULT 'single-v1';
