-- Migration 0007: lista oficial de produtos com CÓDIGO (código do sistema da loja).
-- Rode no SQL Editor do Supabase do sistema de solicitação (projeto iqcqcpjbxjwzmwrpoiya).
-- Totalmente aditiva: só cria colunas/índices e amplia a lista de categorias aceitas.
-- Nada é apagado; produtos antigos continuam (os que saírem da lista ficam com ativo = false).

alter table produtos
  add column if not exists codigo text,
  add column if not exists codigo_barras text,
  add column if not exists ativo boolean not null default true,
  add column if not exists atualizado_em timestamptz;

create index if not exists produtos_codigo_idx on produtos (codigo);
create index if not exists produtos_codigo_barras_idx on produtos (codigo_barras);
create index if not exists produtos_ativo_nome_idx on produtos (ativo, nome);

-- código do produto gravado no item do pedido (sai no PDF)
alter table pedido_itens add column if not exists codigo_produto text;

-- mesma lista de categorias de pedido_itens (0004), caso produtos tenha um check antigo
alter table produtos drop constraint if exists produtos_categoria_check;
alter table produtos
  add constraint produtos_categoria_check
  check (categoria is null or categoria in (
    'eticos', 'genericos', 'vitaminas', 'controlados', 'mercearia', 'perfumaria',
    'fraldas', 'leites', 'preservativos', 'suplementos', 'injetaveis', 'bebidas',
    'varejo', 'mamadeiras_chupetas', 'produtos_hospitalar', 'ortopedicos',
    'generico', 'bebida', 'equipamento', 'fralda', 'etico', 'leite', 'suplemento',
    'preservativo', 'floral'
  )) not valid;
