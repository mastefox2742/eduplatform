-- ═══════════════════════════════════════════════════════════════
-- 015 — Deux tables laissées hors du filet RLS
-- ═══════════════════════════════════════════════════════════════
--
-- Défauts trouvés en interrogeant la base après la première
-- application des migrations, le 30 août 2026. Aucun des deux n'était
-- visible en relisant le SQL : il a fallu comparer `pg_class.relrowsecurity`
-- et `pg_policies` sur les 138 tables.
--
--   1. `ai_rate_limits` : RLS jamais activée.
--   2. `bulletin_assessments` : RLS activée, aucune policy écrite.
--
-- Les deux erreurs sont opposées et c'est ce qui les rend instructives.
-- La première laisse la porte ouverte, la seconde la mure entièrement.
-- Aucune des deux ne se voit à la lecture du code.


-- ───────────────────────────────────────────────────────────────
-- 1. ai_rate_limits — quotas d'appels à l'IA (§15.7)
-- ───────────────────────────────────────────────────────────────
--
-- Cette table compte les appels à l'IA par clé et par fenêtre de temps.
-- Sans RLS, dans le schéma `public`, elle est exposée par PostgREST à
-- tout utilisateur authentifié : n'importe qui pouvait exécuter
--
--   UPDATE ai_rate_limits SET count = 0 WHERE key = '<la sienne>'
--
-- et effacer son propre quota. C'est exactement ce que la table existe
-- pour empêcher.
--
-- Le correctif n'est pas d'écrire une policy de lecture : *aucun*
-- client n'a de raison de toucher cette table. On active RLS sans
-- déclarer la moindre policy. PostgREST ne renverra rien et refusera
-- toute écriture, tandis que `increment_ai_rate_limit()`, déclarée
-- SECURITY DEFINER, continue de fonctionner — une fonction SECURITY
-- DEFINER s'exécute avec les droits de son propriétaire et n'est pas
-- soumise aux policies.
--
-- Une table sans policy n'est pas une table oubliée : c'est une table
-- délibérément fermée. La différence tient à ce commentaire.

ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE ai_rate_limits IS
  'Quotas IA. RLS active SANS policy, volontairement : seule la fonction '
  'increment_ai_rate_limit() (SECURITY DEFINER) y accede. Ne pas ajouter '
  'de policy — un client qui peut ecrire ici contourne son quota.';


-- ───────────────────────────────────────────────────────────────
-- 2. bulletin_assessments — lignes de notes d'un bulletin (§13.3)
-- ───────────────────────────────────────────────────────────────
--
-- Ici l'erreur est l'inverse : `002_rls_policies.sql:87` active bien
-- RLS, mais aucune policy n'a jamais été écrite. Une table avec RLS et
-- sans policy est fermée à tous, y compris à la direction.
--
-- Ce n'est donc pas seulement un défaut de sécurité, c'est un défaut
-- fonctionnel silencieux : un parent ouvrant le bulletin publié de son
-- enfant aurait vu l'en-tête, la moyenne générale et l'appréciation —
-- et pas une seule note. Le bulletin se serait affiché vide sans qu'aucune
-- erreur ne remonte, puisque RLS ne refuse pas : elle filtre.
--
-- Plutôt que de recopier les quatre policies de `bulletins` (direction,
-- professeur, parent, élève), on délègue : une ligne d'évaluation est
-- visible si et seulement si son bulletin l'est.
--
-- Le sous-select sur `bulletins` est lui-même soumis aux policies de
-- `bulletins`. L'EXISTS ne renvoie donc vrai que si l'utilisateur peut
-- déjà voir le bulletin parent. Conséquence utile : le jour où les
-- règles de visibilité des bulletins changent — par exemple si la
-- publication devient progressive par niveau — les lignes de notes
-- suivent sans qu'on ait à y penser. Deux jeux de règles qu'il faut
-- garder synchronisés à la main finissent toujours par diverger.

CREATE POLICY "bulletin_assessments: visible si le bulletin l'est"
  ON bulletin_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bulletins b
      WHERE b.id = bulletin_assessments.bulletin_id
    )
  );

-- L'écriture est plus restrictive que la lecture : un parent et un
-- élève voient les notes, ils ne les saisissent pas. Seuls la direction
-- de l'établissement et le professeur propriétaire du bulletin
-- modifient ses lignes.
CREATE POLICY "bulletin_assessments: direction et professeur écrivent"
  ON bulletin_assessments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bulletins b
      WHERE b.id = bulletin_assessments.bulletin_id
        AND (
          is_direction_same_school(b.school_id)
          OR (is_teacher_same_school(b.school_id) AND b.teacher_id = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bulletins b
      WHERE b.id = bulletin_assessments.bulletin_id
        AND (
          is_direction_same_school(b.school_id)
          OR (is_teacher_same_school(b.school_id) AND b.teacher_id = auth.uid())
        )
    )
  );

COMMENT ON TABLE bulletin_assessments IS
  'Lignes de notes d''un bulletin. Visibilite deleguee a `bulletins` : '
  'une ligne se voit si son bulletin se voit. Ne pas dupliquer ici les '
  'regles de publication.';
