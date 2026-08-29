/**
 * Service layer Supabase — remplace services/firestore.ts
 *
 * Toutes les opérations CRUD passent par ce fichier.
 * Le Realtime (équivalent onSnapshot) est géré dans les hooks.
 *
 * Conventions :
 *   - Les fonctions retournent les données ou throw une Error
 *   - snake_case pour les colonnes (PostgreSQL)
 *   - Les hooks font le mapping vers les types UI
 */
import { supabase } from '@/config/supabase'
import type { BulletinInsert, AssessmentInsert } from '@/config/supabase'

// ── BULLETINS ─────────────────────────────────────────────────────────────────

export async function submitBulletin(
  schoolId: string,
  data: {
    studentId:    string
    studentName:  string
    classId?:     string
    className?:   string
    teacherId?:   string
    teacherName?: string
    trimestre:    'T1' | 'T2' | 'T3'
    schoolYear?:  string
    subject:      string
    average?:     number | null
    conduct?:     string
    appreciation?: string
    assessments?: { title: string; value: number | null; maxScore: number; coeff: number }[]
  }
): Promise<string> {
  const { data: bulletin, error } = await supabase
    .from('bulletins')
    .upsert({
      school_id:    schoolId,
      student_id:   data.studentId,
      student_name: data.studentName,
      class_id:     data.classId     ?? null,
      class_name:   data.className   ?? null,
      teacher_id:   data.teacherId   ?? null,
      teacher_name: data.teacherName ?? null,
      trimestre:    data.trimestre,
      school_year:  data.schoolYear  ?? '2025-2026',
      subject:      data.subject,
      average:      data.average     ?? null,
      conduct:      data.conduct     ?? 'Bien',
      appreciation: data.appreciation ?? null,
      status:       'submitted',
      submitted_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }, {
      onConflict: 'school_id,student_id,trimestre,subject',
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  // Insérer les évaluations
  if (data.assessments && data.assessments.length > 0) {
    await supabase.from('bulletin_assessments').delete().eq('bulletin_id', bulletin.id)
    await supabase.from('bulletin_assessments').insert(
      data.assessments.map(a => ({
        bulletin_id: bulletin.id,
        title:       a.title,
        value:       a.value,
        max_score:   a.maxScore,
        coefficient: a.coeff,
      }))
    )
  }

  return bulletin.id
}

export async function validateBulletin(
  bulletinId: string,
  directorComment: string
): Promise<void> {
  const { error } = await supabase
    .from('bulletins')
    .update({
      status:           'approved',
      director_comment: directorComment,
      approved_at:      new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    })
    .eq('id', bulletinId)

  if (error) throw new Error(error.message)
}

export async function rejectBulletin(
  bulletinId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('bulletins')
    .update({
      status:           'rejected',
      rejection_reason: reason,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', bulletinId)

  if (error) throw new Error(error.message)
}

export async function publishBulletin(bulletinId: string): Promise<void> {
  const { error } = await supabase
    .from('bulletins')
    .update({
      status:       'published',
      published_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq('id', bulletinId)

  if (error) throw new Error(error.message)
}

// ── PRÉSENCES ─────────────────────────────────────────────────────────────────

export async function saveAttendance(
  schoolId:  string,
  classId:   string,
  dateISO:   string,
  teacherId: string,
  records:   Record<string, { studentName: string; status: string; note?: string }>,
  meta:      { className: string; dayLabel: string; subject: string }
): Promise<void> {
  // Upsert de la session (clé unique : school + class + date + teacher)
  const { data: session, error: sessionError } = await supabase
    .from('attendance_sessions')
    .upsert({
      school_id:   schoolId,
      class_id:    classId,
      class_name:  meta.className,
      teacher_id:  teacherId,
      subject:     meta.subject,
      date:        dateISO,
      day_label:   meta.dayLabel,
      school_year: '2025-2026',
      saved_at:    new Date().toISOString(),
    }, { onConflict: 'school_id,class_id,date,teacher_id' })
    .select('id')
    .single()

  if (sessionError) throw new Error(sessionError.message)

  // Upsert de chaque enregistrement élève
  const rows = Object.entries(records).map(([studentId, rec]) => ({
    session_id:   session.id,
    student_id:   studentId,
    student_name: rec.studentName,
    status:       rec.status,
    note:         rec.note ?? null,
  }))

  if (rows.length > 0) {
    const { error } = await supabase
      .from('attendance_records')
      .upsert(rows, { onConflict: 'session_id,student_id' })
    if (error) throw new Error(error.message)
  }
}

// ── ANNONCES ─────────────────────────────────────────────────────────────────

export async function markAnnouncementRead(
  announcementId: string,
  userId: string
): Promise<void> {
  // Utiliser une fonction PostgreSQL pour arrayUnion sécurisé
  const { error } = await supabase.rpc('append_to_array_if_not_exists', {
    table_name:  'announcements',
    column_name: 'read_by',
    row_id:      announcementId,
    value:       userId,
  })
  if (error) {
    // Fallback : lecture puis écriture
    const { data } = await supabase
      .from('announcements')
      .select('read_by')
      .eq('id', announcementId)
      .single()

    if (data && !data.read_by.includes(userId)) {
      await supabase
        .from('announcements')
        .update({ read_by: [...data.read_by, userId] })
        .eq('id', announcementId)
    }
  }
}

// ── CONFIGURATION ÉCOLE ────────────────────────────────────────────────────────

export async function saveSchoolConfig(
  schoolId: string,
  config: {
    annee?:           string
    trimestres?:      any[]
    matieres_levels?: Record<string, any>
    regles?:          any[]
  }
): Promise<void> {
  const { error } = await supabase
    .from('school_configs')
    .upsert({
      school_id:      schoolId,
      ...config,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'school_id' })

  if (error) throw new Error(error.message)
}

// ── STORAGE ──────────────────────────────────────────────────────────────────

export async function uploadProfilePhoto(userId: string, localUri: string): Promise<string> {
  const ext      = localUri.split('.').pop() ?? 'jpg'
  const path     = `avatars/${userId}.${ext}`
  const response = await fetch(localUri)
  const blob     = await response.blob()

  const { error } = await supabase.storage
    .from('user-media')
    .upload(path, blob, { upsert: true, contentType: `image/${ext}` })

  if (error) throw new Error(error.message)

  return supabase.storage.from('user-media').getPublicUrl(path).data.publicUrl
}

// ── OFFLINE QUEUE EXECUTOR (pour useSyncQueue) ────────────────────────────────


// ── APPEL DE PRESENCE (verticale vie scolaire migree) ─────────────────────────

export interface AttendanceSubmission {
  schoolId:  string
  classId:   string
  subjectId: string | null
  teacherId: string
  periodId:  string | null
  dateISO:   string
  slotId:    string | null
  records: Array<{
    student_id:   string
    student_name: string
    status:       string
    late_minutes: number | null
    note:         string | null
    reason_id:    string | null
  }>
}

/**
 * Enregistre un appel complet.
 *
 * Deux ecritures, dans cet ordre : la session puis ses lignes.
 * L'upsert rend l'operation rejouable — indispensable, car la file
 * hors ligne peut la soumettre plusieurs fois (§19.3).
 *
 * L'appartenance de l'enseignant a la classe n'est pas verifiee ici :
 * c'est RLS qui refuse l'ecriture si `teaches_class()` est faux (§26).
 * Un controle client serait contournable.
 */
export async function saveAttendanceSession(sub: AttendanceSubmission): Promise<void> {
  const { data: session, error: sessionError } = await supabase
    .from('attendance_sessions')
    .upsert(
      {
        school_id:   sub.schoolId,
        class_id:    sub.classId,
        subject_id:  sub.subjectId,
        teacher_id:  sub.teacherId,
        period_id:   sub.periodId,
        slot_id:     sub.slotId,
        date:        sub.dateISO,
        saved_at:    new Date().toISOString(),
      },
      { onConflict: 'school_id,class_id,date,teacher_id' }
    )
    .select('id')
    .single()

  if (sessionError) throw new Error(sessionError.message)

  const rows = sub.records.map((r) => ({
    session_id:   session.id,
    student_id:   r.student_id,
    student_name: r.student_name,
    status:       r.status,
    late_minutes: r.late_minutes,
    note:         r.note,
    reason_id:    r.reason_id,
  }))

  const { error: recordsError } = await supabase
    .from('attendance_records')
    .upsert(rows, { onConflict: 'session_id,student_id' })

  if (recordsError) throw new Error(recordsError.message)
}


// ── FILE DE VALIDATION DU DIRECTEUR ───────────────────────────────────────────
// Cahier des charges §3.3, §13.3, §20.1.
//
// Un bulletin passe par : brouillon -> soumis -> controle -> valide -> publie.
// Signer ne publie pas : la publication est un geste distinct, car c'est
// elle qui rend le bulletin visible aux familles (§13.3).

/**
 * Valide et signe un bulletin de synthese.
 *
 * `signed_by` porte l'identite du signataire : c'est ce qui distingue
 * une validation d'une signature, et ce qui figure sur le PDF.
 */
export async function signBulletinSummary(
  summaryId: string,
  signerId: string,
  comment?: string
): Promise<void> {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('bulletin_summaries')
    .update({
      state:        'valide',
      validated_by: signerId,
      validated_at: now,
      signed_by:    signerId,
      ...(comment ? { general_comment: comment } : {}),
    })
    .eq('id', summaryId)

  if (error) throw new Error(error.message)
}

/** Renvoie un bulletin a l'enseignant, avec le motif du refus. */
export async function rejectBulletinSummary(
  summaryId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('bulletin_summaries')
    .update({ state: 'rejete', general_comment: reason })
    .eq('id', summaryId)

  if (error) throw new Error(error.message)
}

/**
 * Publie un bulletin : c'est a cet instant qu'il devient visible par
 * l'eleve et ses parents (§13.3). RLS s'appuie sur `state = 'publie'`.
 */
export async function publishBulletinSummary(summaryId: string): Promise<void> {
  const { error } = await supabase
    .from('bulletin_summaries')
    .update({ state: 'publie', published_at: new Date().toISOString() })
    .eq('id', summaryId)

  if (error) throw new Error(error.message)
}

/** Signe une demande de document officiel. */
export async function signDocumentRequest(
  requestId: string,
  signerId: string
): Promise<void> {
  const { error } = await supabase
    .from('document_requests')
    .update({
      status:    'signe',
      signed_by: signerId,
      signed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) throw new Error(error.message)
}

export async function refuseDocumentRequest(
  requestId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('document_requests')
    .update({ status: 'refuse', refusal_reason: reason })
    .eq('id', requestId)

  if (error) throw new Error(error.message)
}


// ── SAISIE DES NOTES ──────────────────────────────────────────────────────────

export interface GradeBatch {
  schoolId:     string
  assessmentId: string
  grades: Array<{
    student_id: string
    score:      number | null
    state:      string
  }>
}

/**
 * Enregistre un lot de notes.
 *
 * L'upsert rend l'operation rejouable : la file hors ligne peut la
 * soumettre plusieurs fois sans creer de doublon (§19.3). La contrainte
 * unique (assessment_id, student_id) garantit une note par eleve.
 *
 * Le droit de saisie n'est pas verifie ici : RLS refuse l'ecriture si
 * l'evaluation n'appartient pas a l'enseignant ou si la periode est
 * fermee (§26). Un controle client serait contournable.
 */
export async function saveGradeBatch(batch: GradeBatch): Promise<void> {
  const rows = batch.grades.map((g) => ({
    school_id:     batch.schoolId,
    assessment_id: batch.assessmentId,
    student_id:    g.student_id,
    score:         g.score,
    state:         g.state,
    updated_at:    new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('grades')
    .upsert(rows, { onConflict: 'assessment_id,student_id' })

  if (error) throw new Error(error.message)
}

export type SupabaseOp =
  | { type: 'submitBulletin';      schoolId: string; data: Parameters<typeof submitBulletin>[1] }
  | { type: 'saveAttendance';      schoolId: string; classId: string; dateISO: string; teacherId: string; records: any; meta: any }
  | { type: 'validateBulletin';    bulletinId: string; comment: string }
  | { type: 'rejectBulletin';      bulletinId: string; reason: string }
  | { type: 'publishBulletin';     bulletinId: string }
  | { type: 'markAnnouncementRead'; announcementId: string; userId: string }

export async function executeSupabaseOp(op: SupabaseOp): Promise<void> {
  switch (op.type) {
    case 'submitBulletin':
      await submitBulletin(op.schoolId, op.data)
      break
    case 'saveAttendance':
      await saveAttendance(op.schoolId, op.classId, op.dateISO, op.teacherId, op.records, op.meta)
      break
    case 'validateBulletin':
      await validateBulletin(op.bulletinId, op.comment)
      break
    case 'rejectBulletin':
      await rejectBulletin(op.bulletinId, op.reason)
      break
    case 'publishBulletin':
      await publishBulletin(op.bulletinId)
      break
    case 'markAnnouncementRead':
      await markAnnouncementRead(op.announcementId, op.userId)
      break
  }
}
