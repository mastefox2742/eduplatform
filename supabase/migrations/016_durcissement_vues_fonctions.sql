-- ═══════════════════════════════════════════════════════════════
-- 016 — Vues qui contournaient les RLS, et search_path des fonctions
-- ═══════════════════════════════════════════════════════════════
--
-- Signalé par `supabase db advisors --type security` après la première
-- application des migrations, le 30 août 2026.


-- ───────────────────────────────────────────────────────────────
-- 1. Quatre vues contournaient l'isolation multi-tenant
-- ───────────────────────────────────────────────────────────────
--
-- En PostgreSQL, une vue s'exécute par défaut avec les droits de son
-- *créateur*, pas de celui qui l'interroge (`security_invoker = off`).
-- Les policies RLS des tables sous-jacentes sont donc évaluées pour le
-- propriétaire de la vue — qui les traverse toutes.
--
-- Concrètement, et c'est le défaut le plus grave trouvé jusqu'ici :
--
--   SELECT * FROM validation_queue;
--
-- exécuté par un directeur authentifié renvoyait les bulletins en
-- attente de **toutes les écoles de la plateforme**, pas seulement des
-- siennes. Même chose pour `bulletins_with_assessments` (les notes),
-- `class_stats` (les effectifs et moyennes) et `monthly_cashflow` (le
-- chiffre d'affaires).
--
-- Les 277 policies écrites avec soin sur les tables ne servaient à rien
-- dès qu'on passait par une vue. L'isolation multi-tenant est la
-- promesse centrale du produit ; elle tenait sur les tables et tombait
-- sur les vues.
--
-- Rien dans le SQL ne le laissait voir : les vues sont écrites
-- normalement, et le défaut tient à une valeur par défaut de PostgreSQL.
-- Seul l'audit de la base l'a montré.
--
-- `security_invoker = on` fait évaluer les RLS pour l'utilisateur qui
-- interroge. Disponible depuis PostgreSQL 15 ; le serveur est en 17.

ALTER VIEW bulletins_with_assessments SET (security_invoker = on);
ALTER VIEW class_stats                SET (security_invoker = on);
ALTER VIEW monthly_cashflow           SET (security_invoker = on);
ALTER VIEW validation_queue           SET (security_invoker = on);


-- ───────────────────────────────────────────────────────────────
-- 2. search_path des fonctions SECURITY DEFINER
-- ───────────────────────────────────────────────────────────────
--
-- Une fonction SECURITY DEFINER s'exécute avec les droits de son
-- propriétaire. Si son `search_path` n'est pas figé, il est celui de
-- l'appelant : un utilisateur qui crée une table ou une fonction
-- homonyme dans un schéma placé plus tôt dans son propre search_path
-- fait exécuter *son* code avec les droits du propriétaire. C'est une
-- élévation de privilège classique.
--
-- Les figer élimine la manœuvre. `pg_temp` est placé en dernier
-- volontairement : c'est le schéma temporaire de la session, celui que
-- l'attaquant contrôle, et il ne doit jamais primer sur `public`.
--
-- Ne sont traitées que les fonctions SECURITY DEFINER, et c'est
-- délibéré. La base compte aussi quatorze fonctions SQL à droits
-- d'appelant, dont les aides utilisées par les policies RLS
-- (`is_parent()`, `is_direction_same_school()`, …). Celles-là,
-- PostgreSQL les *inline* dans la requête appelante, ce qui les rend
-- presque gratuites — et une clause SET sur une fonction SQL empêche
-- cet inlining. Les figer coûterait un appel de fonction par ligne
-- examinée, sur chaque requête, sur 138 tables.
--
-- Ce coût serait payé pour rien : une fonction à droits d'appelant
-- n'élève aucun privilège, donc détourner son search_path ne donne
-- accès à rien de plus que ce que l'utilisateur a déjà. Le risque
-- qu'elles portent n'est pas celui que ce correctif traite.
--
-- Les fonctions SECURITY DEFINER, elles, ne sont jamais inlinées par
-- PostgreSQL, quelles que soient leurs clauses. Les figer ne coûte donc
-- strictement rien.
--
-- La boucle traite aussi les fonctions futures qu'on oublierait : il
-- suffira de rejouer ce bloc. Elle ignore les fonctions déjà figées et
-- celles écrites en C, qui appartiennent aux extensions.

DO $$
DECLARE
  fonction RECORD;
  traitees INTEGER := 0;
BEGIN
  FOR fonction IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l  ON l.oid = p.prolang
    WHERE n.nspname = 'public'
      AND p.prosecdef                        -- SECURITY DEFINER seulement
      AND l.lanname IN ('sql', 'plpgsql')    -- pas les fonctions d'extension
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, pg_temp',
      fonction.signature
    );
    traitees := traitees + 1;
  END LOOP;

  RAISE NOTICE '% fonction(s) SECURITY DEFINER figées sur public, pg_temp',
    traitees;
END $$;


-- ───────────────────────────────────────────────────────────────
-- Ce qui reste signalé, et pourquoi on n'y touche pas ici
-- ───────────────────────────────────────────────────────────────
--
-- `extension_in_public` : pg_trgm est installé dans `public`. Le
-- déplacer vers `extensions` casserait les index de recherche qui
-- l'utilisent, et devrait se faire en même temps qu'eux. À traiter
-- séparément, pas dans une migration de sécurité.
--
-- `anon_security_definer_function_executable` : le rôle `anon` peut
-- exécuter les fonctions SECURITY DEFINER. Lui retirer ce droit est
-- souhaitable, mais le portail public de préinscription (§6) est prévu
-- pour être servi en anonyme : révoquer en bloc avant de savoir ce
-- qu'il appelle casserait une fonctionnalité qui n'est pas encore
-- écrite. À faire quand ce portail existera, fonction par fonction.
