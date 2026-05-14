// ============================================================
// TYPES ET INTERFACES CENTRAUX
// Plateforme éducative - Données d'élèves mineurs
// ============================================================

export type UserRole = "direction" | "professeur" | "eleve";

export interface CustomClaims {
  role: UserRole;
  schoolId: string;
  etablissementId?: string;
  classeId?: string;
  teacherId?: string;
}

// ---------------------------------------------------------------
// Profil utilisateur (document Firestore /users/{uid})
// ---------------------------------------------------------------
export interface UserProfile {
  uid: string;
  role: UserRole;
  schoolId: string;
  displayName: string;           // Prénom + initiale du nom (jamais nom complet seul)
  email: string;                 // hashé en SHA-256 côté stockage pour les logs
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  isActive: boolean;
  lastLoginAt?: FirebaseFirestore.Timestamp;
  // RGPD
  consentVersion: string;        // version de la politique de confidentialité acceptée
  consentDate?: FirebaseFirestore.Timestamp;
  deletionRequestedAt?: FirebaseFirestore.Timestamp;
}

// ---------------------------------------------------------------
// Profil élève (document Firestore /students/{uid})
// ---------------------------------------------------------------
export interface StudentProfile {
  uid: string;
  studentId: string;             // identifiant unique généré (ex: STU-2024-XXXX)
  schoolId: string;
  classeId: string;
  displayName: string;           // prénom + initiale nom (JAMAIS nom complet en clair)
  // Les données sensibles (date de naissance, adresse, contacts parents)
  // sont stockées dans un document chiffré séparé /students/{uid}/private/data
  progressStats: {
    totalLessonsCompleted: number;
    totalQuizzesCompleted: number;
    averageScore: number;
    lastActivityAt?: FirebaseFirestore.Timestamp;
  };
  createdBy: string;             // uid de la direction qui a créé le compte
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  isActive: boolean;
}

// ---------------------------------------------------------------
// Données privées élève (document /students/{uid}/private/data)
// Accès restreint - chiffrement obligatoire côté application
// ---------------------------------------------------------------
export interface StudentPrivateData {
  // Ces champs NE doivent JAMAIS apparaître dans les logs
  dateOfBirth: string;           // format ISO, chiffré AES-256
  parentEmail: string;           // chiffré
  parentPhone?: string;          // chiffré
  address?: string;              // chiffré
  medicalNotes?: string;         // chiffré - allergies, besoins spéciaux
  nationalId?: string;           // STRICTEMENT chiffré, accès direction uniquement
}

// ---------------------------------------------------------------
// Cours (document Firestore /courses/{courseId})
// ---------------------------------------------------------------
export interface Course {
  courseId: string;
  schoolId: string;
  teacherId: string;
  title: string;
  description: string;
  subject: string;
  classeIds: string[];           // classes autorisées à accéder
  pdfStoragePath?: string;       // chemin Firebase Storage
  isPublished: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ---------------------------------------------------------------
// Progression élève (document /progress/{uid}/courses/{courseId})
// ---------------------------------------------------------------
export interface StudentProgress {
  studentId: string;
  courseId: string;
  schoolId: string;
  lessonsCompleted: string[];    // IDs des leçons vues
  quizResults: QuizResult[];
  lastAccessedAt: FirebaseFirestore.Timestamp;
  completionPercentage: number;
}

export interface QuizResult {
  quizId: string;
  score: number;                 // 0-100
  completedAt: FirebaseFirestore.Timestamp;
  timeSpentSeconds: number;
}

// ---------------------------------------------------------------
// Notification (document /notifications/{notifId})
// ---------------------------------------------------------------
export interface Notification {
  id: string;
  schoolId: string;
  recipientUid: string;
  senderUid: string;
  type: "assignment" | "grade" | "announcement" | "system";
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;  // TTL pour purge automatique
}

// ---------------------------------------------------------------
// Log d'audit (document /auditLogs/{logId}) - IMMUABLE
// ---------------------------------------------------------------
export interface AuditLog {
  id: string;
  schoolId: string;
  actorUid: string;
  actorRole: UserRole;
  action: string;                // ex: "student.create", "course.delete"
  targetId?: string;
  targetType?: string;
  metadata: Record<string, unknown>;
  ip?: string;                   // hashé en production
  timestamp: FirebaseFirestore.Timestamp;
  // Les logs ne sont jamais supprimés avant la durée légale (5 ans)
  retentionUntil: FirebaseFirestore.Timestamp;
}

// ---------------------------------------------------------------
// Requête de génération de credentials
// ---------------------------------------------------------------
export interface GenerateStudentCredentialsRequest {
  firstName: string;
  lastName: string;
  classeId: string;
  schoolId: string;
  dateOfBirth?: string;          // transmis chiffré
  parentEmail?: string;          // transmis chiffré
}

export interface GenerateStudentCredentialsResponse {
  success: boolean;
  studentId: string;
  uid: string;
  temporaryPassword: string;     // à changer dès la première connexion
  email: string;
}

// ---------------------------------------------------------------
// Requête d'analyse de progression
// ---------------------------------------------------------------
export interface AnalyzeProgressRequest {
  studentUid: string;
  courseId?: string;             // null = toutes les matières
  periodDays?: number;           // fenêtre d'analyse (défaut: 30)
}

export interface ProgressAnalysisResult {
  studentUid: string;
  schoolId: string;
  period: { from: string; to: string };
  summary: {
    totalLessons: number;
    completedLessons: number;
    averageScore: number;
    timeSpentMinutes: number;
    progressTrend: "improving" | "stable" | "declining";
  };
  bySubject: SubjectSummary[];
  recommendations: string[];     // générées par IA
}

export interface SubjectSummary {
  subject: string;
  courseId: string;
  completionPercentage: number;
  averageScore: number;
  lastActivityAt: string;
}

// ---------------------------------------------------------------
// Requête proxy IA
// ---------------------------------------------------------------
export interface AIProxyRequest {
  prompt: string;
  context?: "quiz_generation" | "progress_analysis" | "content_summary";
  courseId?: string;
  maxTokens?: number;
}

export interface AIProxyResponse {
  success: boolean;
  result: string;
  tokensUsed: number;
  model: string;
}
