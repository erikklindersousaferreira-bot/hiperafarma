-- Migration 0008: permite produtos com o MESMO NOME (códigos diferentes).
-- Rode no SQL Editor do Supabase do sistema de solicitação (projeto iqcqcpjbxjwzmwrpoiya).
--
-- Por quê: o sistema da loja corta o nome em 30 letras, então sabores/versões diferentes
-- ficam com nome igual (ex.: "100% PURE WHEY POTE 900G SABOR" de vários sabores), cada um
-- com seu código. A trava de "nome único" impedia importar a lista.
-- O que identifica o produto passa a ser o CÓDIGO (único quando preenchido).
-- Não apaga nem altera nenhum dado.

alter table produtos drop constraint if exists produtos_nome_key;
drop index if exists produtos_nome_key;

create unique index if not exists produtos_codigo_unico on produtos (codigo) where codigo is not null;
create index if not exists produtos_nome_idx on produtos (nome);
