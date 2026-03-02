-- Recalibrar limites de créditos IA para billing baseado em tokens.
-- Sonnet (~10 créditos/msg), Flash (~1 crédito/msg).
-- Light: 300 → 3.000, Essential: 800 → 8.000, Scale: 1.800 → 18.000, Enterprise: 2.500 → 25.000.

UPDATE plan_limits SET value_number = 3000
WHERE feature_id = (SELECT id FROM plan_features WHERE key = 'ai.monthly_credits')
AND plan_id = (SELECT id FROM plans WHERE slug = 'light');

UPDATE plan_limits SET value_number = 8000
WHERE feature_id = (SELECT id FROM plan_features WHERE key = 'ai.monthly_credits')
AND plan_id = (SELECT id FROM plans WHERE slug = 'essential');

UPDATE plan_limits SET value_number = 18000
WHERE feature_id = (SELECT id FROM plan_features WHERE key = 'ai.monthly_credits')
AND plan_id = (SELECT id FROM plans WHERE slug = 'scale');

UPDATE plan_limits SET value_number = 25000
WHERE feature_id = (SELECT id FROM plan_features WHERE key = 'ai.monthly_credits')
AND plan_id = (SELECT id FROM plans WHERE slug = 'enterprise');
