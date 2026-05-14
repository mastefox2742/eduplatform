// ============================================================
// SYSTÈME D'AUDIT ET LOGGING
// Conformité RGPD - Logs immuables, données pseudonymisées
// ============================================================

import * as admin from "firebase-admin";
import { AuditLog, UserRole } from "../types";
import { hashSHA256 } from "./crypto";

const db = () => admin.firestore();

/**
 * Écrit un log d'audit immuable dans Firestore
 * Les logs sont conservés minimum 5 ans (obligation légale)
 * Les IPs sont hashées pour la pseudonymisation
 */
export async function writeAuditLog(params: {
  schoolId: string;
  actorUid: string;
  actorRole: UserRole;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  const now = admin.firestore.Timestamp.now();

  // Rétention légale : 5 ans
  const retentionDate = new Date();
  retentionDate.setFullYear(retentionDate.getFullYear() + 5);

  const log: Omit<AuditLog, "id"> = {
    schoolId: params.schoolId,
    actorUid: params.actorUid,
    actorRole: params.actorRole,
    action: params.action,
    targetId: params.targetId,
    targetType: params.targetType,
    // Filtrer les données sensibles des métadonnées avant stockage
    metadata: sanitizeMetadata(params.metadata ?? {}),
    // L'IP est hashée pour la pseudonymisation RGPD
    ip: params.ip ? hashSHA256(params.ip) : undefined,
    timestamp: now,
    retentionUntil: admin.firestore.Timestamp.fromDate(retentionDate),
  };

  await db()
    .collection("auditLogs")
    .add(log);
}

/**
 * Retire les champs sensibles des métadonnées de log
 * Ne jamais loguer : mots de passe, tokens, données personnelles brutes
 */
function sanitizeMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const FORBIDDEN_KEYS = [
    "password",
    "token",
    "secret",
    "key",
    "dateOfBirth",
    "parentEmail",
    "parentPhone",
    "address",
    "nationalId",
    "medicalNotes",
    "creditCard",
    "ssn",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const keyLower = key.toLowerCase();
    const isForbidden = FORBIDDEN_KEYS.some((forbidden) =>
      keyLower.includes(forbidden.toLowerCase())
    );

    if (isForbidden) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.includes("@")) {
      // Pseudonymiser les emails dans les logs
      sanitized[key] = hashSHA256(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Rate limiting simple basé sur Firestore
 * Protège les endpoints critiques contre les abus
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(
    Date.now() - windowSeconds * 1000
  );

  const ref = db().collection("_rateLimits").doc(key);

  return db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data();

    const now = admin.firestore.Timestamp.now();
    const windowTimestamp = admin.firestore.Timestamp.fromDate(windowStart);

    // Nettoyer les anciennes entrées et compter les récentes
    const requests: admin.firestore.Timestamp[] = (
      data?.requests ?? []
    ).filter((ts: admin.firestore.Timestamp) => ts > windowTimestamp);

    if (requests.length >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    requests.push(now);
    tx.set(ref, { requests }, { merge: false });

    return { allowed: true, remaining: maxRequests - requests.length };
  });
}
