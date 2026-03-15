-- Migration: rename create_appointment -> create_event no JSON actions dos AgentStep
-- Converte o campo `title` para `titleInstructions` e adiciona `duration: 60` como default
UPDATE agent_steps
SET actions = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'type' = 'create_appointment'
      THEN jsonb_set(
        elem - 'title',
        '{type}', '"create_event"'::jsonb
      ) || jsonb_build_object(
        'titleInstructions', elem->>'title',
        'duration', 60
      )
      ELSE elem
    END
  )
  FROM jsonb_array_elements(actions::jsonb) AS elem
)
WHERE actions IS NOT NULL
  AND actions::text LIKE '%create_appointment%';
