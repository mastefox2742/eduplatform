/**
 * Carnet de Notes — Professeur
 * Saisie et consultation des notes par trimestre (T1/T2/T3)
 * Structure franco-africaine : 3 trimestres + vue annuelle
 */
import { useState, useMemo, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { useGrades } from '@/hooks/useGrades'

// ── Types ──────────────────────────────────────────────────────────────────────
type Trimestre = 'T1' | 'T2' | 'T3'
type PeriodView = Trimestre | 'Année'
type AssessmentType = 'exercise' | 'exam' | 'quiz' | 'homework'

interface GradeEntry {
  studentId: string
  value:     number | null
  comment?:  string
}

interface Assessment {
  id:        string
  title:     string
  date:      string
  maxScore:  number
  coeff:     number
  type:      AssessmentType
  trimestre: Trimestre
  grades:    GradeEntry[]
}

interface Student {
  id:     string
  name:   string
  avatar: string
}

interface ClassData {
  id:          string
  name:        string
  subject:     string
  color:       string
  students:    Student[]
  assessments: Assessment[]
}

// ── Données démo ───────────────────────────────────────────────────────────────
const CLASSES: ClassData[] = [
  {
    id: 'c1', name: '3ème B', subject: 'Mathématiques', color: '#2563eb',
    students: [
      { id: 's1', name: 'Aminata Bah',      avatar: '🧑🏿' },
      { id: 's2', name: 'Mamadou Diallo',   avatar: '👦🏾' },
      { id: 's3', name: 'Fatoumata Camara', avatar: '👧🏾' },
      { id: 's4', name: 'Ibrahima Sow',     avatar: '🧑🏾' },
      { id: 's5', name: 'Mariama Baldé',    avatar: '👧🏿' },
      { id: 's6', name: 'Oumar Kouyaté',    avatar: '👦🏿' },
    ],
    assessments: [
      // ── T1 ──
      {
        id: 'c1a1', title: 'Interro — Dérivées', date: '10/09/2025', maxScore: 20, coeff: 1,
        type: 'exercise', trimestre: 'T1',
        grades: [
          { studentId: 's1', value: 14, comment: 'Quelques erreurs de calcul' },
          { studentId: 's2', value: 19, comment: 'Excellent !' },
          { studentId: 's3', value: 11 },
          { studentId: 's4', value: 17 },
          { studentId: 's5', value: 13 },
          { studentId: 's6', value: 9 },
        ],
      },
      {
        id: 'c1a2', title: 'DS — Fonctions affines', date: '24/09/2025', maxScore: 20, coeff: 2,
        type: 'exam', trimestre: 'T1',
        grades: [
          { studentId: 's1', value: 12 },
          { studentId: 's2', value: 16 },
          { studentId: 's3', value: 9 },
          { studentId: 's4', value: 15 },
          { studentId: 's5', value: 10 },
          { studentId: 's6', value: 8 },
        ],
      },
      {
        id: 'c1a3', title: 'Quiz — Géométrie analytique', date: '08/10/2025', maxScore: 10, coeff: 1,
        type: 'quiz', trimestre: 'T1',
        grades: [
          { studentId: 's1', value: 8 },
          { studentId: 's2', value: 9 },
          { studentId: 's3', value: 6 },
          { studentId: 's4', value: null },
          { studentId: 's5', value: 7 },
          { studentId: 's6', value: 5 },
        ],
      },
      // ── T2 ──
      {
        id: 'c1b1', title: 'Interro — Statistiques', date: '12/11/2025', maxScore: 20, coeff: 1,
        type: 'exercise', trimestre: 'T2',
        grades: [
          { studentId: 's1', value: 15 },
          { studentId: 's2', value: 18 },
          { studentId: 's3', value: 12 },
          { studentId: 's4', value: 16 },
          { studentId: 's5', value: 11 },
          { studentId: 's6', value: 10 },
        ],
      },
      {
        id: 'c1b2', title: 'Examen mi-trimestre', date: '26/11/2025', maxScore: 20, coeff: 2,
        type: 'exam', trimestre: 'T2',
        grades: [
          { studentId: 's1', value: 14 },
          { studentId: 's2', value: 17 },
          { studentId: 's3', value: 10 },
          { studentId: 's4', value: 15 },
          { studentId: 's5', value: 12 },
          { studentId: 's6', value: 9 },
        ],
      },
      {
        id: 'c1b3', title: 'DS — Probabilités', date: '17/12/2025', maxScore: 20, coeff: 2,
        type: 'exam', trimestre: 'T2',
        grades: [
          { studentId: 's1', value: 13 },
          { studentId: 's2', value: 18 },
          { studentId: 's3', value: 11 },
          { studentId: 's4', value: 14 },
          { studentId: 's5', value: 13 },
          { studentId: 's6', value: null },
        ],
      },
      // ── T3 ──
      {
        id: 'c1c1', title: 'Interro — Vecteurs', date: '21/01/2026', maxScore: 20, coeff: 1,
        type: 'exercise', trimestre: 'T3',
        grades: [
          { studentId: 's1', value: 16 },
          { studentId: 's2', value: 19 },
          { studentId: 's3', value: 13 },
          { studentId: 's4', value: 17 },
          { studentId: 's5', value: null },
          { studentId: 's6', value: 11 },
        ],
      },
      {
        id: 'c1c2', title: 'DS — Synthèse', date: '11/02/2026', maxScore: 20, coeff: 3,
        type: 'exam', trimestre: 'T3',
        grades: [
          { studentId: 's1', value: 15 },
          { studentId: 's2', value: 18 },
          { studentId: 's3', value: null },
          { studentId: 's4', value: 16 },
          { studentId: 's5', value: 14 },
          { studentId: 's6', value: 10 },
        ],
      },
      {
        id: 'c1c3', title: 'Devoir maison — Révisions', date: '28/02/2026', maxScore: 20, coeff: 1,
        type: 'homework', trimestre: 'T3',
        grades: [
          { studentId: 's1', value: 17 },
          { studentId: 's2', value: 19 },
          { studentId: 's3', value: 14 },
          { studentId: 's4', value: 18 },
          { studentId: 's5', value: 15 },
          { studentId: 's6', value: 12 },
        ],
      },
    ],
  },
  {
    id: 'c2', name: '4ème A', subject: 'Mathématiques', color: '#7c3aed',
    students: [
      { id: 't1', name: 'Ousmane Dieng',    avatar: '👦🏿' },
      { id: 't2', name: 'Aissatou Barry',   avatar: '👧🏾' },
      { id: 't3', name: 'Moussa Konaté',    avatar: '🧑🏿' },
      { id: 't4', name: 'Kadiatou Fofana',  avatar: '👧🏿' },
      { id: 't5', name: 'Lamine Cissé',     avatar: '👦🏾' },
    ],
    assessments: [
      // ── T1 ──
      {
        id: 'c2a1', title: 'Interro — Fractions', date: '12/09/2025', maxScore: 20, coeff: 1,
        type: 'exercise', trimestre: 'T1',
        grades: [
          { studentId: 't1', value: 16 },
          { studentId: 't2', value: 13 },
          { studentId: 't3', value: 18 },
          { studentId: 't4', value: 11 },
          { studentId: 't5', value: 14 },
        ],
      },
      {
        id: 'c2a2', title: 'DS — Équations du 1er degré', date: '30/09/2025', maxScore: 20, coeff: 2,
        type: 'exam', trimestre: 'T1',
        grades: [
          { studentId: 't1', value: 15 },
          { studentId: 't2', value: 11 },
          { studentId: 't3', value: 17 },
          { studentId: 't4', value: 9 },
          { studentId: 't5', value: 13 },
        ],
      },
      {
        id: 'c2a3', title: 'Quiz — Puissances', date: '14/10/2025', maxScore: 10, coeff: 1,
        type: 'quiz', trimestre: 'T1',
        grades: [
          { studentId: 't1', value: 8 },
          { studentId: 't2', value: 6 },
          { studentId: 't3', value: 9 },
          { studentId: 't4', value: 5 },
          { studentId: 't5', value: null },
        ],
      },
      // ── T2 ──
      {
        id: 'c2b1', title: 'Interro — Trigonométrie', date: '18/11/2025', maxScore: 20, coeff: 1,
        type: 'exercise', trimestre: 'T2',
        grades: [
          { studentId: 't1', value: 14 },
          { studentId: 't2', value: 12 },
          { studentId: 't3', value: 16 },
          { studentId: 't4', value: 10 },
          { studentId: 't5', value: 15 },
        ],
      },
      {
        id: 'c2b2', title: 'DS — Géométrie plane', date: '03/12/2025', maxScore: 20, coeff: 2,
        type: 'exam', trimestre: 'T2',
        grades: [
          { studentId: 't1', value: 16 },
          { studentId: 't2', value: 13 },
          { studentId: 't3', value: 18 },
          { studentId: 't4', value: 11 },
          { studentId: 't5', value: null },
        ],
      },
      {
        id: 'c2b3', title: 'Devoir maison — Résolution', date: '19/12/2025', maxScore: 20, coeff: 1,
        type: 'homework', trimestre: 'T2',
        grades: [
          { studentId: 't1', value: 17 },
          { studentId: 't2', value: 14 },
          { studentId: 't3', value: 19 },
          { studentId: 't4', value: 12 },
          { studentId: 't5', value: 16 },
        ],
      },
      // ── T3 ──
      {
        id: 'c2c1', title: 'Interro — Systèmes', date: '27/01/2026', maxScore: 20, coeff: 1,
        type: 'exercise', trimestre: 'T3',
        grades: [
          { studentId: 't1', value: 15 },
          { studentId: 't2', value: 11 },
          { studentId: 't3', value: 17 },
          { studentId: 't4', value: 9 },
          { studentId: 't5', value: 14 },
        ],
      },
      {
        id: 'c2c2', title: 'DS — Bilan annuel', date: '17/02/2026', maxScore: 20, coeff: 3,
        type: 'exam', trimestre: 'T3',
        grades: [
          { studentId: 't1', value: 16 },
          { studentId: 't2', value: null },
          { studentId: 't3', value: 18 },
          { studentId: 't4', value: 10 },
          { studentId: 't5', value: 13 },
        ],
      },
    ],
  },
  {
    id: 'c3', name: '5ème C', subject: 'Mathématiques', color: '#059669',
    students: [
      { id: 'u1', name: 'Seydou Traoré',    avatar: '👦🏾' },
      { id: 'u2', name: 'Nafi Coulibaly',   avatar: '👧🏾' },
      { id: 'u3', name: 'Adama Keïta',      avatar: '🧑🏿' },
      { id: 'u4', name: 'Rokia Sylla',      avatar: '👧🏿' },
      { id: 'u5', name: 'Boubacar Sanogo',  avatar: '👦🏿' },
    ],
    assessments: [
      // ── T1 ──
      {
        id: 'c3a1', title: 'Interro — Proportionnalité', date: '09/09/2025', maxScore: 20, coeff: 1,
        type: 'exercise', trimestre: 'T1',
        grades: [
          { studentId: 'u1', value: 15 },
          { studentId: 'u2', value: 12 },
          { studentId: 'u3', value: 13 },
          { studentId: 'u4', value: 10 },
          { studentId: 'u5', value: 17 },
        ],
      },
      {
        id: 'c3a2', title: 'DS — Fractions et décimaux', date: '23/09/2025', maxScore: 20, coeff: 2,
        type: 'exam', trimestre: 'T1',
        grades: [
          { studentId: 'u1', value: 14 },
          { studentId: 'u2', value: null },
          { studentId: 'u3', value: 11 },
          { studentId: 'u4', value: 9 },
          { studentId: 'u5', value: 16 },
        ],
      },
      {
        id: 'c3a3', title: 'Quiz — Numération', date: '07/10/2025', maxScore: 10, coeff: 1,
        type: 'quiz', trimestre: 'T1',
        grades: [
          { studentId: 'u1', value: 8 },
          { studentId: 'u2', value: 7 },
          { studentId: 'u3', value: 6 },
          { studentId: 'u4', value: 5 },
          { studentId: 'u5', value: 9 },
        ],
      },
      // ── T2 ──
      {
        id: 'c3b1', title: 'Interro — Angles et triangles', date: '04/11/2025', maxScore: 20, coeff: 1,
        type: 'exercise', trimestre: 'T2',
        grades: [
          { studentId: 'u1', value: 16 },
          { studentId: 'u2', value: 13 },
          { studentId: 'u3', value: 14 },
          { studentId: 'u4', value: 11 },
          { studentId: 'u5', value: 17 },
        ],
      },
      {
        id: 'c3b2', title: 'DS — Périmètres et aires', date: '25/11/2025', maxScore: 20, coeff: 2,
        type: 'exam', trimestre: 'T2',
        grades: [
          { studentId: 'u1', value: 15 },
          { studentId: 'u2', value: 11 },
          { studentId: 'u3', value: null },
          { studentId: 'u4', value: 8 },
          { studentId: 'u5', value: 18 },
        ],
      },
      {
        id: 'c3b3', title: 'Devoir maison — Volumes', date: '16/12/2025', maxScore: 20, coeff: 1,
        type: 'homework', trimestre: 'T2',
        grades: [
          { studentId: 'u1', value: 17 },
          { studentId: 'u2', value: 14 },
          { studentId: 'u3', value: 13 },
          { studentId: 'u4', value: 10 },
          { studentId: 'u5', value: 18 },
        ],
      },
      // ── T3 ──
      {
        id: 'c3c1', title: 'Interro — Statistiques', date: '20/01/2026', maxScore: 20, coeff: 1,
        type: 'exercise', trimestre: 'T3',
        grades: [
          { studentId: 'u1', value: 16 },
          { studentId: 'u2', value: 14 },
          { studentId: 'u3', value: 12 },
          { studentId: 'u4', value: null },
          { studentId: 'u5', value: 17 },
        ],
      },
      {
        id: 'c3c2', title: 'DS — Révisions générales', date: '10/02/2026', maxScore: 20, coeff: 3,
        type: 'exam', trimestre: 'T3',
        grades: [
          { studentId: 'u1', value: 15 },
          { studentId: 'u2', value: 13 },
          { studentId: 'u3', value: 11 },
          { studentId: 'u4', value: 9 },
          { studentId: 'u5', value: 17 },
        ],
      },
    ],
  },
]

// ── Fonctions de calcul ────────────────────────────────────────────────────────

/** Moyenne d'un élève pour un trimestre donné (pondérée par coeff, ramenée sur 20) */
function trimAverage(student: Student, assessments: Assessment[], tri: Trimestre): number | null {
  const triAssessments = assessments.filter(a => a.trimestre === tri)
  const graded = triAssessments.filter(a => {
    const g = a.grades.find(g => g.studentId === student.id)
    return g?.value !== null && g?.value !== undefined
  })
  if (graded.length === 0) return null
  const sumWeighted = graded.reduce((s, a) => {
    const g = a.grades.find(g => g.studentId === student.id)!
    return s + (g.value! / a.maxScore) * 20 * a.coeff
  }, 0)
  const sumCoeff = graded.reduce((s, a) => s + a.coeff, 0)
  return sumCoeff > 0 ? Math.round((sumWeighted / sumCoeff) * 10) / 10 : null
}

/** Moyenne annuelle = moyenne arithmétique des moyennes trimestrielles non nulles */
function yearAverage(student: Student, assessments: Assessment[]): number | null {
  const trims: Trimestre[] = ['T1', 'T2', 'T3']
  const avgs = trims.map(t => trimAverage(student, assessments, t)).filter((v): v is number => v !== null)
  if (avgs.length === 0) return null
  return Math.round((avgs.reduce((s, v) => s + v, 0) / avgs.length) * 10) / 10
}

/** Évolution entre deux trimestres */
function trend(prev: number | null, curr: number | null): 'up' | 'down' | 'same' | null {
  if (prev === null || curr === null) return null
  const diff = curr - prev
  if (diff > 0.5)  return 'up'
  if (diff < -0.5) return 'down'
  return 'same'
}

/** Moyenne de classe sur un trimestre */
function classTrimAverage(cls: ClassData, tri: Trimestre): number | null {
  const avgs = cls.students
    .map(s => trimAverage(s, cls.assessments, tri))
    .filter((v): v is number => v !== null)
  if (avgs.length === 0) return null
  return Math.round((avgs.reduce((s, v) => s + v, 0) / avgs.length) * 10) / 10
}

/** Rang d'un élève dans la classe (basé sur moyenne annuelle) */
function studentRank(student: Student, cls: ClassData): number {
  const myAvg = yearAverage(student, cls.assessments) ?? -1
  return cls.students.filter(s => {
    const a = yearAverage(s, cls.assessments) ?? -1
    return a > myAvg
  }).length + 1
}

// ── Helpers visuels ────────────────────────────────────────────────────────────
function gradeColor(v: number, max: number): string {
  const pct = v / max
  if (pct >= 0.8) return colors.success
  if (pct >= 0.6) return colors.warning
  return colors.danger
}

function avgColor(avg: number | null): string {
  if (avg === null) return colors.gray[400]
  if (avg >= 14) return colors.success
  if (avg >= 10) return colors.warning
  return colors.danger
}

const TYPE_ICON: Record<AssessmentType, keyof typeof Ionicons.glyphMap> = {
  exercise: 'pencil-outline',
  exam:     'document-text-outline',
  quiz:     'help-circle-outline',
  homework: 'home-outline',
}
const TYPE_COLOR: Record<AssessmentType, string> = {
  exercise: '#2563eb',
  exam:     '#dc2626',
  quiz:     '#d97706',
  homework: '#059669',
}
const TYPE_LABEL: Record<AssessmentType, string> = {
  exercise: 'Exercice',
  exam:     'Examen',
  quiz:     'Quiz',
  homework: 'Devoir maison',
}
const TRIM_COLORS: Record<Trimestre, string> = {
  T1: '#2563eb',
  T2: '#7c3aed',
  T3: '#059669',
}

// ── Modal saisie de note ───────────────────────────────────────────────────────
interface GradeModalProps {
  student:    Student
  assessment: Assessment
  entry:      GradeEntry
  onClose:    () => void
  onSave:     (value: number | null, comment: string) => void
}

function GradeModal({ student, assessment, entry, onClose, onSave }: GradeModalProps) {
  const [val,     setVal]     = useState(entry.value?.toString() ?? '')
  const [comment, setComment] = useState(entry.comment ?? '')

  const handleSave = () => {
    const n = val === '' ? null : Number(val)
    if (n !== null && (isNaN(n) || n < 0 || n > assessment.maxScore)) {
      Alert.alert('Note invalide', `Entrez une note entre 0 et ${assessment.maxScore}.`)
      return
    }
    onSave(n, comment)
    onClose()
  }

  const handleAbsent = () => {
    onSave(null, 'Absent')
    onClose()
  }

  const scaled = val !== '' && !isNaN(Number(val))
    ? Math.round((Number(val) / assessment.maxScore) * 200) / 10
    : null

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>

        {/* Header modal */}
        <View style={mStyles.header}>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.gray[600]} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={mStyles.title}>Saisir une note</Text>
            <Text style={mStyles.sub} numberOfLines={1}>
              {student.avatar} {student.name} · {assessment.title}
            </Text>
          </View>
          <View style={[mStyles.trimBadge, { backgroundColor: TRIM_COLORS[assessment.trimestre] }]}>
            <Text style={mStyles.trimBadgeText}>{assessment.trimestre}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

          {/* Champ note */}
          <View style={mStyles.gradeSection}>
            <Text style={mStyles.gradeLabel}>Note sur {assessment.maxScore}</Text>
            <View style={mStyles.gradeInputRow}>
              <TextInput
                style={mStyles.gradeInput}
                value={val}
                onChangeText={setVal}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={colors.gray[300]}
                maxLength={5}
              />
              <Text style={mStyles.gradeSuffix}>/{assessment.maxScore}</Text>
            </View>
            {scaled !== null && (
              <Text style={[mStyles.gradePct, { color: gradeColor(Number(val), assessment.maxScore) }]}>
                = {Math.round((Number(val) / assessment.maxScore) * 100)}% · /20 : {scaled}
              </Text>
            )}
            <Text style={mStyles.gradeCoeff}>
              Coeff. {assessment.coeff} · {TYPE_LABEL[assessment.type]} · {assessment.date}
            </Text>
          </View>

          {/* Commentaire */}
          <View>
            <Text style={mStyles.gradeLabel}>Commentaire (optionnel)</Text>
            <TextInput
              style={mStyles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Ex : Bonne compréhension, retravailler les signes..."
              placeholderTextColor={colors.gray[400]}
              multiline
              maxLength={300}
            />
          </View>

          {/* Boutons d'action */}
          <View style={mStyles.actionRow}>
            <TouchableOpacity style={mStyles.absentBtn} onPress={handleAbsent}>
              <Ionicons name="person-remove-outline" size={16} color={colors.warning} />
              <Text style={mStyles.absentBtnText}>Absent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}>
              <Text style={mStyles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mStyles.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
              <Text style={mStyles.saveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Composant TrendIcon ────────────────────────────────────────────────────────
function TrendIcon({ direction }: { direction: 'up' | 'down' | 'same' | null }) {
  if (direction === null) return null
  if (direction === 'up')   return <Ionicons name="trending-up"   size={14} color={colors.success} />
  if (direction === 'down') return <Ionicons name="trending-down" size={14} color={colors.danger} />
  return <Ionicons name="remove" size={14} color={colors.gray[400]} />
}

// ── Écran principal ────────────────────────────────────────────────────────────
export default function TeacherGradesScreen() {
  // ── Firebase ──────────────────────────────────────────────────────────────
  const { user, profile } = useAuth()
  const schoolId  = profile?.schoolId ?? 'demo'
  const teacherId = user?.uid ?? ''

  // classes : démarre sur CLASSES (données démo), puis Firebase écrase les notes réelles
  const { classes, setClasses, persistGrade } = useGrades(schoolId, teacherId)

  const [selClassIdx, setSelClassIdx] = useState(0)
  const [period,      setPeriod]      = useState<PeriodView>('T1')
  const [view,        setView]        = useState<'list' | 'grid'>('list')
  const [editTarget,  setEditTarget]  = useState<{
    student: Student; assessment: Assessment; entry: GradeEntry
  } | null>(null)

  const cls = classes[selClassIdx]

  // Évaluations du trimestre actif (sauf en vue Année)
  const activeAssessments = useMemo(() => {
    if (period === 'Année') return cls.assessments
    return cls.assessments.filter(a => a.trimestre === period)
  }, [cls, period])

  // Stats du trimestre
  const stats = useMemo(() => {
    if (period === 'Année') {
      const classAvg = (() => {
        const avgs = cls.students.map(s => yearAverage(s, cls.assessments)).filter((v): v is number => v !== null)
        if (avgs.length === 0) return null
        return Math.round((avgs.reduce((s, v) => s + v, 0) / avgs.length) * 10) / 10
      })()
      return {
        avg:        classAvg,
        evalCount:  cls.assessments.length,
        belowTen:   cls.students.filter(s => { const a = yearAverage(s, cls.assessments); return a !== null && a < 10 }).length,
        notGraded:  cls.assessments.reduce((sum, a) => sum + a.grades.filter(g => g.value === null).length, 0),
      }
    }
    const tri = period as Trimestre
    return {
      avg:       classTrimAverage(cls, tri),
      evalCount: activeAssessments.length,
      belowTen:  cls.students.filter(s => { const a = trimAverage(s, cls.assessments, tri); return a !== null && a < 10 }).length,
      notGraded: activeAssessments.reduce((sum, a) => sum + a.grades.filter(g => g.value === null).length, 0),
    }
  }, [cls, period, activeAssessments])

  const handleSaveGrade = (asmId: string, studentId: string, value: number | null, comment: string) => {
    // 1. Mise à jour locale instantanée (UX optimiste)
    setClasses(prev => prev.map((c, i) => {
      if (i !== selClassIdx) return c
      return {
        ...c,
        assessments: c.assessments.map(a => {
          if (a.id !== asmId) return a
          const existingEntry = a.grades.find(g => g.studentId === studentId)
          const newGrades = existingEntry
            ? a.grades.map(g => g.studentId === studentId ? { ...g, value, comment } : g)
            : [...a.grades, { studentId, value, comment }]
          return { ...a, grades: newGrades }
        }),
      }
    }))

    // 2. Persistance Firebase en arrière-plan (fire-and-forget)
    persistGrade(asmId, studentId, value, comment)
  }

  // ── Rendu vue LISTE (par élève) ──────────────────────────────────────────────
  const renderListView = () => {
    if (period === 'Année') return renderYearView()
    const tri = period as Trimestre
    const prevTri: Trimestre | null = tri === 'T2' ? 'T1' : tri === 'T3' ? 'T2' : null

    return cls.students.map(student => {
      const avg     = trimAverage(student, cls.assessments, tri)
      const prevAvg = prevTri ? trimAverage(student, cls.assessments, prevTri) : null
      const trendDir = trend(prevAvg, avg)

      return (
        <View key={student.id} style={styles.studentCard}>
          {/* En-tête élève */}
          <View style={styles.studentRow}>
            <View style={[styles.avatar, { backgroundColor: cls.color + '18' }]}>
              <Text style={{ fontSize: 20 }}>{student.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentMeta}>{cls.name} · {period}</Text>
            </View>
            <View style={styles.studentAvgBlock}>
              {avg !== null ? (
                <>
                  <Text style={[styles.studentAvgVal, { color: avgColor(avg) }]}>{avg.toFixed(1)}</Text>
                  <Text style={[styles.studentAvgSub, { color: avgColor(avg) }]}>/20</Text>
                  <View style={styles.trendRow}>
                    <TrendIcon direction={trendDir} />
                    {prevAvg !== null && (
                      <Text style={[styles.prevAvgText, { color: trendDir === 'up' ? colors.success : trendDir === 'down' ? colors.danger : colors.gray[400] }]}>
                        {prevAvg.toFixed(1)}
                      </Text>
                    )}
                  </View>
                </>
              ) : (
                <Text style={styles.noAvgText}>—</Text>
              )}
            </View>
          </View>

          {/* Pastilles de notes */}
          <View style={styles.gradesRow}>
            {activeAssessments.map(assessment => {
              const entry = assessment.grades.find(g => g.studentId === student.id)
                ?? { studentId: student.id, value: null }
              const hasGrade = entry.value !== null

              return (
                <TouchableOpacity
                  key={assessment.id}
                  style={[
                    styles.gradeCell,
                    hasGrade
                      ? { backgroundColor: gradeColor(entry.value!, assessment.maxScore) + '18',
                          borderColor:    gradeColor(entry.value!, assessment.maxScore) + '50' }
                      : { backgroundColor: colors.gray[50], borderColor: colors.gray[200] },
                  ]}
                  onPress={() => setEditTarget({ student, assessment, entry })}
                >
                  <Ionicons
                    name={TYPE_ICON[assessment.type]}
                    size={10}
                    color={hasGrade ? gradeColor(entry.value!, assessment.maxScore) : colors.gray[300]}
                  />
                  <Text style={[
                    styles.gradeCellVal,
                    { color: hasGrade ? gradeColor(entry.value!, assessment.maxScore) : colors.gray[300] },
                  ]}>
                    {hasGrade ? `${entry.value}/${assessment.maxScore}` : '+'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    })
  }

  // ── Rendu vue GRILLE (par évaluation) ────────────────────────────────────────
  const renderGridView = () => {
    const evals = period === 'Année' ? cls.assessments : activeAssessments
    return evals.map(assessment => {
      const graded = assessment.grades.filter(g => g.value !== null).length
      const gradedEntries = assessment.grades.filter(g => g.value !== null)
      const asmAvg = gradedEntries.length > 0
        ? Math.round(
            gradedEntries.reduce((s, g) => s + (g.value! / assessment.maxScore) * 20, 0)
            / gradedEntries.length * 10
          ) / 10
        : null

      return (
        <View key={assessment.id} style={styles.assessmentCard}>
          {/* En-tête éval */}
          <View style={[styles.asmHeader, { borderLeftColor: TYPE_COLOR[assessment.type] }]}>
            <View style={[styles.asmIcon, { backgroundColor: TYPE_COLOR[assessment.type] + '18' }]}>
              <Ionicons name={TYPE_ICON[assessment.type]} size={16} color={TYPE_COLOR[assessment.type]} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.asmTitleRow}>
                <Text style={styles.asmTitle} numberOfLines={1}>{assessment.title}</Text>
                <View style={[styles.trimPill, { backgroundColor: TRIM_COLORS[assessment.trimestre] + '20' }]}>
                  <Text style={[styles.trimPillText, { color: TRIM_COLORS[assessment.trimestre] }]}>
                    {assessment.trimestre}
                  </Text>
                </View>
              </View>
              <Text style={styles.asmMeta}>
                {assessment.date} · Coeff. {assessment.coeff} · /{assessment.maxScore}
              </Text>
            </View>
            {asmAvg !== null && (
              <View style={styles.asmAvgBadge}>
                <Text style={styles.asmAvgText}>{asmAvg.toFixed(1)}/20</Text>
              </View>
            )}
          </View>

          {/* Notes des élèves */}
          {cls.students.map(student => {
            const entry = assessment.grades.find(g => g.studentId === student.id)
              ?? { studentId: student.id, value: null }
            const hasGrade = entry.value !== null

            return (
              <TouchableOpacity
                key={student.id}
                style={styles.asmStudentRow}
                onPress={() => setEditTarget({ student, assessment, entry })}
              >
                <Text style={{ fontSize: 16, width: 24 }}>{student.avatar}</Text>
                <Text style={styles.asmStudentName} numberOfLines={1}>{student.name}</Text>
                <View style={[
                  styles.asmGradeBox,
                  hasGrade
                    ? { backgroundColor: gradeColor(entry.value!, assessment.maxScore) + '18' }
                    : { backgroundColor: colors.gray[50] },
                ]}>
                  <Text style={[
                    styles.asmGradeText,
                    { color: hasGrade ? gradeColor(entry.value!, assessment.maxScore) : colors.gray[300] },
                  ]}>
                    {hasGrade ? `${entry.value}/${assessment.maxScore}` : '—'}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={14} color={colors.gray[300]} />
              </TouchableOpacity>
            )
          })}

          <Text style={styles.asmProgress}>
            {graded}/{cls.students.length} noté{graded > 1 ? 's' : ''}
          </Text>
        </View>
      )
    })
  }

  // ── Rendu vue ANNÉE (tableau récap) ──────────────────────────────────────────
  const renderYearView = () => (
    <View style={styles.yearCard}>
      {/* Légende colonnes */}
      <View style={styles.yearHeaderRow}>
        <Text style={[styles.yearHeaderCell, { flex: 2 }]}>Élève</Text>
        {(['T1', 'T2', 'T3'] as Trimestre[]).map(t => (
          <Text key={t} style={[styles.yearHeaderCell, { color: TRIM_COLORS[t] }]}>{t}</Text>
        ))}
        <Text style={[styles.yearHeaderCell, { color: colors.gray[700] }]}>Annl.</Text>
        <Text style={styles.yearHeaderCell}>Rang</Text>
      </View>

      {/* Lignes élèves */}
      {cls.students.map((student, idx) => {
        const t1 = trimAverage(student, cls.assessments, 'T1')
        const t2 = trimAverage(student, cls.assessments, 'T2')
        const t3 = trimAverage(student, cls.assessments, 'T3')
        const yr = yearAverage(student, cls.assessments)
        const rank = studentRank(student, cls)
        const overallTrend = trend(t1, t3)

        return (
          <View
            key={student.id}
            style={[styles.yearRow, idx % 2 === 0 && { backgroundColor: colors.gray[50] }]}
          >
            <View style={[styles.yearNameCell, { flex: 2 }]}>
              <Text style={{ fontSize: 14 }}>{student.avatar}</Text>
              <Text style={styles.yearStudentName} numberOfLines={1}>{student.name.split(' ')[0]}</Text>
              <TrendIcon direction={overallTrend} />
            </View>
            {[t1, t2, t3].map((v, i) => (
              <Text
                key={i}
                style={[
                  styles.yearCell,
                  { color: avgColor(v), fontWeight: fontWeight.semibold },
                ]}
              >
                {v !== null ? v.toFixed(1) : '—'}
              </Text>
            ))}
            <Text style={[styles.yearCell, { color: avgColor(yr), fontWeight: fontWeight.bold }]}>
              {yr !== null ? yr.toFixed(1) : '—'}
            </Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{rank}e</Text>
            </View>
          </View>
        )
      })}
    </View>
  )

  // ── Rendu JSX ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Carnet de Notes</Text>
          <Text style={styles.headerSub}>{cls.name} · {cls.subject}</Text>
        </View>
        {period !== 'Année' && (
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setView(v => v === 'list' ? 'grid' : 'list')}
          >
            <Ionicons
              name={view === 'list' ? 'grid-outline' : 'list-outline'}
              size={18} color={colors.white}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Sélecteur de trimestre ── */}
      <View style={styles.periodBar}>
        {(['T1', 'T2', 'T3', 'Année'] as PeriodView[]).map(p => {
          const isActive = period === p
          const bgColor  = isActive
            ? (p === 'Année' ? colors.gray[800] : TRIM_COLORS[p as Trimestre])
            : 'transparent'
          return (
            <TouchableOpacity
              key={p}
              style={[styles.periodPill, { backgroundColor: bgColor }]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodPillText, { color: isActive ? colors.white : colors.gray[500] }]}>
                {p}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ── Sélecteur de classe ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.classBar}
        contentContainerStyle={styles.classBarContent}
      >
        {classes.map((c, i) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.classTab, i === selClassIdx && { backgroundColor: c.color }]}
            onPress={() => setSelClassIdx(i)}
          >
            <Text style={[styles.classTabText, i === selClassIdx && { color: colors.white }]}>
              {c.name}
            </Text>
            <Text style={[styles.classTabSub, i === selClassIdx && { color: 'rgba(255,255,255,0.75)' }]}>
              {c.students.length} élèves
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Stats trimestre ── */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: avgColor(stats.avg) }]}>
            {stats.avg !== null ? stats.avg.toFixed(1) : '—'}
          </Text>
          <Text style={styles.statLabel}>Moyenne /20</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: colors.primary }]}>{stats.evalCount}</Text>
          <Text style={styles.statLabel}>Évaluations</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: stats.belowTen > 0 ? colors.danger : colors.success }]}>
            {stats.belowTen}
          </Text>
          <Text style={styles.statLabel}>En dessous 10</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: stats.notGraded > 0 ? colors.warning : colors.gray[400] }]}>
            {stats.notGraded}
          </Text>
          <Text style={styles.statLabel}>Non notés</Text>
        </View>
      </View>

      {/* ── Toggle liste / grille (sauf Année) ── */}
      {period !== 'Année' && (
        <View style={styles.viewToggleBar}>
          <TouchableOpacity
            style={[styles.viewTab, view === 'list' && styles.viewTabActive]}
            onPress={() => setView('list')}
          >
            <Ionicons name="list-outline" size={15} color={view === 'list' ? colors.primary : colors.gray[500]} />
            <Text style={[styles.viewTabText, view === 'list' && { color: colors.primary }]}>Par élève</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewTab, view === 'grid' && styles.viewTabActive]}
            onPress={() => setView('grid')}
          >
            <Ionicons name="grid-outline" size={15} color={view === 'grid' ? colors.primary : colors.gray[500]} />
            <Text style={[styles.viewTabText, view === 'grid' && { color: colors.primary }]}>Par éval.</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Contenu principal ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {period === 'Année'
          ? renderYearView()
          : view === 'list'
            ? renderListView()
            : renderGridView()
        }
      </ScrollView>

      {/* ── Modal saisie ── */}
      {editTarget && (
        <GradeModal
          student={editTarget.student}
          assessment={editTarget.assessment}
          entry={editTarget.entry}
          onClose={() => setEditTarget(null)}
          onSave={(value, comment) =>
            handleSaveGrade(editTarget.assessment.id, editTarget.student.id, value, comment)
          }
        />
      )}
    </SafeAreaView>
  )
}

// ── StyleSheet principal ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md, paddingBottom: spacing.lg,
  },
  headerTitle: { fontSize: fontSize.xl,  fontWeight: fontWeight.bold, color: colors.white },
  headerSub:   { fontSize: fontSize.xs,  color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  viewToggle:  {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Barre de périodes
  periodBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  periodPill: {
    flex: 1, paddingVertical: 7, borderRadius: radius.full,
    alignItems: 'center',
  },
  periodPillText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  // Sélecteur de classe
  classBar:        { maxHeight: 72, backgroundColor: colors.white },
  classBarContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  classTab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.lg, backgroundColor: colors.gray[100],
    minWidth: 80, alignItems: 'center',
  },
  classTabText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[700] },
  classTabSub:  { fontSize: 10, color: colors.gray[400], marginTop: 1 },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stat:        { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statVal:     { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  statLabel:   { fontSize: 9, color: colors.gray[500], marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.gray[100] },

  // Toggle liste/grille
  viewToggleBar: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  viewTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: spacing.sm,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  viewTabActive:  { borderBottomColor: colors.primary },
  viewTabText:    { fontSize: fontSize.sm, color: colors.gray[500], fontWeight: fontWeight.medium },

  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: 48 },

  // ── Vue liste (par élève) ──
  studentCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, gap: spacing.md, ...shadow.sm,
  },
  studentRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar:        { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  studentName:   { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  studentMeta:   { fontSize: fontSize.xs, color: colors.gray[500] },
  studentAvgBlock: { alignItems: 'flex-end' },
  studentAvgVal:   { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, lineHeight: 28 },
  studentAvgSub:   { fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginTop: -2 },
  trendRow:        { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  prevAvgText:     { fontSize: 10, fontWeight: fontWeight.medium },
  noAvgText:       { fontSize: fontSize.xl, color: colors.gray[300], fontWeight: fontWeight.bold },

  gradesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gradeCell: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1, minWidth: 62,
  },
  gradeCellVal: { fontSize: 11, fontWeight: fontWeight.bold },

  // ── Vue grille (par évaluation) ──
  assessmentCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    overflow: 'hidden', ...shadow.sm,
  },
  asmHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderLeftWidth: 4,
    borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  asmTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  asmIcon:       { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  asmTitle:      { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  asmMeta:       { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  asmAvgBadge:   { backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  asmAvgText:    { fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary },
  trimPill:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  trimPillText:  { fontSize: 10, fontWeight: fontWeight.bold },

  asmStudentRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.gray[50],
  },
  asmStudentName: { flex: 1, fontSize: fontSize.sm, color: colors.gray[800], fontWeight: fontWeight.medium },
  asmGradeBox:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, minWidth: 52, alignItems: 'center' },
  asmGradeText:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  asmProgress:    { padding: spacing.sm, fontSize: fontSize.xs, color: colors.gray[400], textAlign: 'right', paddingRight: spacing.md },

  // ── Vue Année ──
  yearCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    overflow: 'hidden', ...shadow.sm,
  },
  yearHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.gray[50],
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  yearHeaderCell: {
    flex: 1, fontSize: 10, fontWeight: fontWeight.bold,
    color: colors.gray[500], textAlign: 'center',
  },
  yearRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: colors.gray[50],
  },
  yearNameCell:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  yearStudentName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[800] },
  yearCell: {
    flex: 1, textAlign: 'center', fontSize: fontSize.sm,
  },
  rankBadge: {
    flex: 1, alignItems: 'center',
  },
  rankText: {
    fontSize: 11, fontWeight: fontWeight.bold,
    color: colors.gray[600],
    backgroundColor: colors.gray[100],
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.full,
  },
})

// ── StyleSheet modal ───────────────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  closeBtn:      { padding: spacing.xs },
  title:         { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  sub:           { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  trimBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  trimBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.white },

  gradeSection: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center', gap: spacing.sm, ...shadow.sm,
  },
  gradeLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[700], alignSelf: 'flex-start' },
  gradeInputRow:{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gradeInput: {
    fontSize: 48, fontWeight: fontWeight.bold, color: colors.primary,
    width: 110, textAlign: 'center',
    borderBottomWidth: 3, borderBottomColor: colors.primary + '40',
    paddingVertical: 4,
  },
  gradeSuffix: { fontSize: fontSize.xl, color: colors.gray[400] },
  gradePct:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  gradeCoeff:  { fontSize: fontSize.xs, color: colors.gray[400] },

  commentInput: {
    backgroundColor: colors.gray[50], borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.sm, color: colors.gray[800],
    borderWidth: 1, borderColor: colors.border,
    minHeight: 100, textAlignVertical: 'top',
  },

  actionRow:      { flexDirection: 'row', gap: spacing.sm },
  absentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: spacing.md,
    borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: colors.warning + '60',
    backgroundColor: colors.warning + '10',
  },
  absentBtnText:  { color: colors.warning, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cancelBtnText:  { color: colors.gray[600], fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  saveBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: spacing.md,
    borderRadius: radius.lg, backgroundColor: colors.success,
  },
  saveBtnText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
})
