/**
 * Seed Service — Peuple Firestore avec des données de démonstration complètes.
 * À appeler une seule fois depuis la page de login ou un bouton "Initialiser".
 *
 * Usage:
 *   import { seedDemoData } from '@/services/seed.service'
 *   await seedDemoData('demo-school')
 */

import { doc, setDoc, writeBatch, collection } from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { db, auth } from '@/config/firebase'
import { withTimestamps } from './db'
import type {
  StudentMember, TeacherMember, SchoolClass,
  Assessment, TeacherAttendanceRecord, ScheduleSlot,
  UserProfile,
} from '@school/shared-types'
import { UserRole } from '@school/shared-types'

const SCHOOL_ID = 'demo-school'

// ─── Demo Users ───────────────────────────────────────────────────────────────

const DEMO_USERS: UserProfile[] = [
  {
    id: 'user-direction-1',
    email: 'direction@demo.fr',
    displayName: 'Marie Kourouma',
    role: UserRole.DIRECTION,
    schoolId: SCHOOL_ID,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'user-teacher-1',
    email: 'prof@demo.fr',
    displayName: 'M. Jean Leblanc',
    role: UserRole.TEACHER,
    schoolId: SCHOOL_ID,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'user-teacher-2',
    email: 'prof2@demo.fr',
    displayName: 'Mme Aïssatou Diallo',
    role: UserRole.TEACHER,
    schoolId: SCHOOL_ID,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

// ─── Demo Classes ─────────────────────────────────────────────────────────────

const DEMO_CLASSES: (SchoolClass & { id: string })[] = [
  { id: 'class-5a', name: '5ème A', levelId: 'level-5', levelName: '5ème', academicYear: '2025-2026', mainTeacherId: 'teacher-1', mainTeacherName: 'M. Jean Leblanc', studentCount: 30, isActive: true },
  { id: 'class-5b', name: '5ème B', levelId: 'level-5', levelName: '5ème', academicYear: '2025-2026', mainTeacherId: 'teacher-2', mainTeacherName: 'Mme Aïssatou Diallo', studentCount: 28, isActive: true },
  { id: 'class-6a', name: '6ème A', levelId: 'level-6', levelName: '6ème', academicYear: '2025-2026', mainTeacherId: 'teacher-1', mainTeacherName: 'M. Jean Leblanc', studentCount: 32, isActive: true },
  { id: 'class-4a', name: '4ème A', levelId: 'level-4', levelName: '4ème', academicYear: '2025-2026', mainTeacherId: 'teacher-3', mainTeacherName: 'M. Ibrahima Sow', studentCount: 26, isActive: true },
]

// ─── Demo Teachers ────────────────────────────────────────────────────────────

const DEMO_TEACHERS: (TeacherMember & { id: string })[] = [
  { id: 'teacher-1', email: 'prof@demo.fr',  displayName: 'M. Jean Leblanc',     role: UserRole.TEACHER, schoolId: SCHOOL_ID, isActive: true, subjects: ['Mathématiques'], employeeId: 'EMP001', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'teacher-2', email: 'prof2@demo.fr', displayName: 'Mme Aïssatou Diallo', role: UserRole.TEACHER, schoolId: SCHOOL_ID, isActive: true, subjects: ['Français', 'Histoire-Géo'], employeeId: 'EMP002', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'teacher-3', email: 'prof3@demo.fr', displayName: 'M. Ibrahima Sow',     role: UserRole.TEACHER, schoolId: SCHOOL_ID, isActive: true, subjects: ['Physique-Chimie', 'SVT'], employeeId: 'EMP003', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'teacher-4', email: 'prof4@demo.fr', displayName: 'Mme Fatoumata Bah',   role: UserRole.TEACHER, schoolId: SCHOOL_ID, isActive: true, subjects: ['Anglais'], employeeId: 'EMP004', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'teacher-5', email: 'prof5@demo.fr', displayName: 'M. Oumar Traoré',     role: UserRole.TEACHER, schoolId: SCHOOL_ID, isActive: true, subjects: ['Informatique', 'Mathématiques'], employeeId: 'EMP005', createdAt: Date.now(), updatedAt: Date.now() },
]

// ─── Demo Students ────────────────────────────────────────────────────────────

function makeStudents(): (StudentMember & { id: string })[] {
  const names5a = ['Awa Diallo', 'Mamadou Koné', 'Fatoumata Bah', 'Ibrahim Sow', 'Mariam Camara', 'Oumar Traoré', 'Kadiatou Balde', 'Abdoulaye Diop', 'Aminata Keita', 'Sékou Condé']
  const names5b = ['Aissatou Barry', 'Boubacar Sylla', 'Hadja Keita', 'Thierno Baldé', 'Mariama Camara', 'Elhadj Bah', 'Fanta Sow', 'Ibrahima Diallo']
  const names6a = ['Mariama Bah', 'Elhadj Camara', 'Rabi Diallo', 'Saran Kouyaté', 'Alpha Bah', 'Mabinty Soumah']
  const names4a = ['Fanta Sow', 'Sekou Conde', 'Naby Doumbouya', 'Ramata Camara', 'Mamadou Barry']

  let idx = 1
  function make(names: string[], classId: string, className: string, levelId: string, levelName: string) {
    return names.map(name => ({
      id: `student-${idx++}`,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@eleve.demo.fr`,
      displayName: name,
      role: UserRole.STUDENT as const,
      schoolId: SCHOOL_ID,
      isActive: true,
      classId,
      className,
      levelId,
      levelName,
      studentNumber: `STU${String(idx).padStart(4, '0')}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))
  }

  return [
    ...make(names5a, 'class-5a', '5ème A', 'level-5', '5ème'),
    ...make(names5b, 'class-5b', '5ème B', 'level-5', '5ème'),
    ...make(names6a, 'class-6a', '6ème A', 'level-6', '6ème'),
    ...make(names4a, 'class-4a', '4ème A', 'level-4', '4ème'),
  ]
}

// ─── Demo Assessments ─────────────────────────────────────────────────────────

const DEMO_ASSESSMENTS: (Assessment & { id: string })[] = [
  {
    id: 'assess-1', schoolId: SCHOOL_ID, title: 'Devoir de classe — Algèbre', type: 'class',
    subjectId: 'subj-math', subjectName: 'Mathématiques', teacherId: 'teacher-1', teacherName: 'M. Jean Leblanc',
    classIds: ['class-5a'], classNames: ['5ème A'], trimester: 2,
    scheduledDate: new Date('2026-05-20').getTime(), duration: 60, coefficient: 2, maxScore: 20,
    status: 'submitted', instructions: 'Résoudre les équations du 1er et 2ème degré.',
    submittedAt: Date.now() - 86400000, grades: [], createdAt: Date.now() - 172800000, updatedAt: Date.now() - 86400000,
  },
  {
    id: 'assess-2', schoolId: SCHOOL_ID, title: 'Devoir Départemental — Mathématiques T2', type: 'departmental',
    subjectId: 'subj-math', subjectName: 'Mathématiques', teacherId: 'teacher-1', teacherName: 'M. Jean Leblanc',
    classIds: ['class-5a', 'class-5b'], classNames: ['5ème A', '5ème B'], trimester: 2,
    scheduledDate: new Date('2026-05-28').getTime(), duration: 120, coefficient: 3, maxScore: 40,
    status: 'approved', instructions: 'Devoir commun à toutes les classes de 5ème.',
    approvedAt: Date.now() - 43200000, approvedBy: 'Marie Kourouma', submittedAt: Date.now() - 172800000,
    grades: [], createdAt: Date.now() - 259200000, updatedAt: Date.now() - 43200000,
  },
  {
    id: 'assess-3', schoolId: SCHOOL_ID, title: 'Examen Trimestriel T2 — Français', type: 'trimester_exam',
    subjectId: 'subj-fr', subjectName: 'Français', teacherId: 'teacher-2', teacherName: 'Mme Aïssatou Diallo',
    classIds: ['class-5a', 'class-5b', 'class-6a'], classNames: ['5ème A', '5ème B', '6ème A'], trimester: 2,
    scheduledDate: new Date('2026-06-05').getTime(), duration: 180, coefficient: 4, maxScore: 40,
    status: 'graded', instructions: 'Dictée, rédaction et grammaire.',
    approvedAt: Date.now() - 604800000, approvedBy: 'Marie Kourouma', submittedAt: Date.now() - 1209600000,
    grades: [
      { studentId: 'student-1', studentName: 'Awa Diallo',    score: 32, comment: '' },
      { studentId: 'student-2', studentName: 'Mamadou Koné',  score: 28, comment: '' },
      { studentId: 'student-3', studentName: 'Fatoumata Bah', score: 35, comment: '' },
    ],
    avgScore: 16.25, createdAt: Date.now() - 1296000000, updatedAt: Date.now() - 259200000,
  },
  {
    id: 'assess-4', schoolId: SCHOOL_ID, title: 'TD — Fonctions et graphiques', type: 'class',
    subjectId: 'subj-math', subjectName: 'Mathématiques', teacherId: 'teacher-1', teacherName: 'M. Jean Leblanc',
    classIds: ['class-4a'], classNames: ['4ème A'], trimester: 2,
    scheduledDate: new Date('2026-05-15').getTime(), duration: 45, coefficient: 1, maxScore: 10,
    status: 'draft', instructions: 'Exercices de traçage et lecture de graphiques.', grades: [],
    createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000,
  },
  {
    id: 'assess-5', schoolId: SCHOOL_ID, title: 'Devoir de classe — Physique', type: 'class',
    subjectId: 'subj-phys', subjectName: 'Physique-Chimie', teacherId: 'teacher-3', teacherName: 'M. Ibrahima Sow',
    classIds: ['class-4a'], classNames: ['4ème A'], trimester: 2,
    scheduledDate: new Date('2026-05-22').getTime(), duration: 60, coefficient: 2, maxScore: 20,
    status: 'rejected', instructions: 'Optique et mécanique.', rejectionReason: 'Le sujet dépasse le programme du T2. Merci de revoir les objectifs.',
    rejectedAt: Date.now() - 172800000, submittedAt: Date.now() - 259200000,
    grades: [], createdAt: Date.now() - 345600000, updatedAt: Date.now() - 172800000,
  },
]

// ─── Demo Schedule ────────────────────────────────────────────────────────────

const COLORS: Record<string, string> = {
  cours: '#3B82F6', td: '#10B981', examen: '#EF4444', reunion: '#8B5CF6', permanence: '#6B7280',
}

function makeSlot(id: string, overrides: Partial<ScheduleSlot> & Pick<ScheduleSlot, 'day' | 'startTime' | 'endTime' | 'type' | 'subjectName' | 'teacherId' | 'teacherName' | 'classId' | 'className'>): ScheduleSlot & { id: string } {
  return {
    id,
    schoolId: SCHOOL_ID,
    subjectId: 'subj-math',
    room: 'Salle 1',
    color: COLORS[overrides.type],
    recurrent: true,
    validFrom: new Date('2025-09-01').getTime(),
    validTo: new Date('2026-06-30').getTime(),
    ...overrides,
  }
}

const DEMO_SLOTS: (ScheduleSlot & { id: string })[] = [
  makeSlot('slot-1',  { day: 0, startTime: '08:00', endTime: '10:00', type: 'cours',  subjectName: 'Mathématiques', teacherId: 'teacher-1', teacherName: 'M. Jean Leblanc',     classId: 'class-5a', className: '5ème A', room: 'Salle 12' }),
  makeSlot('slot-2',  { day: 0, startTime: '10:00', endTime: '12:00', type: 'cours',  subjectName: 'Français',      teacherId: 'teacher-2', teacherName: 'Mme Aïssatou Diallo', classId: 'class-5b', className: '5ème B', room: 'Salle 8'  }),
  makeSlot('slot-3',  { day: 0, startTime: '13:00', endTime: '14:00', type: 'td',     subjectName: 'Mathématiques', teacherId: 'teacher-1', teacherName: 'M. Jean Leblanc',     classId: 'class-6a', className: '6ème A', room: 'Labo A'  }),
  makeSlot('slot-4',  { day: 0, startTime: '14:00', endTime: '15:00', type: 'cours',  subjectName: 'Anglais',       teacherId: 'teacher-4', teacherName: 'Mme Fatoumata Bah',   classId: 'class-5a', className: '5ème A', room: 'Salle 5'  }),
  makeSlot('slot-5',  { day: 0, startTime: '15:00', endTime: '17:00', type: 'cours',  subjectName: 'Physique-Chimie', teacherId: 'teacher-3', teacherName: 'M. Ibrahima Sow', classId: 'class-4a', className: '4ème A', room: 'Labo B'  }),

  makeSlot('slot-6',  { day: 1, startTime: '08:00', endTime: '10:00', type: 'cours',  subjectName: 'Français',      teacherId: 'teacher-2', teacherName: 'Mme Aïssatou Diallo', classId: 'class-5a', className: '5ème A', room: 'Salle 8'  }),
  makeSlot('slot-7',  { day: 1, startTime: '10:00', endTime: '11:00', type: 'td',     subjectName: 'Anglais',       teacherId: 'teacher-4', teacherName: 'Mme Fatoumata Bah',   classId: 'class-5b', className: '5ème B', room: 'Salle 3'  }),
  makeSlot('slot-8',  { day: 1, startTime: '11:00', endTime: '12:00', type: 'cours',  subjectName: 'Mathématiques', teacherId: 'teacher-5', teacherName: 'M. Oumar Traoré',     classId: 'class-6a', className: '6ème A', room: 'Salle 12' }),
  makeSlot('slot-9',  { day: 1, startTime: '13:00', endTime: '15:00', type: 'cours',  subjectName: 'Informatique',  teacherId: 'teacher-5', teacherName: 'M. Oumar Traoré',     classId: 'class-4a', className: '4ème A', room: 'Info 1'   }),
  makeSlot('slot-10', { day: 1, startTime: '15:00', endTime: '16:00', type: 'reunion', subjectName: 'Conseil pédagogique', teacherId: 'teacher-1', teacherName: 'M. Jean Leblanc', classId: 'class-5a', className: '5ème A', room: 'Salle des profs' }),

  makeSlot('slot-11', { day: 2, startTime: '08:00', endTime: '10:00', type: 'cours',  subjectName: 'Mathématiques', teacherId: 'teacher-1', teacherName: 'M. Jean Leblanc',     classId: 'class-4a', className: '4ème A', room: 'Salle 12' }),
  makeSlot('slot-12', { day: 2, startTime: '10:00', endTime: '12:00', type: 'examen', subjectName: 'Français',      teacherId: 'teacher-2', teacherName: 'Mme Aïssatou Diallo', classId: 'class-5a', className: '5ème A', room: 'Grande salle' }),
  makeSlot('slot-13', { day: 2, startTime: '13:00', endTime: '14:00', type: 'td',     subjectName: 'SVT',           teacherId: 'teacher-3', teacherName: 'M. Ibrahima Sow',     classId: 'class-6a', className: '6ème A', room: 'Labo C'   }),
  makeSlot('slot-14', { day: 2, startTime: '14:00', endTime: '16:00', type: 'cours',  subjectName: 'Anglais',       teacherId: 'teacher-4', teacherName: 'Mme Fatoumata Bah',   classId: 'class-6a', className: '6ème A', room: 'Salle 5'  }),

  makeSlot('slot-15', { day: 3, startTime: '08:00', endTime: '09:00', type: 'cours',  subjectName: 'Mathématiques', teacherId: 'teacher-5', teacherName: 'M. Oumar Traoré',     classId: 'class-5b', className: '5ème B', room: 'Salle 12' }),
  makeSlot('slot-16', { day: 3, startTime: '09:00', endTime: '11:00', type: 'cours',  subjectName: 'Physique-Chimie', teacherId: 'teacher-3', teacherName: 'M. Ibrahima Sow', classId: 'class-5a', className: '5ème A', room: 'Labo B'   }),
  makeSlot('slot-17', { day: 3, startTime: '11:00', endTime: '12:00', type: 'td',     subjectName: 'Mathématiques', teacherId: 'teacher-1', teacherName: 'M. Jean Leblanc',     classId: 'class-5b', className: '5ème B', room: 'Salle 7'  }),
  makeSlot('slot-18', { day: 3, startTime: '13:00', endTime: '15:00', type: 'cours',  subjectName: 'Français',      teacherId: 'teacher-2', teacherName: 'Mme Aïssatou Diallo', classId: 'class-4a', className: '4ème A', room: 'Salle 8'  }),
  makeSlot('slot-19', { day: 3, startTime: '15:00', endTime: '17:00', type: 'examen', subjectName: 'Mathématiques', teacherId: 'teacher-1', teacherName: 'M. Jean Leblanc',     classId: 'class-6a', className: '6ème A', room: 'Grande salle' }),

  makeSlot('slot-20', { day: 4, startTime: '08:00', endTime: '10:00', type: 'cours',  subjectName: 'SVT',           teacherId: 'teacher-3', teacherName: 'M. Ibrahima Sow',     classId: 'class-5b', className: '5ème B', room: 'Labo C'   }),
  makeSlot('slot-21', { day: 4, startTime: '10:00', endTime: '12:00', type: 'cours',  subjectName: 'Informatique',  teacherId: 'teacher-5', teacherName: 'M. Oumar Traoré',     classId: 'class-5a', className: '5ème A', room: 'Info 1'   }),
  makeSlot('slot-22', { day: 4, startTime: '13:00', endTime: '14:00', type: 'td',     subjectName: 'Physique-Chimie', teacherId: 'teacher-3', teacherName: 'M. Ibrahima Sow', classId: 'class-4a', className: '4ème A', room: 'Labo B'   }),
  makeSlot('slot-23', { day: 4, startTime: '14:00', endTime: '16:00', type: 'cours',  subjectName: 'Anglais',       teacherId: 'teacher-4', teacherName: 'Mme Fatoumata Bah',   classId: 'class-5b', className: '5ème B', room: 'Salle 5'  }),
]

// ─── Demo Attendance ──────────────────────────────────────────────────────────

function getThisWeekDates(): string[] {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() + diffToMon + i)
    return d.toISOString().slice(0, 10)
  })
}

function makeAttendance(): (TeacherAttendanceRecord & { id: string })[] {
  const dates = getThisWeekDates()
  const dayLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
  const statuses = ['present', 'present', 'present', 'late', 'present'] as const

  const records: (TeacherAttendanceRecord & { id: string })[] = []
  let idx = 1

  for (const teacher of DEMO_TEACHERS) {
    for (let d = 0; d < 5; d++) {
      const status = statuses[(idx + d) % statuses.length]
      const isLate = status === 'late'
      const isAbsent = idx % 17 === 0

      records.push({
        id: `att-${idx++}`,
        schoolId: SCHOOL_ID,
        teacherId: teacher.id,
        teacherName: teacher.displayName,
        date: dates[d],
        dayLabel: dayLabels[d],
        scheduledStart: '08:00',
        scheduledEnd: '16:00',
        scheduledHours: 8,
        actualStart: isAbsent ? null : isLate ? '08:25' : '07:55',
        actualEnd:   isAbsent ? null : '16:05',
        effectiveHours: isAbsent ? 0 : isLate ? 7.5 : 8,
        status: isAbsent ? 'absent' : status,
        createdAt: Date.now(),
      })
    }
  }

  return records
}

// ─── Main seed function ───────────────────────────────────────────────────────

export async function seedDemoData(schoolId = SCHOOL_ID): Promise<{ success: boolean; error?: string }> {
  try {
    // Se connecter anonymement si pas encore authentifié
    // (nécessaire pour que les règles Firestore autorisent les écritures)
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth)
      } catch (authErr: unknown) {
        const code = (authErr as { code?: string }).code
        if (code === 'auth/operation-not-allowed') {
          return {
            success: false,
            error: 'L\'authentification anonyme doit être activée dans Firebase Console → Authentication → Sign-in method → Anonymous'
          }
        }
        throw authErr
      }
    }

    const MAX_BATCH = 400  // Firestore limit is 500 ops per batch
    let batch = writeBatch(db)
    let opCount = 0

    async function flush() {
      if (opCount === 0) return
      await batch.commit()
      batch = writeBatch(db)
      opCount = 0
    }

    function set(ref: ReturnType<typeof doc>, data: object) {
      batch.set(ref, data)
      opCount++
      if (opCount >= MAX_BATCH) {
        // We can't await here so we collect synchronously
        // actual flushing happens at checkpoints
      }
    }

    // Note: collection 'users' (racine) est gérée par Cloud Functions uniquement.
    // Le seed n'y écrit pas pour respecter les règles de sécurité (allow create: if false).

    // ── School meta ──────────────────────────────────────────────────────────
    set(doc(db, 'schools', schoolId), {
      id: schoolId,
      name: 'École de Démonstration',
      slug: 'demo-ecole',
      address: { street: '1 Rue de l\'Éducation', city: 'Conakry', country: 'Guinée' },
      contactEmail: 'admin@demo.fr',
      plan: 'pro',
      activeStudentCount: 96,
      academicYear: '2025-2026',
      status: 'active',
      features: { aiEnabled: true, examBank: true, analytics: true },
      ...withTimestamps({}),
    })
    await flush()

    // ── Classes ───────────────────────────────────────────────────────────────
    for (const cls of DEMO_CLASSES) {
      const { id, ...data } = cls
      set(doc(db, 'schools', schoolId, 'classes', id), { ...data, schoolId })
    }
    await flush()

    // ── Teachers ──────────────────────────────────────────────────────────────
    for (const t of DEMO_TEACHERS) {
      const { id, ...data } = t
      set(doc(db, 'schools', schoolId, 'teachers', id), { ...data, schoolId })
    }
    await flush()

    // ── Students ──────────────────────────────────────────────────────────────
    const students = makeStudents()
    for (const s of students) {
      const { id, ...data } = s
      set(doc(db, 'schools', schoolId, 'students', id), { ...data, schoolId })
      if (opCount >= MAX_BATCH) await flush()
    }
    await flush()

    // ── Assessments ───────────────────────────────────────────────────────────
    for (const a of DEMO_ASSESSMENTS) {
      const { id, ...data } = a
      set(doc(db, 'schools', schoolId, 'assessments', id), data)
    }
    await flush()

    // ── Schedule ──────────────────────────────────────────────────────────────
    for (const slot of DEMO_SLOTS) {
      const { id, ...data } = slot
      set(doc(db, 'schools', schoolId, 'schedule', id), data)
    }
    await flush()

    // ── Attendance ────────────────────────────────────────────────────────────
    const attendance = makeAttendance()
    for (const rec of attendance) {
      const { id, ...data } = rec
      set(doc(db, 'schools', schoolId, 'attendance', id), data)
      if (opCount >= MAX_BATCH) await flush()
    }
    await flush()

    return { success: true }
  } catch (err: unknown) {
    console.error('[seedDemoData] Error:', err)
    return { success: false, error: (err as Error).message }
  }
}

/** Check if the school already has data seeded */
export async function isSeeded(schoolId = SCHOOL_ID): Promise<boolean> {
  try {
    const { getDoc, doc: fsDoc } = await import('firebase/firestore')
    const snap = await getDoc(fsDoc(db, 'schools', schoolId))
    return snap.exists()
  } catch {
    return false
  }
}
