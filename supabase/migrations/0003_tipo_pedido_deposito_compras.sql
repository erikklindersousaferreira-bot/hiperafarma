-- Migration: tipo de pedido (Depósito / Compras ED / Compras CA)
-- Rode este script no SQL Editor do Supabase (projeto iqcqcpjbxjwzmwrpoiya) antes do deploy do novo frontend.
-- Totalmente aditiva: nenhuma coluna, tabela ou linha existente é removida ou sobrescrita.

-- Cada pedido passa a indicar sua origem: Depósito (fluxo padrão de revisão de estoque),
-- Compras ED ou Compras CA. Pedidos já existentes viraram "deposito" no backfill, já que
-- era o único fluxo existente até agora.
alter table pedidos
  add column if not exists tipo_pedido text not null default 'deposito';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pedidos_tipo_pedido_check'
  ) then
    alter table pedidos
      add constraint pedidos_tipo_pedido_check
      check (tipo_pedido in ('deposito', 'compras_ed', 'compras_ca'));
  end if;
end $$;

update pedidos set tipo_pedido = 'deposito' where tipo_pedido is null;

create index if not exists idx_pedidos_tipo_pedido
  on pedidos (tipo_pedido);
