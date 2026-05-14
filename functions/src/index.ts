// ============================================================
// POINT D'ENTRÉE PRINCIPAL DES CLOUD FUNCTIONS
// Exports centralisés de toutes les fonctions
// ============================================================

import * as admin from "firebase-admin";

// Initialisation Firebase Admin (une seule fois)
admin.initializeApp({
  // La configuration est automatique dans l'environnement Cloud Functions
  // Pour le développement local, utiliser GOOGLE_APPLICATION_CREDENTIALS
});

// ---------------------------------------------------------------
// Auth & Utilisateurs
// ---------------------------------------------------------------
export {
  onCreateUser,
  generateStudentCredentials,
  setUserRole,
  deactivateUser,
} from "./firebase/auth";

// ---------------------------------------------------------------
// Progression
// ---------------------------------------------------------------
export {
  analyzeStudentProgress,
  onProgressUpdate,
} from "./firebase/progress";

// ---------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------
export {
  sendNotification,
  cleanupExpiredNotifications,
  registerFcmToken,
} from "./firebase/notifications";

// ---------------------------------------------------------------
// Proxy IA Sécurisé (Gemini)
// ---------------------------------------------------------------
export {
  callAI,
  resetDailyAIQuotas,
} from "./ai/proxy";

// ---------------------------------------------------------------
// RGPD - Droit à l'oubli, portabilité, consentement
// ---------------------------------------------------------------
export {
  requestDataDeletion,
  processDataDeletionQueue,
  exportUserData,
  updateConsent,
} from "./firebase/gdpr";

// ---------------------------------------------------------------
// Monitoring, Alertes et Quotas
// ---------------------------------------------------------------
export {
  systemHealthCheck,
  getSystemMetrics,
  detectSuspiciousActivity,
  reportSecurityIncident,
} from "./firebase/monitoring";

// ---------------------------------------------------------------
// Systeme IA Pedagogique (RAG + Correction + Progression)
// ---------------------------------------------------------------
export {
  gradeExercise,
  generateHint,
  analyzeStudentProgress as analyzeProgressAI,
  addTeacherSolution,
  onSubmissionCreated,
} from "./ai/functions";
