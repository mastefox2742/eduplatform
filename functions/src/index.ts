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

// ---------------------------------------------------------------
// Paiements & Mobile Money
// ---------------------------------------------------------------
export {
  initializePayment,
  paymentWebhook,
} from "./payments/mobileMoney";

// ---------------------------------------------------------------
// Reçus PDF
// ---------------------------------------------------------------
export {
  generatePaymentReceipt,
} from "./payments/receipt";

// ---------------------------------------------------------------
// Cycle de vie des élèves
// ---------------------------------------------------------------
export {
  yearRollover,
  archiveStudent,
} from "./firebase/yearRollover";

export {
  processCascadeDelete,
} from "./firebase/cascadeDelete";

// ---------------------------------------------------------------
// Export Universel (XLSX / CSV)
// ---------------------------------------------------------------
export {
  requestExport,
  processExportJob,
} from "./exports/universalExport";

// ---------------------------------------------------------------
// Paie & RH Enseignants
// ---------------------------------------------------------------
export {
  generateMonthlyPayroll,
  validatePayslip,
} from "./payroll/payroll";

// ---------------------------------------------------------------
// Budget & Trésorerie
// ---------------------------------------------------------------
export {
  addExpense,
  getCashflowDashboard,
} from "./budget/budget";

// ---------------------------------------------------------------
// Rapports Ministériels
// ---------------------------------------------------------------
export {
  generateMinistryReport,
  checkReportCompliance,
} from "./reports/ministryReports";

// ---------------------------------------------------------------
// Discipline & Vie scolaire
// ---------------------------------------------------------------
export { issueDisciplineRecord } from "./discipline/discipline";

// ---------------------------------------------------------------
// CRM Inscriptions & Relances
// ---------------------------------------------------------------
export {
  sendPaymentReminders,
  weeklyPaymentReminders,
  upsertInscriptionLead,
} from "./crm/relances";

// ---------------------------------------------------------------
// Pédagogie IA & Gamification
// ---------------------------------------------------------------
export {
  generateFicheCours,
  checkAndAwardBadges,
} from "./pedagogy/ficheCours";

// ---------------------------------------------------------------
// Appréciations IA & Listes d'émargement
// ---------------------------------------------------------------
export {
  generateBulletinAppreciation,
  generateEmargementList,
} from "./ai/appreciations";

// ---------------------------------------------------------------
// Caisse physique (espèces / chèques)
// ---------------------------------------------------------------
export { recordCashPayment } from "./payments/cashPayment";

// ---------------------------------------------------------------
// Messagerie WhatsApp / SMS
// ---------------------------------------------------------------
export {
  sendManualAlert,
  onAttendanceAbsence,
} from "./messaging/whatsapp";

