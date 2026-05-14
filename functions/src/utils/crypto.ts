// ============================================================
// UTILITAIRES CRYPTOGRAPHIQUES
// Chiffrement AES-256-GCM pour les données sensibles des élèves
// ============================================================

import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Chiffre une chaîne avec AES-256-GCM
 * La clé est dérivée de la variable d'environnement ENCRYPTION_KEY
 * @param plaintext - Texte à chiffrer
 * @returns Chaîne base64 au format: salt:iv:tag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Dérivation de clé PBKDF2 avec le sel unique
  const key = crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    "sha512"
  );

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString("base64"),
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Déchiffre une chaîne chiffrée avec AES-256-GCM
 * @param ciphertext - Chaîne base64 au format: salt:iv:tag:ciphertext
 * @returns Texte en clair
 */
export function decrypt(ciphertext: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  const [saltB64, ivB64, tagB64, encryptedB64] = ciphertext.split(":");
  if (!saltB64 || !ivB64 || !tagB64 || !encryptedB64) {
    throw new Error("Invalid ciphertext format");
  }

  const salt = Buffer.from(saltB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const key = crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    "sha512"
  );

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final("utf8");
}

/**
 * Hache une chaîne avec SHA-256 (usage: logs, emails dans les audits)
 * Non réversible - uniquement pour la comparaison et les logs anonymisés
 */
export function hashSHA256(value: string): string {
  return crypto
    .createHmac("sha256", process.env.HASH_SALT ?? "default-salt")
    .update(value)
    .digest("hex");
}

/**
 * Génère un identifiant élève unique au format STU-YYYY-XXXX
 * @param schoolCode - Code court de l'établissement (2-4 chars)
 */
export function generateStudentId(schoolCode: string): string {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `STU-${schoolCode.toUpperCase()}-${year}-${random}`;
}

/**
 * Génère un mot de passe temporaire sécurisé (12 chars)
 * Contient majuscules, minuscules, chiffres, symboles
 */
export function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;

  const bytes = crypto.randomBytes(12);
  let password = "";

  // Garantir au moins un de chaque type
  password += upper[bytes[0] % upper.length];
  password += lower[bytes[1] % lower.length];
  password += digits[bytes[2] % digits.length];
  password += symbols[bytes[3] % symbols.length];

  for (let i = 4; i < 12; i++) {
    password += all[bytes[i] % all.length];
  }

  // Mélanger aléatoirement
  return password
    .split("")
    .sort(() => crypto.randomBytes(1)[0] - 128)
    .join("");
}

/**
 * Valide que la force d'un mot de passe est suffisante
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  reason?: string;
} {
  if (password.length < 8) {
    return { valid: false, reason: "Minimum 8 caractères requis" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Au moins une majuscule requise" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Au moins une minuscule requise" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Au moins un chiffre requis" };
  }
  return { valid: true };
}
