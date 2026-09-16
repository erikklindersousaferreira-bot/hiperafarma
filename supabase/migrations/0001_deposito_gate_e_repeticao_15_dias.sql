-- Migration: fluxo Depósito -> Pedidos, e janela de 15 dias para "Repetir Pedido"
-- Rode este script no SQL Editor do Supabase (projeto iqcqcpjbxjwzmwrpoiya) antes do deploy do novo frontend.
-- Todas as alterações são aditivas: nenhuma coluna, tabela ou linha existente é removida.

-- 1) Etapa de Depósito: um pedido só aparece no painel de Pedidos depois de liberado pelo Depósito.
alter table pedidos
  add column if not exists liberado_deposito boolean not null default false;

alter table pedidos
  add column if not exists liberado_deposito_em timestamptz;

-- Backfill: pedidos já existentes foram criados antes de existir a etapa de Depósito,
-- então já estavam efetivamente "liberados" para o painel de Pedidos. Sem isso, todo o
-- histórico sumiria do painel de Pedidos ao ligar o gate.
update pedidos
set liberado_deposito = true,
    liberado_deposito_em = coalesce(liberado_deposito_em, atualizado_em)
where liberado_deposito = false;

-- 2) Data de entrega, usada para a regra dos 15 dias em "Repetir Pedido".
alter table pedidos
  add column if not exists entregue_em timestamptz;

-- Backfill best-effort: para pedidos já marcados como entregues, usamos atualizado_em
-- (data da última alteração) como aproximação da data de entrega, já que não havia
-- coluna dedicada até agora.
update pedidos
set entregue_em = atualizado_em
where status = 'entregue' and entregue_em is null;

-- 3) Índices para as novas consultas (fila do Depósito, filtros de Pedidos e Previsão).
create index if not exists idx_pedidos_liberado_deposito
  on pedidos (liberado_deposito)
  where liberado_deposito = false;

create index if not exists idx_pedidos_farmacia_status
  on pedidos (farmacia_id, status);

create index if not exists idx_pedidos_criado_em
  on pedidos (criado_em desc);

create index if not exists idx_pedido_itens_pedido_id
  on pedido_itens (pedido_id);

create index if not exists idx_pedido_itens_nome_produto
  on pedido_itens (nome_produto);

create index if not exists idx_pedido_itens_categoria
  on pedido_itens (categoria);

create index if not exists idx_pedido_itens_laboratorio_id
  on pedido_itens (laboratorio_id);
