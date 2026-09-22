-- Migration: corrige o check constraint de categoria em pedido_itens.
-- Rode este script no SQL Editor do Supabase (projeto iqcqcpjbxjwzmwrpoiya) para liberar
-- o envio de solicitações com as categorias "Mamadeiras e chupetas" e "Produtos hospitalar".
--
-- Causa raiz (diagnosticada com uma inserção de teste, revertida em seguida):
-- a tabela pedido_itens tem um check constraint "pedido_itens_categoria_check" criado
-- direto no Supabase (fora deste repositório de migrations) com uma lista fixa de
-- categorias permitidas. Quando as categorias "Mamadeiras e chupetas" e "Produtos
-- hospitalar" foram adicionadas ao dropdown do frontend, essa lista nunca foi
-- atualizada — por isso 100% dos envios com essas duas categorias sempre falharam
-- com o erro "new row for relation pedido_itens violates check constraint
-- pedido_itens_categoria_check" (nenhum pedido com essas categorias existe no histórico).
--
-- Totalmente aditiva: apenas amplia a lista de valores aceitos pelo constraint.
-- Nenhuma coluna, tabela ou linha existente é removida, e nenhum dado é alterado.
-- A lista abaixo inclui todas as categorias atuais do frontend (categoriaLabel em
-- src/App.jsx) mais os valores legados que já existem em produtos/pedido_itens
-- (ex.: "generico", "fralda", "preservativo", "floral"), para não quebrar nada
-- que já funciona hoje.

alter table pedido_itens
  drop constraint if exists pedido_itens_categoria_check;

alter table pedido_itens
  add constraint pedido_itens_categoria_check
  check (categoria in (
    -- categorias atuais do dropdown (categoriaLabel no frontend)
    'eticos', 'genericos', 'vitaminas', 'controlados', 'mercearia', 'perfumaria',
    'fraldas', 'leites', 'preservativos', 'suplementos', 'injetaveis', 'bebidas',
    'varejo', 'mamadeiras_chupetas', 'produtos_hospitalar', 'ortopedicos',
    -- valores legados já usados no histórico (produtos e pedido_itens)
    'generico', 'bebida', 'equipamento', 'fralda', 'etico', 'leite', 'suplemento',
    'preservativo', 'floral'
  ));
