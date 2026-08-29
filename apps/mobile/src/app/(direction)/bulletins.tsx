/**
 * Bulletins — Validation des bulletins scolaires côté Direction
 * Trimestre en cours : T2 (Janv–Mars 2026)
 */
import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { useBulletins, type FSBulletin } from '@/hooks/useBulletins'
import { validateBulletin, rejectBulletin, publishBulletin } from '@/services/firestore'

// ─── Types ────────────────────────────────────────────────────────────────────

type BulletinStatus = 'submitted' | 'approved' | 'rejected' | 'published'
type Trimestre      = 'T1' | 'T2' | 'T3'

interface SubjectGrade {
  subject:     string
  grade:       number
  coefficient: number
  teacher:     string
}

interface StudentBulletin {
  id:               string
  name:             string
  avatar:           string
  rank:             number
  totalStudents:    number
  average:          number
  mention:          string
  teacherComment:   string
  directionComment: string
  status:           BulletinStatus
  submittedAt:      string
  grades:           SubjectGrade[]
}

interface ClassData {
  id:       string
  name:     string
  students: StudentBulletin[]
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const CLASSES: ClassData[] = [
  {
    id: 'c1',
    name: '3ème B',
    students: [
      {
        id: 's1', name: 'MVONDO Alex', avatar: 'MA', rank: 1, totalStudents: 32,
        average: 15.8, mention: 'Bien',
        teacherComment: 'Excellent trimestre. Élève très sérieux, participatif et rigoureux dans son travail. Doit maintenir cet effort.',
        directionComment: '',
        status: 'submitted', submittedAt: '12 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 16.5, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 14.0, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 17.0, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 15.5, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 14.5, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 16.0, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
      {
        id: 's2', name: 'OBAME Sarah', avatar: 'OS', rank: 2, totalStudents: 32,
        average: 14.2, mention: 'Assez bien',
        teacherComment: "Bon trimestre dans l'ensemble. Quelques difficultés en mathématiques mais un effort notable depuis janvier. Encouragements.",
        directionComment: '',
        status: 'submitted', submittedAt: '12 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 11.5, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 15.5, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 16.0, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 14.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 15.0, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 13.5, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
      {
        id: 's3', name: 'NTOUTOUME Boris', avatar: 'NB', rank: 3, totalStudents: 32,
        average: 12.9, mention: 'Assez bien',
        teacherComment: 'Résultats satisfaisants. L\'élève a fourni des efforts réguliers. Peut encore progresser en expression écrite.',
        directionComment: '',
        status: 'submitted', submittedAt: '13 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 13.0, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 12.0, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 13.5, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 13.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 12.5, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 13.5, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
      {
        id: 's4', name: 'ENGONE Laurence', avatar: 'EL', rank: 4, totalStudents: 32,
        average: 11.4, mention: 'Passable',
        teacherComment: 'Trimestre difficile. Manque d\'assiduité et de concentration. Des efforts sont nécessaires pour le prochain trimestre.',
        directionComment: '',
        status: 'submitted', submittedAt: '13 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 10.0, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 11.5, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 12.5, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 11.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 12.0, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 11.0, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
      {
        id: 's5', name: 'ATEGHE Miriam', avatar: 'AM', rank: 5, totalStudents: 32,
        average: 10.1, mention: 'Passable',
        teacherComment: 'Résultats justes. L\'élève doit s\'investir davantage, surtout en sciences. Courage pour T3.',
        directionComment: '',
        status: 'submitted', submittedAt: '14 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 9.5,  coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 11.0, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 10.5, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 10.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 10.5, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 9.0,  coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
    ],
  },
  {
    id: 'c2',
    name: '4ème A',
    students: [
      {
        id: 's6', name: 'BIYOGO Emma', avatar: 'BE', rank: 1, totalStudents: 28,
        average: 16.3, mention: 'Bien',
        teacherComment: 'Félicitations. Élève brillante, toujours au-dessus du lot. Leadership naturel en classe. Continue sur cette voie.',
        directionComment: 'Très bon dossier. Candidature au tableau d\'honneur retenue.',
        status: 'approved', submittedAt: '10 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 18.0, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 15.0, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 16.5, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 16.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 15.5, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 17.0, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
      {
        id: 's7', name: 'MBOUMBA Franck', avatar: 'MF', rank: 2, totalStudents: 28,
        average: 13.7, mention: 'Assez bien',
        teacherComment: 'Bon niveau général. Élève régulier et appliqué. Quelques lacunes en anglais à combler.',
        directionComment: 'Résultats satisfaisants. Encouragé à persévérer.',
        status: 'approved', submittedAt: '10 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 14.5, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 13.5, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 11.0, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 14.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 14.5, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 14.0, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
      {
        id: 's8', name: 'NZAMBA Cédric', avatar: 'NC', rank: 3, totalStudents: 28,
        average: 12.1, mention: 'Assez bien',
        teacherComment: 'Résultats en légère progression. Bien dans l\'ensemble mais doit travailler la régularité.',
        directionComment: '',
        status: 'submitted', submittedAt: '11 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 12.0, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 12.5, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 11.5, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 12.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 12.5, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 12.0, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
      {
        id: 's9', name: 'BEKALE Judith', avatar: 'BJ', rank: 4, totalStudents: 28,
        average: 11.0, mention: 'Passable',
        teacherComment: 'Trimestre moyen. Peut mieux faire. Attention aux absences répétées qui pénalisent les résultats.',
        directionComment: '',
        status: 'submitted', submittedAt: '11 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 10.5, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 11.0, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 11.5, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 11.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 11.5, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 10.0, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
    ],
  },
  {
    id: 'c3',
    name: '5ème C',
    students: [
      {
        id: 's10', name: 'MEYE Charlène', avatar: 'MC', rank: 1, totalStudents: 30,
        average: 17.1, mention: 'Très bien',
        teacherComment: 'Extraordinaire trimestre. Première de classe méritante. Très grande rigueur et autonomie exemplaire.',
        directionComment: 'Félicitations de la direction. Tableau d\'honneur. À encourager pour les olympiades.',
        status: 'published', submittedAt: '8 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 19.0, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 16.0, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 17.5, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 17.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 16.5, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 18.0, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
      {
        id: 's11', name: 'OVONO Thierry', avatar: 'OT', rank: 2, totalStudents: 30,
        average: 14.8, mention: 'Bien',
        teacherComment: 'Très bon élève, investi et curieux. Quelques marges de progression en rédaction française.',
        directionComment: 'Bon dossier. Encouragements de la direction.',
        status: 'published', submittedAt: '8 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 15.5, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 13.5, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 15.0, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 15.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 15.5, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 15.0, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
      {
        id: 's12', name: 'EBOUMI Grace', avatar: 'EG', rank: 3, totalStudents: 30,
        average: 13.3, mention: 'Assez bien',
        teacherComment: 'Bonne progression ce trimestre. Élève sérieuse qui mérite d\'être encouragée.',
        directionComment: 'Résultats en hausse. Bravo pour les efforts.',
        status: 'published', submittedAt: '9 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 13.0, coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 14.0, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 13.5, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 13.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 13.5, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 12.5, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
      {
        id: 's13', name: 'NDONG Patrick', avatar: 'NP', rank: 4, totalStudents: 30,
        average: 11.7, mention: 'Passable',
        teacherComment: 'Résultats passables. Des lacunes importantes persistent en mathématiques. Soutien recommandé.',
        directionComment: 'Suivi individualisé prévu. Parents convoqués.',
        status: 'published', submittedAt: '9 mars 2026',
        grades: [
          { subject: 'Mathématiques', grade: 9.5,  coefficient: 4, teacher: 'NGUEMA Pierre' },
          { subject: 'Français',      grade: 12.5, coefficient: 4, teacher: 'ONDO Claire'   },
          { subject: 'Anglais',       grade: 12.0, coefficient: 3, teacher: 'ABENA Paul'     },
          { subject: 'SVT',           grade: 12.0, coefficient: 2, teacher: 'MINKUE Anne'    },
          { subject: 'Histoire-Géo',  grade: 13.0, coefficient: 3, teacher: 'ESSONO Marc'    },
          { subject: 'Physique',      grade: 11.5, coefficient: 3, teacher: 'BIBANG Rose'    },
        ],
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MENTION_COLORS: Record<string, string> = {
  'Très bien':   colors.success,
  'Bien':        colors.primary,
  'Assez bien':  colors.warning,
  'Passable':    colors.gray[500],
  'Insuffisant': colors.danger,
}

const STATUS_CONFIG: Record<BulletinStatus, { label: string; color: string; bg: string; icon: string }> = {
  submitted: { label: 'En attente', color: colors.warning,   bg: '#fef3c7', icon: 'time-outline' },
  approved:  { label: 'Approuvé',   color: colors.primary,   bg: '#dbeafe', icon: 'checkmark-circle-outline' },
  rejected:  { label: 'Rejeté',     color: colors.danger,    bg: '#fee2e2', icon: 'close-circle-outline' },
  published: { label: 'Publié',     color: colors.success,   bg: '#dcfce7', icon: 'cloud-done-outline' },
}

const REJECT_SUGGESTIONS = [
  'Appréciation trop courte',
  'Appréciation trop générique',
  'Erreur dans les notes',
  'Commentaire inapproprié',
  'Données manquantes',
]

// ── Firebase helpers ──────────────────────────────────────────────────────────

function getMention(avg: number): string {
  if (avg >= 16) return 'Très bien'
  if (avg >= 14) return 'Bien'
  if (avg >= 12) return 'Assez bien'
  if (avg >= 10) return 'Passable'
  return 'Insuffisant'
}

/**
 * Transforme les FSBulletin Firestore en ClassData[] pour l'affichage.
 * Un document FSBulletin = un élève dans une classe pour un trimestre.
 */
function fsBulletinsToClassData(fsBulletins: FSBulletin[]): ClassData[] {
  const byClass = new Map<string, { name: string; students: StudentBulletin[] }>()

  for (const b of fsBulletins) {
    // Un bulletin sans classe rattachée ne peut pas être regroupé.
    const classId = b.class_id
    if (!classId) continue

    if (!byClass.has(classId)) {
      byClass.set(classId, { name: b.class_name ?? 'Classe', students: [] })
    }
    const avg = b.average ?? 0
    const initials = (b.student_name ?? '')
      .split(' ').slice(0, 2)
      .map((w: string) => w[0] ?? '')
      .join('').toUpperCase()
    // PostgreSQL renvoie une date ISO ; Firestore renvoyait un Timestamp.
    const submittedStr = b.submitted_at
      ? new Date(b.submitted_at).toLocaleDateString('fr-FR')
      : ''
    // 'draft' n'existe pas côté direction — on le traite comme 'submitted'
    const safeStatus = (b.status === 'draft' ? 'submitted' : b.status) as BulletinStatus

    byClass.get(classId)!.students.push({
      id:               b.id,
      name:             b.student_name,
      avatar:           initials,
      rank:             0,              // calculé après
      totalStudents:    0,              // calculé après
      average:          avg,
      mention:          getMention(avg),
      teacherComment:   b.appreciation ?? '',
      directionComment: b.director_comment ?? '',
      status:           safeStatus,
      submittedAt:      submittedStr,
      grades: (b.bulletin_assessments ?? []).map((a) => ({
        subject:     a.title,
        grade:       a.value ?? 0,
        coefficient: a.coefficient,
        teacher:     'Professeur',
      })),
    })
  }

  const classes: ClassData[] = []
  byClass.forEach((data, classId) => {
    const total = data.students.length
    const sorted = [...data.students].sort((a, b) => b.average - a.average)
    const withRanks = data.students.map(s => ({
      ...s,
      rank:         sorted.findIndex(ss => ss.id === s.id) + 1,
      totalStudents: total,
    }))
    classes.push({ id: classId, name: data.name, students: withRanks })
  })

  return classes
}

function getProgressCount(classes: ClassData[]) {
  let validated = 0
  let total = 0
  classes.forEach(c => {
    c.students.forEach(s => {
      total++
      if (s.status === 'approved' || s.status === 'published') validated++
    })
  })
  return { validated, total }
}

function isClassAllApproved(cls: ClassData) {
  return cls.students.every(s => s.status === 'approved' || s.status === 'published')
}

function isClassPublished(cls: ClassData) {
  return cls.students.every(s => s.status === 'published')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulletinsScreen() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? 'demo'

  const [trimestre, setTrimestre]           = useState<Trimestre>('T2')
  const [selectedClassId, setSelectedClassId] = useState(CLASSES[0].id)
  const [classData, setClassData]           = useState<ClassData[]>(CLASSES)

  // ── Chargement Firebase temps réel ─────────────────────────────────────────
  const { bulletins, loading: fbLoading } = useBulletins(
    schoolId !== 'demo' ? schoolId : '',
    { trimestre },
  )

  useEffect(() => {
    if (schoolId === 'demo' || fbLoading) return
    if (bulletins.length > 0) {
      const fbClasses = fsBulletinsToClassData(bulletins)
      setClassData(fbClasses)
      setSelectedClassId(fbClasses[0]?.id ?? CLASSES[0].id)
    }
    // Si 0 bulletins → on garde les données demo affichées
  }, [bulletins, fbLoading, schoolId])
  const [selectedStudent, setSelectedStudent] = useState<StudentBulletin | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectTarget, setRejectTarget]     = useState<StudentBulletin | null>(null)
  const [rejectMotif, setRejectMotif]       = useState('')
  const [dirComment, setDirComment]         = useState('')

  const currentClass = classData.find(c => c.id === selectedClassId)!
  const progress     = getProgressCount(classData)

  // ─── Actions ──────────────────────────────────────────────────────────────

  function updateStudentStatus(classId: string, studentId: string, status: BulletinStatus, directionComment?: string) {
    setClassData(prev =>
      prev.map(cls =>
        cls.id !== classId ? cls : {
          ...cls,
          students: cls.students.map(s =>
            s.id !== studentId ? s : {
              ...s,
              status,
              directionComment: directionComment !== undefined ? directionComment : s.directionComment,
            }
          ),
        }
      )
    )
  }

  function handleQuickApprove(student: StudentBulletin) {
    updateStudentStatus(selectedClassId, student.id, 'approved')
    // Firebase — fire-and-forget
    if (schoolId !== 'demo') {
      validateBulletin(schoolId, student.id, '')
        .catch(e => console.warn('[bulletins] validate failed:', e))
    }
  }

  function handleQuickReject(student: StudentBulletin) {
    setRejectTarget(student)
    setRejectMotif('')
    setRejectModalVisible(true)
  }

  function handleDetailApprove() {
    if (!selectedStudent) return
    updateStudentStatus(selectedClassId, selectedStudent.id, 'approved', dirComment)
    setDetailModalVisible(false)
    if (schoolId !== 'demo') {
      validateBulletin(schoolId, selectedStudent.id, dirComment)
        .catch(e => console.warn('[bulletins] validate failed:', e))
    }
  }

  function handleDetailReject() {
    if (!selectedStudent) return
    setRejectTarget(selectedStudent)
    setRejectMotif('')
    setDetailModalVisible(false)
    setRejectModalVisible(true)
  }

  function confirmReject() {
    if (!rejectTarget) return
    updateStudentStatus(selectedClassId, rejectTarget.id, 'rejected')
    setRejectModalVisible(false)
    const target = rejectTarget   // capture avant setState
    setRejectTarget(null)
    if (schoolId !== 'demo') {
      rejectBulletin(schoolId, target.id, rejectMotif)
        .catch(e => console.warn('[bulletins] reject failed:', e))
    }
  }

  function handlePublishClass() {
    if (!currentClass) return
    const toPublish = currentClass.students.filter(s => s.status === 'approved')
    setClassData(prev =>
      prev.map(cls =>
        cls.id !== selectedClassId ? cls : {
          ...cls,
          students: cls.students.map(s =>
            s.status === 'approved' ? { ...s, status: 'published' } : s
          ),
        }
      )
    )
    if (schoolId !== 'demo') {
      toPublish.forEach(s => {
        publishBulletin(schoolId, s.id)
          .catch(e => console.warn('[bulletins] publish failed:', e))
      })
    }
  }

  function openDetail(student: StudentBulletin) {
    setSelectedStudent(student)
    setDirComment(student.directionComment)
    setDetailModalVisible(true)
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  const allApproved  = isClassAllApproved(currentClass)
  const allPublished = isClassPublished(currentClass)

  function renderStudentCard({ item }: { item: StudentBulletin }) {
    const statusCfg = STATUS_CONFIG[item.status]
    const mentionColor = MENTION_COLORS[item.mention] ?? colors.gray[500]
    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.85}>
        <View style={styles.cardHeader}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.avatar}</Text>
          </View>

          {/* Name + rank */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardRank}>{item.rank}ᵉ / {item.totalStudents} élèves</Text>
          </View>

          {/* Average + mention */}
          <View style={styles.cardRight}>
            <Text style={styles.average}>{item.average.toFixed(1)}/20</Text>
            <View style={[styles.mentionBadge, { backgroundColor: mentionColor + '22' }]}>
              <Text style={[styles.mentionText, { color: mentionColor }]}>{item.mention}</Text>
            </View>
          </View>
        </View>

        {/* Teacher comment preview */}
        <Text style={styles.commentPreview} numberOfLines={2}>
          « {item.teacherComment} »
        </Text>

        {/* Status + actions */}
        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon as any} size={13} color={statusCfg.color} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>

          {item.status === 'submitted' && (
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.btnApproveSmall}
                onPress={() => handleQuickApprove(item)}
              >
                <Ionicons name="checkmark" size={14} color={colors.white} />
                <Text style={styles.btnSmallText}>Approuver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnRejectSmall}
                onPress={() => handleQuickReject(item)}
              >
                <Ionicons name="close" size={14} color={colors.white} />
                <Text style={styles.btnSmallText}>Rejeter</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Validation Bulletins</Text>
          <Text style={styles.headerSub}>Conseil de classe • {trimestre}</Text>
        </View>
        {/* Trimestre selector */}
        <View style={styles.trimestreRow}>
          {(['T1', 'T2', 'T3'] as Trimestre[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.triBtn, trimestre === t && styles.triBtnActive]}
              onPress={() => setTrimestre(t)}
            >
              <Text style={[styles.triBtnText, trimestre === t && styles.triBtnTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Progress bar ── */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>Bulletins validés</Text>
          <Text style={styles.progressCount}>{progress.validated} / {progress.total}</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(progress.validated / progress.total) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressPct}>
          {Math.round((progress.validated / progress.total) * 100)}% complété
        </Text>
      </View>

      {/* ── Class tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.classTabs}
      >
        {classData.map(cls => {
          const active   = cls.id === selectedClassId
          const approved = cls.students.filter(s => s.status === 'approved' || s.status === 'published').length
          return (
            <TouchableOpacity
              key={cls.id}
              style={[styles.classTab, active && styles.classTabActive]}
              onPress={() => setSelectedClassId(cls.id)}
            >
              <Text style={[styles.classTabName, active && styles.classTabNameActive]}>{cls.name}</Text>
              <Text style={[styles.classTabCount, active && styles.classTabCountActive]}>
                {approved}/{cls.students.length}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* ── Student list ── */}
      <FlatList
        data={currentClass.students}
        keyExtractor={s => s.id}
        renderItem={renderStudentCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Sticky publish button ── */}
      {!allPublished && (
        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={[
              styles.publishBtn,
              allApproved ? styles.publishBtnReady : styles.publishBtnDisabled,
            ]}
            onPress={allApproved ? handlePublishClass : undefined}
            disabled={!allApproved}
          >
            <Ionicons
              name={allApproved ? 'cloud-upload-outline' : 'lock-closed-outline'}
              size={18}
              color={colors.white}
            />
            <Text style={styles.publishBtnText}>
              {allApproved
                ? `Publier la classe ${currentClass.name}`
                : `${currentClass.students.filter(s => s.status === 'submitted').length} bulletin(s) en attente`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {allPublished && (
        <View style={styles.stickyFooter}>
          <View style={styles.publishedBanner}>
            <Ionicons name="cloud-done" size={18} color={colors.success} />
            <Text style={styles.publishedBannerText}>Classe {currentClass.name} — Bulletins publiés</Text>
          </View>
        </View>
      )}

      {/* ─────────────── MODAL DÉTAIL ─────────────── */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {selectedStudent && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header élève */}
                <View style={styles.modalHeader}>
                  <View style={styles.avatarLg}>
                    <Text style={styles.avatarLgText}>{selectedStudent.avatar}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalStudentName}>{selectedStudent.name}</Text>
                    <Text style={styles.modalStudentMeta}>
                      {currentClass.name} • Trimestre {trimestre}
                    </Text>
                    <Text style={styles.modalStudentMeta}>
                      {selectedStudent.rank}ᵉ / {selectedStudent.totalStudents} élèves
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Ionicons name="close-circle" size={28} color={colors.gray[400]} />
                  </TouchableOpacity>
                </View>

                {/* Moyenne + mention */}
                <View style={styles.averageRow}>
                  <View style={styles.averageBox}>
                    <Text style={styles.averageBoxLabel}>Moyenne</Text>
                    <Text style={styles.averageBoxValue}>{selectedStudent.average.toFixed(1)}</Text>
                    <Text style={styles.averageBoxSub}>sur 20</Text>
                  </View>
                  <View style={[
                    styles.mentionBox,
                    { backgroundColor: (MENTION_COLORS[selectedStudent.mention] ?? colors.gray[500]) + '22' },
                  ]}>
                    <Text style={styles.mentionBoxLabel}>Mention</Text>
                    <Text style={[
                      styles.mentionBoxValue,
                      { color: MENTION_COLORS[selectedStudent.mention] ?? colors.gray[500] },
                    ]}>
                      {selectedStudent.mention}
                    </Text>
                  </View>
                </View>

                {/* Tableau notes */}
                <Text style={styles.sectionTitle}>Notes par matière</Text>
                <View style={styles.gradesTable}>
                  <View style={styles.gradesTableHeader}>
                    <Text style={[styles.gradeCell, { flex: 2 }]}>Matière</Text>
                    <Text style={styles.gradeCell}>Note</Text>
                    <Text style={styles.gradeCell}>Coef.</Text>
                  </View>
                  {selectedStudent.grades.map((g, i) => (
                    <View key={i} style={[styles.gradesTableRow, i % 2 === 1 && styles.gradesTableRowAlt]}>
                      <Text style={[styles.gradeCellBody, { flex: 2 }]}>{g.subject}</Text>
                      <Text style={[styles.gradeCellBody, { color: g.grade >= 10 ? colors.gray[800] : colors.danger, fontWeight: fontWeight.semibold }]}>
                        {g.grade.toFixed(1)}
                      </Text>
                      <Text style={styles.gradeCellBody}>{g.coefficient}</Text>
                    </View>
                  ))}
                </View>

                {/* Appréciation prof */}
                <Text style={styles.sectionTitle}>Appréciation du professeur principal</Text>
                <View style={styles.commentBox}>
                  <Text style={styles.commentBoxText}>« {selectedStudent.teacherComment} »</Text>
                  <Text style={styles.commentBoxDate}>Soumis le {selectedStudent.submittedAt}</Text>
                </View>

                {/* Commentaire direction */}
                <Text style={styles.sectionTitle}>Appréciation de la Direction / Conseil de classe</Text>
                <TextInput
                  style={styles.dirCommentInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Saisir le commentaire du conseil de classe..."
                  placeholderTextColor={colors.gray[400]}
                  value={dirComment}
                  onChangeText={setDirComment}
                />

                {/* Statut actuel */}
                {selectedStudent.status !== 'submitted' && (
                  <View style={[
                    styles.currentStatusBox,
                    { backgroundColor: STATUS_CONFIG[selectedStudent.status].bg },
                  ]}>
                    <Ionicons
                      name={STATUS_CONFIG[selectedStudent.status].icon as any}
                      size={16}
                      color={STATUS_CONFIG[selectedStudent.status].color}
                    />
                    <Text style={[
                      styles.currentStatusText,
                      { color: STATUS_CONFIG[selectedStudent.status].color },
                    ]}>
                      Statut actuel : {STATUS_CONFIG[selectedStudent.status].label}
                    </Text>
                  </View>
                )}

                {/* Boutons action */}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.btnReject} onPress={handleDetailReject}>
                    <Ionicons name="close-circle-outline" size={18} color={colors.white} />
                    <Text style={styles.btnActionText}>Rejeter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnApprove} onPress={handleDetailApprove}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
                    <Text style={styles.btnActionText}>Approuver</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ height: spacing.xl }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─────────────── MODAL REJET ─────────────── */}
      <Modal visible={rejectModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModal}>
            <View style={styles.rejectModalHeader}>
              <Ionicons name="close-circle" size={28} color={colors.danger} />
              <Text style={styles.rejectModalTitle}>Motif du rejet</Text>
            </View>
            {rejectTarget && (
              <Text style={styles.rejectModalSub}>
                Bulletin de {rejectTarget.name} sera renvoyé au professeur.
              </Text>
            )}

            {/* Suggestions */}
            <Text style={styles.rejectSuggestLabel}>Suggestions rapides :</Text>
            <View style={styles.rejectSuggestions}>
              {REJECT_SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestChip, rejectMotif === s && styles.suggestChipActive]}
                  onPress={() => setRejectMotif(s)}
                >
                  <Text style={[styles.suggestChipText, rejectMotif === s && styles.suggestChipTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Saisie libre */}
            <TextInput
              style={styles.rejectInput}
              multiline
              numberOfLines={3}
              placeholder="Ou saisir un motif personnalisé..."
              placeholderTextColor={colors.gray[400]}
              value={rejectMotif}
              onChangeText={setRejectMotif}
            />

            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmRejectBtn, !rejectMotif.trim() && styles.confirmRejectBtnDisabled]}
                onPress={confirmReject}
                disabled={!rejectMotif.trim()}
              >
                <Text style={styles.confirmRejectText}>Confirmer le rejet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  trimestreRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: radius.full,
    padding: 2,
  },
  triBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  triBtnActive: {
    backgroundColor: colors.primary,
  },
  triBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  triBtnTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },

  // Progress
  progressContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  progressCount: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  progressPct: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: spacing.xs - 2,
    textAlign: 'right',
  },

  // Class tabs
  classTabs: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  classTab: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    marginRight: spacing.sm,
  },
  classTabActive: {
    backgroundColor: colors.primary,
  },
  classTabName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[600],
  },
  classTabNameActive: {
    color: colors.white,
  },
  classTabCount: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: 2,
  },
  classTabCountActive: {
    color: colors.white + 'cc',
  },

  // List
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },

  // Student card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  cardRank: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  average: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.gray[800],
  },
  mentionBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs - 2,
  },
  mentionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },

  commentPreview: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    lineHeight: 18,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
    gap: spacing.xs - 1,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  btnApproveSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 3,
  },
  btnRejectSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 3,
  },
  btnSmallText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },

  // Sticky footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  publishBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  publishBtnReady: {
    backgroundColor: colors.primary,
    ...shadow.md,
  },
  publishBtnDisabled: {
    backgroundColor: colors.gray[300],
  },
  publishBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  publishedBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#dcfce7',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
  },
  publishedBannerText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },

  // Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatarLg: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLgText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  modalStudentName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  modalStudentMeta: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },

  averageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  averageBox: {
    flex: 1,
    backgroundColor: colors.primary + '11',
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  averageBoxLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  averageBoxValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
  },
  averageBoxSub: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  mentionBox: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionBoxLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  mentionBoxValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  // Grades table
  gradesTable: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gradesTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  gradeCell: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.gray[600],
    textAlign: 'center',
  },
  gradesTableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  gradesTableRowAlt: {
    backgroundColor: colors.gray[50],
  },
  gradeCellBody: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[700],
    textAlign: 'center',
  },

  // Comment box
  commentBox: {
    backgroundColor: colors.gray[50],
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  commentBoxText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    fontStyle: 'italic',
    lineHeight: 20,
  },
  commentBoxDate: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: spacing.xs,
  },

  // Direction comment input
  dirCommentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.gray[800],
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
    minHeight: 88,
  },

  // Current status
  currentStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  currentStatusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  // Modal action buttons
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btnReject: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    paddingVertical: spacing.md - 2,
  },
  btnApprove: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    paddingVertical: spacing.md - 2,
  },
  btnActionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },

  // Reject Modal
  rejectModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rejectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  rejectModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  rejectModalSub: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  rejectSuggestLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  rejectSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  suggestChipActive: {
    borderColor: colors.danger,
    backgroundColor: '#fee2e2',
  },
  suggestChipText: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
  },
  suggestChipTextActive: {
    color: colors.danger,
    fontWeight: fontWeight.semibold,
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.gray[800],
    textAlignVertical: 'top',
    minHeight: 80,
    marginTop: spacing.xs,
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md - 2,
  },
  cancelBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  confirmRejectBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    paddingVertical: spacing.md - 2,
  },
  confirmRejectBtnDisabled: {
    backgroundColor: colors.gray[300],
  },
  confirmRejectText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
})
