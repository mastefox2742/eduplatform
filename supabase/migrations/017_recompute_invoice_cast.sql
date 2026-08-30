-- ═══════════════════════════════════════════════════════════════
-- 017 — recompute_invoice() faisait échouer tout paiement
-- ═══════════════════════════════════════════════════════════════
--
-- Trouvé le 30 août 2026 en insérant les premiers paiements du jeu de
-- données. Le trigger `on_payment_success` appelle
-- `recompute_invoice()`, qui échouait sur :
--
--   column "status" is of type invoice_status
--   but expression is of type text
--
-- Les branches du CASE renvoient des littéraux non typés. PostgreSQL
-- les résout en `text`, et refuse ensuite de les affecter à une colonne
-- de type énuméré. Le CASE entier prend le type de ses branches, donc
-- il suffit d'une seule branche typée pour que tout se résolve — mais
-- les caster toutes est plus clair pour qui relira.
--
-- Portée du défaut : *aucun* paiement ne pouvait aboutir. Le trigger se
-- déclenche AFTER INSERT sur `payments`, donc l'échec annulait
-- l'insertion elle-même. Le webhook CinetPay (§22) aurait reçu une
-- erreur à chaque encaissement, et la famille aurait payé sans que le
-- solde bouge — le pire des deux mondes.
--
-- Rien ne pouvait le révéler avant l'exécution : la fonction se crée
-- sans erreur, PostgreSQL ne vérifiant le corps d'une fonction plpgsql
-- qu'au premier appel.

CREATE OR REPLACE FUNCTION recompute_invoice(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_gross    NUMERIC(12,2);
  v_discount NUMERIC(12,2);
  v_paid     NUMERIC(12,2);
  v_due      DATE;
BEGIN
  SELECT COALESCE(SUM(amount),0), COALESCE(SUM(discount),0)
    INTO v_gross, v_discount
    FROM invoice_lines WHERE invoice_id = p_invoice_id;

  SELECT COALESCE(SUM(amount),0) INTO v_paid
    FROM payments
   WHERE invoice_id = p_invoice_id AND status = 'success';

  SELECT COALESCE(v_paid,0) + COALESCE(SUM(cp.amount),0) INTO v_paid
    FROM cash_payments cp WHERE cp.invoice_id = p_invoice_id;

  SELECT due_date INTO v_due FROM invoices WHERE id = p_invoice_id;

  UPDATE invoices SET
    gross_amount    = v_gross,
    discount_amount = v_discount,
    net_amount      = v_gross - v_discount,
    paid_amount     = v_paid,
    status = CASE
      WHEN status = 'annulee'                       THEN 'annulee'::invoice_status
      WHEN v_paid >= (v_gross - v_discount)
           AND (v_gross - v_discount) > 0           THEN 'payee'::invoice_status
      WHEN v_paid > 0                               THEN 'partiellement_payee'::invoice_status
      WHEN v_due IS NOT NULL AND v_due < CURRENT_DATE THEN 'en_retard'::invoice_status
      WHEN status = 'brouillon'                     THEN 'brouillon'::invoice_status
      ELSE 'emise'::invoice_status
    END
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ───────────────────────────────────────────────────────────────
-- Une conséquence à connaître, qui n'est pas un défaut
-- ───────────────────────────────────────────────────────────────
--
-- `gross_amount` est recalculé depuis `invoice_lines`, jamais lu depuis
-- la facture. Une facture créée sans lignes voit donc son montant
-- ramené à zéro dès le premier paiement.
--
-- C'est le comportement voulu : le détail fait foi, pas le total. Un
-- total saisi à la main qui ne correspond à aucune ligne est
-- injustifiable devant une famille qui conteste, et c'est exactement ce
-- qu'une comptabilité vérifiable doit interdire.
--
-- Conséquence pratique : toute écriture de facture — import, reprise de
-- données, jeu de démonstration — doit créer ses `invoice_lines`. Le
-- commentaire ci-dessous le rappelle sur la table elle-même.

COMMENT ON COLUMN invoices.gross_amount IS
  'Recalcule depuis invoice_lines par recompute_invoice(). Une facture '
  'sans ligne tombe a zero au premier paiement : toujours creer les '
  'lignes, ne jamais saisir le total seul.';
