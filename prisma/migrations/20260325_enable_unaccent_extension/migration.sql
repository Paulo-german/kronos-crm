-- Habilita a extensão unaccent para suporte a busca sem acentos
-- Usada pela busca global para normalizar strings via unaccent() no Postgres
CREATE EXTENSION IF NOT EXISTS unaccent;
