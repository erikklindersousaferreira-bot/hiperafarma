-- Migration: caixa/unidade por item de pedido.
-- Rode este script no SQL Editor do Supabase (projeto iqcqcpjbxjwzmwrpoiya) antes do deploy do novo frontend.
-- Totalmente aditiva: nenhuma coluna, tabela ou linha existente é removida ou sobrescrita.

-- Cada item de pedido passa a guardar se a quantidade pedida se refere a "caixa" ou
-- "unidade". Itens já existentes (criados antes desse campo existir) ficam com o valor
-- nulo, tratados no frontend como "não informado" — não fazemos backfill inventando um
-- valor que não temos como confirmar no histórico.
alter table pedido_itens
  add column if not exists unidade_medida text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pedido_itens_unidade_medida_check'
  ) then
    alter table pedido_itens
      add constraint pedido_itens_unidade_medida_check
      check (unidade_medida is null or unidade_medida in ('caixa', 'unidade'));
  end if;
end $$;

create index if not exists idx_pedido_itens_unidade_medida
  on pedido_itens (unidade_medida);
