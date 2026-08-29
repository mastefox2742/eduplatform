// ============================================================
// LECTURE DES CLAIMS JWT
//
// Cahier des charges §21.1 : « les rôles de sécurité doivent être
// portés par des jetons/claims fiables et validés côté serveur,
// jamais seulement par l'interface ».
//
// Le code faisait auparavant `request.auth.token as CustomClaims`
// dans 25 fonctions. Ce cast affirmait que `role` et `schoolId`
// étaient présents sans jamais le vérifier : un jeton dépourvu de
// claims passait, et la fonction plantait plus loin ou pire,
// travaillait avec `undefined` comme identifiant d'école.
// ============================================================

import { HttpsError } from "firebase-functions/v2/https";
import { CustomClaims, UserRole } from "../types";

/** Ce qu'un jeton Firebase expose réellement : tout est optionnel. */
type RawToken = Record<string, unknown>;

/**
 * Lit les claims sans rien exiger. À utiliser quand l'absence de
 * rôle est un cas légitime (utilisateur qui vient de s'inscrire).
 */
export function readClaims(token: RawToken | undefined): Partial<CustomClaims> {
  if (!token) return {};
  return {
    role:            token.role as UserRole | undefined,
    schoolId:        token.schoolId as string | undefined,
    etablissementId: token.etablissementId as string | undefined,
    classeId:        token.classeId as string | undefined,
    teacherId:       token.teacherId as string | undefined,
  } as Partial<CustomClaims>;
}

/**
 * Lit les claims en exigeant `role` et `schoolId`.
 *
 * Lève `failed-precondition` si le jeton n'est pas complet : mieux vaut
 * un refus explicite qu'une requête exécutée avec un `schoolId` vide,
 * qui contournerait l'isolation multi-tenant (§26).
 */
export function requireClaims(token: RawToken | undefined): CustomClaims {
  const claims = readClaims(token);

  if (!claims.role) {
    throw new HttpsError(
      "failed-precondition",
      "Jeton sans rôle. Reconnectez-vous pour rafraîchir vos droits."
    );
  }
  if (!claims.schoolId) {
    throw new HttpsError(
      "failed-precondition",
      "Jeton sans établissement. Reconnectez-vous pour rafraîchir vos droits."
    );
  }
  return claims as CustomClaims;
}

/**
 * Vérifie que l'appelant porte l'un des rôles attendus, et que sa
 * requête reste dans son établissement.
 */
export function requireRole(
  token: RawToken | undefined,
  allowed: UserRole[],
  schoolId?: string
): CustomClaims {
  const claims = requireClaims(token);

  if (!allowed.includes(claims.role)) {
    throw new HttpsError(
      "permission-denied",
      `Action réservée à : ${allowed.join(", ")}.`
    );
  }
  // Isolation multi-tenant : on ne travaille jamais sur une autre école.
  if (schoolId && claims.schoolId !== schoolId) {
    throw new HttpsError(
      "permission-denied",
      "Accès refusé : établissement différent du vôtre."
    );
  }
  return claims;
}
