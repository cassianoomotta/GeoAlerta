CREATE TABLE public.occurrence_types (
  name text PRIMARY KEY,
  active boolean NOT NULL DEFAULT true,
  display_order smallint NOT NULL CHECK (display_order > 0)
);

COMMENT ON TABLE public.occurrence_types IS 'Selectable categories for new public occurrences; historical occurrence.type values remain unchanged.';
COMMENT ON COLUMN public.occurrence_types.active IS 'When false, this category is hidden from the public form and rejected for new submissions.';

INSERT INTO public.occurrence_types (name, active, display_order) VALUES
  ('Alagamentos/Inundação', true, 1),
  ('Buracos', true, 2),
  ('Chuvas Intensas', true, 3),
  ('Contaminação da Água', true, 4),
  ('Desabamento', true, 5),
  ('Desastre Radioativo', true, 6),
  ('Destelhamento', true, 7),
  ('Enxurrada', true, 8),
  ('Epidemias', true, 9),
  ('Erosão', true, 10),
  ('Estiagem', true, 11),
  ('Granizo', true, 12),
  ('Incêndio', true, 13),
  ('Infestações/Pragas', true, 14),
  ('Movimentação de Massa', true, 15),
  ('Onda de Calor', true, 16),
  ('Onda de Frio', true, 17),
  ('Outdoor e similares', true, 18),
  ('Produtos Perigosos', true, 19),
  ('Queda de Árvore', true, 20),
  ('Queda de Placa', true, 21),
  ('Queda de Poste', true, 22),
  ('Rompimento de Barragem', true, 23),
  ('Rompimento de Fiação Elétrica', true, 24),
  ('Rompimento de Tubulação', true, 25),
  ('Terremoto', true, 26),
  ('Tornado', true, 27),
  ('Vazamento de Produto Perigoso', true, 28),
  ('Vendaval', true, 29),
  ('Ventos Fortes', true, 30);

ALTER TABLE public.occurrence_types ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.occurrence_types FROM PUBLIC, anon, authenticated, geoalerta_runtime, geoalerta_ingest;
GRANT SELECT (name, active, display_order) ON public.occurrence_types TO geoalerta_ingest;
CREATE POLICY ingest_active_occurrence_types
  ON public.occurrence_types
  FOR SELECT
  TO geoalerta_ingest
  USING (active);
