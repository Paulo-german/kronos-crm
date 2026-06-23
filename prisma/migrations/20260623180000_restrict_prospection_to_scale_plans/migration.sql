-- Prospection passa a ser disponível somente a partir do plano Scale.
-- A migration anterior (register_prospection_module) liberou o módulo em todos
-- os planos ativos; aqui removemos o vínculo dos planos abaixo de Scale
-- (light, essential). O acesso avulso (add-on) será tratado à parte.

DELETE FROM "plan_modules"
WHERE "module_id" = (SELECT "id" FROM "modules" WHERE "slug" = 'prospection')
  AND "plan_id" IN (
    SELECT "id" FROM "plans" WHERE "slug" IN ('light', 'essential')
  );
