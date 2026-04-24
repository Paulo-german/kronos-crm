-- Remove entradas search_knowledge do campo JSON actions de todos os AgentSteps.
-- A tool passou a ser implícita (injetada automaticamente quando há KB ativa)
-- e não deve mais aparecer como step action configurada.
-- Idempotente: steps sem search_knowledge não são alterados.

UPDATE "agent_steps"
SET "actions" = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements("actions") AS elem
  WHERE elem->>'type' != 'search_knowledge'
)
WHERE "actions" IS NOT NULL
  AND "actions" != 'null'::jsonb
  AND "actions" @> '[{"type": "search_knowledge"}]'::jsonb;
