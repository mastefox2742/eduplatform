// ============================================================
// CLOUD FUNCTIONS - AUTHENTIFICATION ET GESTION DES UTILISATEURS
// ============================================================

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { UserRecord } from "firebase-admin/auth";
import {
  CustomClaims,
  UserProfile,
  StudentProfile,
  GenerateStudentCredentialsRequest,
  GenerateStudentCredentialsResponse,
} from "../types";
import {
  generateStudentId,
  generateTemporaryPassword,
  encrypt,
  hashSHA256,
} from "../utils/crypto";
import { writeAuditLog, checkRateLimit } from "../utils/audit";

const db = admin.firestore();
const auth = admin.auth();

// ---------------------------------------------------------------
// TRIGGER : onCreateUser
// Exécuté automatiquement à chaque création d'utilisateur Firebase Auth
// Configure le profil Firestore et les Custom Claims selon le rôle
// ---------------------------------------------------------------
export const onCreateUser = functions.auth.user().onCreate(
  async (user: UserRecord) => {
    const { uid, email, displayName } = user;

    // Le rôle doit être défini dans les Custom Claims lors de la création
    // S'il n'est pas défini, on attribue "eleve" par défaut (moindre privilège)
    const existingClaims = (await auth.getUser(uid)).customClaims as
      | CustomClaims
      | undefined;

    const role = existingClaims?.role ?? "eleve";
    const schoolId = existingClaims?.schoolId ?? "unknown";

    // Créer le profil utilisateur de base
    const now = admin.firestore.Timestamp.now();
    const userProfile: UserProfile = {
      uid,
      role,
      schoolId,
      displayName: displayName ?? email?.split("@")[0] ?? uid.slice(0, 8),
      email: email ?? "",
      createdAt: now,
      updatedAt: now,
      isActive: true,
      consentVersion: "1.0",
    };

    await db.collection("users").doc(uid).set(userProfile);

    await writeAuditLog({
      schoolId,
      actorUid: uid,
      actorRole: role,
      action: "user.created",
      targetId: uid,
      targetType: "user",
      metadata: { role },
    });

    functions.logger.info(`User profile created for ${uid}`, { role, schoolId });
  }
);

// ---------------------------------------------------------------
// CALLABLE FUNCTION : generateStudentCredentials
// Réservée à la direction (role: "direction")
// Crée un compte élève avec identifiant auto-généré et mot de passe temporaire
// ---------------------------------------------------------------
export const generateStudentCredentials = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,        // Requiert Firebase App Check (anti-bot)
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (
    request: functions.https.CallableRequest<GenerateStudentCredentialsRequest>
  ): Promise<GenerateStudentCredentialsResponse> => {
    // 1. Vérification d'authentification
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const callerUid = request.auth.uid;
    const claims = request.auth.token as CustomClaims & { role?: string };

    // 2. Vérification du rôle - seule la direction peut créer des élèves
    if (claims.role !== "direction") {
      await writeAuditLog({
        schoolId: claims.schoolId ?? "unknown",
        actorUid: callerUid,
        actorRole: claims.role as "direction",
        action: "student.create.unauthorized",
        metadata: { attemptedRole: claims.role },
      });
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only direction can create student accounts"
      );
    }

    // 3. Rate limiting : max 50 créations d'élèves par heure par établissement
    const rateLimitKey = `generateStudent:${claims.schoolId}`;
    const rateCheck = await checkRateLimit(rateLimitKey, 50, 3600);
    if (!rateCheck.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Rate limit exceeded. Maximum 50 student creations per hour."
      );
    }

    // 4. Validation des données d'entrée
    const { firstName, lastName, classeId, schoolId, dateOfBirth, parentEmail } =
      request.data;

    if (!firstName || !lastName || !classeId || !schoolId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "firstName, lastName, classeId and schoolId are required"
      );
    }

    // Vérifier que la direction crée un élève pour son établissement
    if (schoolId !== claims.schoolId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Cannot create students for another school"
      );
    }

    // 5. Génération des identifiants
    const schoolCode = schoolId.slice(0, 4).toUpperCase();
    const studentId = generateStudentId(schoolCode);
    const temporaryPassword = generateTemporaryPassword();

    // L'email est généré à partir de l'identifiant (non-personnel)
    const studentEmail = `${studentId.toLowerCase()}@${schoolId}.edu.local`;

    // 6. Création du compte Firebase Auth
    let userRecord: UserRecord;
    try {
      userRecord = await auth.createUser({
        email: studentEmail,
        password: temporaryPassword,
        displayName: `${firstName} ${lastName.charAt(0)}.`,  // Pas de nom complet
        emailVerified: false,
        disabled: false,
      });
    } catch (error) {
      functions.logger.error("Failed to create Firebase Auth user", { error });
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create user account"
      );
    }

    // 7. Attribution des Custom Claims (rôle eleve)
    const studentClaims: CustomClaims = {
      role: "eleve",
      schoolId,
      classeId,
    };

    await auth.setCustomUserClaims(userRecord.uid, studentClaims);

    // 8. Création du profil élève dans Firestore (données NON sensibles)
    const now = admin.firestore.Timestamp.now();
    const studentProfile: StudentProfile = {
      uid: userRecord.uid,
      studentId,
      schoolId,
      classeId,
      displayName: `${firstName} ${lastName.charAt(0)}.`,
      progressStats: {
        totalLessonsCompleted: 0,
        totalQuizzesCompleted: 0,
        averageScore: 0,
      },
      createdBy: callerUid,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    const batch = db.batch();
    batch.set(db.collection("students").doc(userRecord.uid), studentProfile);

    // 9. Données sensibles chiffrées dans sous-collection privée
    // Accès restreint par les Security Rules (/students/{uid}/private/data)
    if (dateOfBirth || parentEmail) {
      const privateData: Record<string, string> = {};

      if (dateOfBirth) {
        privateData.dateOfBirth = encrypt(dateOfBirth);
      }
      if (parentEmail) {
        privateData.parentEmail = encrypt(parentEmail);
        // Hash de l'email parent pour les recherches (sans exposer le clair)
        privateData.parentEmailHash = hashSHA256(parentEmail);
      }

      batch.set(
        db
          .collection("students")
          .doc(userRecord.uid)
          .collection("private")
          .doc("data"),
        privateData
      );
    }

    // 10. Marquer que l'élève doit changer son mot de passe à la première connexion
    batch.set(
      db.collection("users").doc(userRecord.uid),
      {
        uid: userRecord.uid,
        role: "eleve",
        schoolId,
        displayName: `${firstName} ${lastName.charAt(0)}.`,
        email: studentEmail,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        mustChangePassword: true,   // Forcé au premier login
        consentVersion: "pending",  // Le consentement RGPD doit être recueilli
      } as UserProfile & { mustChangePassword: boolean },
      { merge: true }
    );

    await batch.commit();

    // 11. Log d'audit (sans données sensibles)
    await writeAuditLog({
      schoolId,
      actorUid: callerUid,
      actorRole: "direction",
      action: "student.create.success",
      targetId: userRecord.uid,
      targetType: "student",
      metadata: {
        studentId,
        classeId,
        // NE PAS loguer : firstName, lastName complet, dateOfBirth, parentEmail
        firstNameInitial: firstName.charAt(0),
      },
    });

    functions.logger.info(`Student created: ${studentId}`, {
      uid: userRecord.uid,
      schoolId,
      classeId,
    });

    return {
      success: true,
      studentId,
      uid: userRecord.uid,
      temporaryPassword,     // Transmis UNE SEULE FOIS, jamais stocké en clair
      email: studentEmail,
    };
  }
);

// ---------------------------------------------------------------
// CALLABLE FUNCTION : setUserRole
// Permet à la direction de modifier le rôle d'un utilisateur
// ---------------------------------------------------------------
export const setUserRole = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
    memory: "256MiB",
  },
  async (
    request: functions.https.CallableRequest<{
      targetUid: string;
      role: "professeur" | "eleve";
      classeId?: string;
      teacherId?: string;
    }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const claims = request.auth.token as CustomClaims;
    if (claims.role !== "direction") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only direction can modify roles"
      );
    }

    const { targetUid, role, classeId, teacherId } = request.data;

    // Vérifier que l'utilisateur cible appartient au même établissement
    const targetUser = await db.collection("users").doc(targetUid).get();
    if (!targetUser.exists || targetUser.data()?.schoolId !== claims.schoolId) {
      throw new functions.https.HttpsError(
        "not-found",
        "User not found in this school"
      );
    }

    const newClaims: CustomClaims = {
      role,
      schoolId: claims.schoolId,
      classeId,
      teacherId,
    };

    await auth.setCustomUserClaims(targetUid, newClaims);
    await db.collection("users").doc(targetUid).update({
      role,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Révoquer les sessions actives pour forcer un re-login avec les nouveaux claims
    await auth.revokeRefreshTokens(targetUid);

    await writeAuditLog({
      schoolId: claims.schoolId,
      actorUid: request.auth.uid,
      actorRole: "direction",
      action: "user.role.changed",
      targetId: targetUid,
      targetType: "user",
      metadata: { newRole: role, classeId, teacherId },
    });

    return { success: true };
  }
);

// ---------------------------------------------------------------
// CALLABLE FUNCTION : deactivateUser
// Désactive un compte sans le supprimer (conservation des données pédagogiques)
// ---------------------------------------------------------------
export const deactivateUser = functions.https.onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
  },
  async (
    request: functions.https.CallableRequest<{ targetUid: string; reason: string }>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const claims = request.auth.token as CustomClaims;
    if (claims.role !== "direction") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only direction can deactivate accounts"
      );
    }

    const { targetUid, reason } = request.data;

    await auth.updateUser(targetUid, { disabled: true });
    await auth.revokeRefreshTokens(targetUid);

    await db.collection("users").doc(targetUid).update({
      isActive: false,
      updatedAt: admin.firestore.Timestamp.now(),
      deactivationReason: reason,
      deactivatedBy: request.auth.uid,
      deactivatedAt: admin.firestore.Timestamp.now(),
    });

    await writeAuditLog({
      schoolId: claims.schoolId,
      actorUid: request.auth.uid,
      actorRole: "direction",
      action: "user.deactivated",
      targetId: targetUid,
      targetType: "user",
      metadata: { reason },
    });

    return { success: true };
  }
);
