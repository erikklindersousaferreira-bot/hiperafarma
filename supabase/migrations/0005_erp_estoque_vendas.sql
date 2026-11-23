-- Migration: estoque e vendas vindos do ERP (HiperaFarma ERP).
-- Rode este script no SQL Editor do Supabase do APP ANTIGO (projeto iqcqcpjbxjwzmwrpoiya).
-- Totalmente aditiva: só cria duas tabelas novas. Nada existente é alterado.
--
-- O ERP escreve aqui com a chave service_role (fica só na Vercel do ERP); o app antigo só lê.
-- chave = id do produto no app antigo quando o ERP conseguiu casar pelo nome,
--         ou "erp:<id do produto no ERP>" quando não casou (aí vale o nome_produto).

create table if not exists erp_estoque (
  farmacia_id    text not null,
  chave          text not null,
  produto_id     text,
  nome_produto   text not null,
  ean            text,
  quantidade     numeric not null default 0,
  atualizado_em  timestamptz not null default now(),
  primary key (farmacia_id, chave)
);
create index if not exists idx_erp_estoque_produto on erp_estoque (produto_id);
create index if not exists idx_erp_estoque_nome on erp_estoque (nome_produto);

create table if not exists erp_vendas_dia (
  farmacia_id    text not null,
  chave          text not null,
  dia            date not null,
  produto_id     text,
  nome_produto   text not null,
  quantidade     numeric not null default 0,
  atualizado_em  timestamptz not null default now(),
  primary key (farmacia_id, chave, dia)
);
create index if not exists idx_erp_vendas_dia_farmacia_dia on erp_vendas_dia (farmacia_id, dia desc);

-- O app antigo lê com a chave pública; ninguém escreve por ela (só o ERP, com service_role).
alter table erp_estoque enable row level security;
alter table erp_vendas_dia enable row level security;
drop policy if exists erp_estoque_leitura on erp_estoque;
create policy erp_estoque_leitura on erp_estoque for select using (true);
drop policy if exists erp_vendas_dia_leitura on erp_vendas_dia;
create policy erp_vendas_dia_leitura on erp_vendas_dia for select using (true);
