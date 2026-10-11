-- Adiciona descrições à categoria Pessoal.
-- Pode ser executado mais de uma vez sem duplicar os registros.
INSERT INTO "Orç_Categorias" (tipo_lanc, categoria, descricao)
SELECT 'despesa', itens.categoria, itens.descricao
FROM (VALUES
  ('Pessoal', 'Fotografia'),
  ('Pessoal', 'Outros')
) AS itens(categoria, descricao)
WHERE NOT EXISTS (
  SELECT 1
  FROM "Orç_Categorias" AS existente
  WHERE existente.tipo_lanc = 'despesa'
    AND existente.categoria = itens.categoria
    AND existente.descricao = itens.descricao
);
