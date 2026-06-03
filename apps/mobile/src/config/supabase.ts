/**
 * Supabase client — remplace firebase.ts
 *
 * Variables d'environnement requises dans .env.local :
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
 *
 * La clé anon (publique) est sécurisée par RLS — elle peut être
 * dans le bundle mobile. La service_role key ne doit JAMAIS y être.
 */
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Variables d\'environnement manquantes.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persister la session dans AsyncStorage (React Native)
    storage:           AsyncStorage,
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  global: {
    headers: { 'x-app-version': '1.0.0' },
  },
})

// Types générés depuis le schéma PostgreSQL
export type Database = {
  public: {
    Tables: {
      schools:               { Row: SchoolRow;            Insert: SchoolInsert;       Update: Partial<SchoolInsert>       }
      profiles:              { Row: ProfileRow;           Insert: ProfileInsert;      Update: Partial<ProfileInsert>      }
      bulletins:             { Row: BulletinRow;          Insert: BulletinInsert;     Update: Partial<BulletinInsert>     }
      bulletin_assessments:  { Row: AssessmentRow;        Insert: AssessmentInsert;   Update: Partial<AssessmentInsert>   }
      attendance_sessions:   { Row: AttendanceSession;    Insert: any;                Update: any                         }
      attendance_records:    { Row: AttendanceRecord;     Insert: any;                Update: any                         }
      payments:              { Row: PaymentRow;           Insert: any;                Update: any                         }
      announcements:         { Row: AnnouncementRow;      Insert: any;                Update: any                         }
      discipline_records:    { Row: DisciplineRow;        Insert: any;                Update: any                         }
      devoirs:               { Row: DevoirRow;            Insert: any;                Update: any                         }
      student_xp:            { Row: StudentXPRow;         Insert: any;                Update: any                         }
      classes:               { Row: ClassRow;             Insert: any;                Update: any                         }
      courses:               { Row: CourseRow;            Insert: any;                Update: any                         }
      school_configs:        { Row: SchoolConfigRow;      Insert: any;                Update: any                         }
    }
    Functions: {
      auth_role:           { Returns: string }
      auth_school_id:      { Returns: string }
      is_same_school:      { Args: { p_school_id: string }; Returns: boolean }
      is_direction:        { Returns: boolean }
    }
  }
}

// ── Row Types ─────────────────────────────────────────────────────────────────

export interface SchoolRow {
  id: string; name: string; slug: string; logo_url: string | null
  address_city: string | null; address_country: string | null
  contact_email: string | null; plan: string; status: string
  active_students: number; academic_year: string
  features: Record<string, boolean>
  created_at: string; updated_at: string
}
export interface SchoolInsert extends Partial<SchoolRow> { name: string; slug: string }

export interface ProfileRow {
  id: string; school_id: string; role: string; display_name: string | null
  photo_url: string | null; phone: string | null; whatsapp: string | null
  is_active: boolean
  class_id: string | null; class_name: string | null
  level_id: string | null; level_name: string | null
  student_number: string | null; parent_email: string | null
  birth_date: string | null; birth_place: string | null; gender: string | null
  archive_status: string; archive_reason: string | null; archived_at: string | null
  academic_history: any[]; children: any[]
  subjects: string[]; employee_id: string | null
  created_at: string; updated_at: string
}
export interface ProfileInsert extends Partial<ProfileRow> { id: string; role: string }

export interface BulletinRow {
  id: string; school_id: string; student_id: string; student_name: string
  class_id: string | null; class_name: string | null
  teacher_id: string | null; teacher_name: string | null
  trimestre: 'T1' | 'T2' | 'T3'; school_year: string
  subject: string; average: number | null
  conduct: string | null; appreciation: string | null
  director_comment: string | null; rejection_reason: string | null
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'published'
  submitted_at: string | null; approved_at: string | null; published_at: string | null
  created_at: string; updated_at: string
}
export interface BulletinInsert extends Partial<BulletinRow> {
  school_id: string; student_id: string; student_name: string
  trimestre: 'T1' | 'T2' | 'T3'; subject: string
}

export interface AssessmentRow {
  id: string; bulletin_id: string; title: string
  value: number | null; max_score: number; coefficient: number
}
export interface AssessmentInsert extends Partial<AssessmentRow> { bulletin_id: string; title: string }

export interface AttendanceSession {
  id: string; school_id: string; class_id: string | null; class_name: string | null
  teacher_id: string | null; subject: string | null
  date: string; day_label: string | null; school_year: string; saved_at: string
}

export interface AttendanceRecord {
  id: string; session_id: string; student_id: string | null; student_name: string | null
  status: 'present' | 'late' | 'absent' | 'justified' | 'pending'; note: string | null
}

export interface PaymentRow {
  id: string; school_id: string; student_id: string | null; student_name: string | null
  parent_id: string | null; parent_name: string | null
  fee_label: string | null; amount: number; currency: string
  network: string | null; transaction_id: string | null
  status: 'pending' | 'success' | 'failed'; date: string | null; paid_at: string | null
  created_at: string
}

export interface AnnouncementRow {
  id: string; school_id: string; author_id: string | null; author_name: string | null
  title: string; body: string; category: string; audience: string
  read_by: string[]; opened_by: string[]; pinned: boolean; created_at: string
}

export interface DisciplineRow {
  id: string; school_id: string; student_id: string; student_name: string
  class_id: string | null; class_name: string | null
  type: 'sanction' | 'merite'; sanction: string | null; merite: string | null
  motif: string; description: string | null
  issued_by: string | null; issued_by_name: string | null
  date: string; duration_days: number | null
  parent_notified: boolean; parent_notified_at: string | null; created_at: string
}

export interface DevoirRow {
  id: string; school_id: string; class_id: string | null; teacher_id: string | null
  teacher_name: string | null; class_name: string | null; subject_name: string | null
  title: string; description: string | null; due_date: string; due_time: string | null
  trimestre: string | null; points: number; attachments: string[]; created_at: string
}

export interface StudentXPRow {
  id: string; school_id: string; student_id: string
  total_xp: number; level_num: number; streak: number; badges: string[]
  updated_at: string
}

export interface ClassRow {
  id: string; school_id: string; level_id: string | null; name: string
  level_name: string | null; academic_year: string
  main_teacher_id: string | null; main_teacher_name: string | null
  student_count: number; is_active: boolean; created_at: string; updated_at: string
}

export interface CourseRow {
  id: string; school_id: string; teacher_id: string | null; teacher_name: string | null
  subject: string | null; class_target: string | null; title: string
  content: string | null; pdf_url: string | null; is_published: boolean; view_count: number
  created_at: string; updated_at: string
}

export interface SchoolConfigRow {
  id: string; school_id: string; annee: string
  trimestres: any[]; matieres_levels: Record<string, any>; regles: any[]; updated_at: string
}
