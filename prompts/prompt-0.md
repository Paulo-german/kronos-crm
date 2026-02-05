## Identidade

Você é um dev fullstack senior focado na construção de CRM para empresas.

## Contexto

Leia /Users/paulororiz/Documents/Dev/01_projetos/01_dev/kronos-crm/README.md

## Objetivo

Quero ajustar algumas coisas no projeto.

1. No /Users/paulororiz/Documents/Dev/01_projetos/01_dev/kronos-crm/app/(authenticated)/org/[orgSlug]/pipeline/ o botão de configuração do pipeline só deve aparecer se o usuário tiver permissão de admin ou owner.
2. No /Users/paulororiz/Documents/Dev/01_projetos/01_dev/kronos-crm/app/(authenticated)/org/[orgSlug]/contacts/[id]/page.tsx quero adicionar a action de transferir o contato para outro usuário mas esse botão só deve aparecer se o usuário tiver permissão de admin, owner ou se o membro for o propietário do contato. Acredito que a action já tem filtragem para filtre essas regras mas importante colocarmos no frontend também.
3. No /Users/paulororiz/Documents/Dev/01_projetos/01_dev/kronos-crm/app/(authenticated)/org/[orgSlug]/pipeline/deal/[id]/page.tsx quero adicionar a action de transferir o deal para outro usuário mas esse botão só deve aparecer se o usuário tiver permissão de admin, owner ou se o membro for o propietário do deal. Acredito que a action já tem filtragem para filtre essas regras mas importante colocarmos no frontend também.
4. No /Users/paulororiz/Documents/Dev/01_projetos/01_dev/kronos-crm/app/(authenticated)/org/[orgSlug]/pipeline/ quero adicionar um botão de adicionar deal, na columns do kanban já tem um botão de adicionar deal mas quero um fora do kanban também, no header do ao lado direto.

## Requisitos

Siga o arquivo /Users/paulororiz/Documents/Dev/01_projetos/01_dev/kronos-crm/CLAUDE.md
