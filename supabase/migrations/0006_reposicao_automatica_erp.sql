-- Migration: reposição automática vinda do ERP + aba "Estoque das Farmácias".
-- Rode este script no SQL Editor do Supabase do sistema de solicitação (projeto iqcqcpjbxjwzmwrpoiya).
-- Totalmente aditiva: nada existente é removido ou alterado.

-- 1) Origem do pedido: manual (feito pela farmácia) ou automatica (gerado pelo ERP).
alter table pedidos add column if not exists origem text not null default 'manual';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_origem_check') then
    alter table pedidos add constraint pedidos_origem_check check (origem in ('manual', 'automatica'));
  end if;
end $$;
create index if not exists idx_pedidos_origem on pedidos (origem) where origem = 'automatica';

-- 2) No estoque vindo do ERP: a regra de reposição de cada produto (pra destacar o que está baixo).
alter table erp_estoque add column if not exists repor_em numeric;
alter table erp_estoque add column if not exists maximo numeric;

-- 3) Regras de reposição programadas pra cada farmácia (o ERP manda; aqui só mostra).
create table if not exists erp_reposicao_regras (
  farmacia_id    text not null,
  regra_id       text not null,
  tipo           text not null,          -- 'product' | 'category'
  alvo           text not null,          -- nome do produto ou da categoria
  maximo         numeric not null,
  repor_em       numeric not null,
  origem         text not null,          -- 'geral' | 'farmacia'
  atualizado_em  timestamptz not null default now(),
  primary key (farmacia_id, regra_id)
);
alter table erp_reposicao_regras enable row level security;
drop policy if exists erp_reposicao_regras_leitura on erp_reposicao_regras;
create policy erp_reposicao_regras_leitura on erp_reposicao_regras for select using (true);

-- 4) Resumo por farmácia e lista do que está no ponto de reposição (pra aba "Estoque das Farmácias").
create or replace view erp_estoque_resumo as
  select farmacia_id,
         count(*) filter (where quantidade > 0) as com_estoque,
         count(*) filter (where quantidade <= 0) as zerados,
         count(*) filter (where repor_em is not null and quantidade <= repor_em) as no_ponto,
         max(atualizado_em) as atualizado_em
    from erp_estoque
   group by farmacia_id;
create or replace view erp_estoque_no_ponto as
  select * from erp_estoque where repor_em is not null and quantidade <= repor_em;
grant select on erp_estoque_resumo to anon, authenticated;
grant select on erp_estoque_no_ponto to anon, authenticated;
