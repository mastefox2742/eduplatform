# Architecture de sécurité

*Mise à jour le 30 août 2026, après la première application des
migrations sur Supabase. La version précédente décrivait une
architecture Firebase qui n'est plus celle du produit.*

---

## Le principe, en une phrase

**L'autorisation vit dans la base, jamais dans l'interface.**

Un écran qui cache un bouton empêche un clic. Il n'empêche pas une
requête. Toute règle qui compte — qui voit quel élève, qui saisit quelle
note, qui encaisse quel paiement — est écrite en politique Row Level
Security sur la table concernée, et s'applique quel que soit le chemin :
l'application web, l'application mobile, l'API REST, ou `curl`.

L'interface reproduit ces règles pour être agréable. La base les fait
respecter.

---

## Ce qui protège quoi

| Couche | Rôle | Ce qu'elle ne fait pas |
|---|---|---|
| Interface (web, mobile) | Confort : ne pas montrer ce qui sera refusé | Ne protège rien |
| Route protégée (`ProtectedRoute`) | Éviter d'afficher un écran interdit | Contournable en appelant l'API directement |
| **Politiques RLS** | **La barrière réelle** | — |
| Fonctions `SECURITY DEFINER` | Opérations qui doivent dépasser l'appelant | Doivent avoir un `search_path` figé |
| Edge Functions | Secrets serveur : webhooks, clés d'API | — |

---

## L'isolation multi-tenant

C'est la promesse centrale : **une école ne voit jamais les données
d'une autre.** Chaque table métier porte un `school_id`, et chaque
politique le compare à l'école de l'utilisateur connecté.

État au 30 août 2026 : 138 tables, **toutes** avec RLS active, 277
politiques.

Une table fait exception et c'est délibéré : `ai_rate_limits` a RLS
active **sans aucune politique**. Elle compte les appels à l'IA et n'est
touchée que par `increment_ai_rate_limit()`, en `SECURITY DEFINER`.
Y ajouter une politique de lecture ou d'écriture permettrait à un
utilisateur de remettre son propre quota à zéro.

### Deux pièges rencontrés, qui valent d'être connus

**Les vues contournent les RLS par défaut.** En PostgreSQL, une vue
s'exécute avec les droits de son créateur, pas de celui qui l'interroge.
Quatre vues du projet — `validation_queue`, `bulletins_with_assessments`,
`class_stats`, `monthly_cashflow` — renvoyaient donc les données de
**toutes les écoles** à n'importe quel utilisateur authentifié. Les 277
politiques ne servaient à rien dès qu'on passait par une vue.

Corrigé par `security_invoker = on` (migration 016). **Toute nouvelle
vue doit porter cette option.**

**Une table avec RLS et sans politique est fermée, pas ouverte.**
`bulletin_assessments` avait RLS activée et aucune politique : elle était
invisible pour tous, y compris la direction. Ce n'était pas seulement un
problème de sécurité — un parent aurait vu l'en-tête du bulletin de son
enfant et pas une seule note, sans message d'erreur, puisque RLS filtre
au lieu de refuser.

La leçon : `ENABLE ROW LEVEL SECURITY` et l'écriture des politiques sont
deux gestes, et oublier le second se voit à l'usage, pas à la lecture.

---

## Les fonctions d'aide

Les politiques s'appuient sur des fonctions courtes, définies en
migration 003 puis étendues :

```
is_same_school(school_id)      l'utilisateur appartient à cette école
is_direction_same_school(id)   … et y est direction
is_teacher_same_school(id)     … et y enseigne
teaches_class(class_id)        l'enseignant est affecté à cette classe
is_my_child(student_id)        le parent est responsable de cet élève
can_see_student(student_id)    synthèse des trois cas précédents
period_is_open(period_id)      la période accepte encore des notes
has_any_role(roles[])          l'utilisateur cumule un de ces rôles
can(resource, action)          droit fin issu de `role_permissions`
```

Deux familles, traitées différemment :

- **30 fonctions `SECURITY DEFINER`** ont leur `search_path` figé sur
  `public, pg_temp` (migration 016). Sans cela, un utilisateur peut créer
  un objet homonyme dans un schéma prioritaire et faire exécuter son code
  avec les droits du propriétaire — élévation de privilège classique.
- **15 fonctions à droits d'appelant** sont laissées telles quelles,
  volontairement. PostgreSQL les *inline* dans les politiques, ce qui les
  rend presque gratuites ; une clause `SET` les dé-inlinerait et
  coûterait un appel par ligne examinée, sur chaque requête, sur 138
  tables. Le coût serait payé pour rien : une fonction à droits
  d'appelant n'élève aucun privilège.

**Toute nouvelle fonction `SECURITY DEFINER` doit figer son
`search_path`.**

---

## Le paiement

Le chemin critique du produit (§22). Trois garanties :

1. **La signature du webhook est comparée en temps constant.** Une
   comparaison qui s'arrête au premier caractère différent laisse
   deviner la signature octet par octet.
2. **Le statut est reconfirmé auprès de CinetPay** avant d'être
   enregistré. Un webhook peut être rejoué ou forgé ; la source de
   vérité est l'agrégateur, pas le message reçu.
3. **Trois niveaux d'unicité** empêchent le double encaissement : clé
   d'idempotence, référence du fournisseur, contrainte en base.

Le solde de la famille n'est mis à jour que par le trigger
`on_payment_success`, jamais par le client. Un paiement affiché comme
reçu correspond toujours à un encaissement confirmé.

> **Défaut corrigé le 30 août 2026 (migration 017).** Ce trigger
> échouait sur *tout* paiement : `recompute_invoice()` affectait une
> valeur `text` à une colonne de type énuméré. Le trigger étant
> `AFTER INSERT`, son échec annulait l'insertion — la famille aurait payé
> sans que son solde bouge. PostgreSQL ne vérifiant le corps d'une
> fonction plpgsql qu'au premier appel, rien ne pouvait le révéler avant
> l'exécution.

---

## Les données de santé

Les données médicales des élèves sont isolées dans `student_health`, et
non mêlées au dossier général. Chaque consultation est inscrite dans
`health_access_log`.

Ce n'est pas de la surveillance : la loi l'exige sur des données de
mineurs, et cette trace protège autant le personnel qui consulte que la
famille concernée.

---

## Les secrets

| Secret | Où il vit | Jamais |
|---|---|---|
| Clé `service_role` Supabase | `.env.supabase`, ignoré par git | Dans le dépôt, ni dans un client |
| Clé `anon` Supabase | `.env.local` et bundle client | — (publique par conception) |
| Clés CinetPay | Variables des Edge Functions | Côté client |
| Clé Gemini | **Doit passer par le serveur** | Dans le bundle mobile |

La clé `anon` est publique et c'est normal : elle identifie le projet, et
c'est RLS qui autorise. La clé `service_role` traverse toutes les
politiques — elle n'a sa place que dans un script de développement ou une
Edge Function.

> **À corriger.** `EXPO_PUBLIC_GEMINI_API_KEY` était committée dans
> `apps/mobile/eas.json`. Le préfixe `EXPO_PUBLIC_` signifie qu'elle est
> embarquée dans l'application : elle est extractible de tout APK, même
> sans le dépôt. Elle a été retirée du fichier, mais **reste dans
> l'historique git** et doit être révoquée.
>
> Le correctif de fond n'est pas de mieux la cacher : les appels à l'IA
> doivent passer par une Edge Function qui détient la clé côté serveur.
> C'est aussi ce qu'exige §15.7, qui veut que chaque appel soit tracé,
> encadré par un quota et rattaché à un élève.

---

## Ce qui reste à faire

- Faire passer les appels Gemini par une Edge Function (voir ci-dessus)
- Retirer au rôle `anon` le droit d'exécuter les fonctions
  `SECURITY DEFINER`, une fois connu ce dont le portail public de
  préinscription (§6) a besoin
- Déplacer `pg_trgm` du schéma `public` vers `extensions`, en même temps
  que les index de recherche qui l'utilisent
- Terminer la sortie de Firebase : les Cloud Functions restent la couche
  serveur historique, en cours de migration vers les Edge Functions

---

## Vérifier soi-même

```bash
npx supabase db advisors --linked --type security
```

Aucune alerte de niveau `ERROR` ne doit apparaître. Les avertissements
restants sont documentés dans la section précédente ; tout nouvel
avertissement mérite une explication écrite ou un correctif.
