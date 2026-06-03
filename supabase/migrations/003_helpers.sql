-- ============================================================
-- Fonctions utilitaires pour la logique applicative
-- ============================================================

-- Fonction pour ajouter un élément à un array sans doublon
-- (Remplace arrayUnion de Firebase)
CREATE OR REPLACE FUNCTION append_to_array_if_not_exists(
  table_name  TEXT,
  column_name TEXT,
  row_id      UUID,
  value       TEXT
)
RETURNS VOID AS $$
DECLARE
  sql TEXT;
BEGIN
  sql := format(
    'UPDATE %I SET %I = array_append(%I, $1::uuid)
     WHERE id = $2 AND NOT ($1::uuid = ANY(%I))',
    table_name, column_name, column_name, column_name
  );
  EXECUTE sql USING value::UUID, row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limiting pour l'IA
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  key         TEXT PRIMARY KEY,
  count       INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION increment_ai_rate_limit(p_key TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_rate_limits (key, count)
  VALUES (p_key, 1)
  ON CONFLICT (key) DO UPDATE
  SET count = ai_rate_limits.count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Séquence de numéros de reçu (remplace les compteurs Firestore)
CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;

CREATE OR REPLACE FUNCTION next_receipt_num(p_school_id UUID)
RETURNS TEXT AS $$
DECLARE
  year_part TEXT := TO_CHAR(NOW(), 'YYYY');
  num       TEXT;
BEGIN
  num := LPAD(nextval('receipt_seq')::TEXT, 5, '0');
  RETURN 'REC-' || year_part || '-' || num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calcul de la moyenne de classe (utile pour les dashboards)
CREATE OR REPLACE FUNCTION class_average(p_school_id UUID, p_class_id UUID, p_trimestre TEXT)
RETURNS NUMERIC AS $$
  SELECT ROUND(AVG(average)::NUMERIC, 2)
  FROM bulletins
  WHERE school_id = p_school_id
    AND class_id  = p_class_id
    AND trimestre = p_trimestre::trimestre
    AND status    = 'published'
    AND average IS NOT NULL
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vue : bulletins avec leurs évaluations (pour éviter les N+1)
CREATE OR REPLACE VIEW bulletins_with_assessments AS
SELECT
  b.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id',          ba.id,
        'title',       ba.title,
        'value',       ba.value,
        'max_score',   ba.max_score,
        'coefficient', ba.coefficient
      )
    ) FILTER (WHERE ba.id IS NOT NULL),
    '[]'::json
  ) AS assessments
FROM bulletins b
LEFT JOIN bulletin_assessments ba ON ba.bulletin_id = b.id
GROUP BY b.id;

-- Vue : statistiques par classe (pour le dashboard direction)
CREATE OR REPLACE VIEW class_stats AS
SELECT
  b.school_id,
  b.class_id,
  b.class_name,
  b.trimestre,
  COUNT(DISTINCT b.student_id) AS student_count,
  ROUND(AVG(b.average)::NUMERIC, 2) AS class_average,
  COUNT(*) FILTER (WHERE b.average >= 10) AS passing_count,
  COUNT(*) FILTER (WHERE b.average < 10)  AS failing_count,
  COUNT(*) FILTER (WHERE b.status = 'published') AS published_count,
  COUNT(*) FILTER (WHERE b.status = 'submitted') AS pending_count
FROM bulletins b
GROUP BY b.school_id, b.class_id, b.class_name, b.trimestre;

-- Vue : cash-flow mensuel (pour le module Budget)
CREATE OR REPLACE VIEW monthly_cashflow AS
SELECT
  p.school_id,
  TO_CHAR(p.date, 'YYYY-MM') AS month,
  SUM(p.amount) FILTER (WHERE p.status = 'success') AS income,
  0::NUMERIC AS expenses  -- Sera combiné avec la table expenses
FROM payments p
WHERE p.date IS NOT NULL
GROUP BY p.school_id, TO_CHAR(p.date, 'YYYY-MM')
UNION ALL
SELECT
  e.school_id,
  TO_CHAR(e.date, 'YYYY-MM') AS month,
  0::NUMERIC AS income,
  SUM(e.amount) AS expenses
FROM expenses e
GROUP BY e.school_id, TO_CHAR(e.date, 'YYYY-MM');
