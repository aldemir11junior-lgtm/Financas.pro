-- Adiciona os metadados usados para identificar as parcelas de uma compra.
-- Execute no Supabase SQL Editor antes de cadastrar lançamentos parcelados.
ALTER TABLE "Orç_Lancamentos"
  ADD COLUMN IF NOT EXISTS recorrencia_id uuid,
  ADD COLUMN IF NOT EXISTS parcela_numero smallint,
  ADD COLUMN IF NOT EXISTS total_parcelas smallint;

ALTER TABLE "Orç_Lixeira"
  ADD COLUMN IF NOT EXISTS recorrencia_id uuid,
  ADD COLUMN IF NOT EXISTS parcela_numero smallint,
  ADD COLUMN IF NOT EXISTS total_parcelas smallint;

CREATE INDEX IF NOT EXISTS idx_orc_lancamentos_recorrencia
  ON "Orç_Lancamentos" (recorrencia_id)
  WHERE recorrencia_id IS NOT NULL;
