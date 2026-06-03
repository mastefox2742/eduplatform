/**
 * Bulletins — Interface Professeur
 * Saisie des appréciations par élève, calcul automatique des moyennes,
 * validation et soumission à la Direction.
 */
import { useState, useMemo, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { submitBulletin } from '@/services/firestore'

// ── IA Appréciations ──────────────────────────────────────────────────────────
const genAppreciationCF = httpsCallable(functions, 'generateBulletinAppreciation')

// ─── Types ───────────────────────────────────────────────────────────────────

type Trimestre = 'T1' | 'T2' | 'T3'
type BulletinStatus = 'draft' | 'complete' | 'submitted'

interface Assessment {
  title:    string
  maxScore: number
  coeff:    number
  value:    number | null
}

interface StudentBulletin {
  id:            string
  name:          string
  avatar:        string
  assessments:   Assessment[]
  appreciation:  string
  conduct:       string
  status:        BulletinStatus
}

interface ClassBulletin {
  id:       string
  name:     string
  subject:  string
  students: StudentBulletin[]
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const TRIMESTRES: { id: Trimestre; label: string; period: string }[] = [
  { id: 'T1', label: '1er Trimestre', period: 'Oct – Déc 2025' },
  { id: 'T2', label: '2e Trimestre',  period: 'Jan – Mar 2026' },
  { id: 'T3', label: '3e Trimestre',  period: 'Avr – Juin 2026' },
]

const CONDUCT_OPTIONS = ['Très Bien', 'Bien', 'Assez Bien', 'Passable', 'Insuffisant']

const CONDUCT_COLOR: Record<string, { color: string; bg: string }> = {
  'Très Bien':   { color: '#059669', bg: '#d1fae5' },
  'Bien':        { color: colors.success, bg: '#dcfce7' },
  'Assez Bien':  { color: colors.primary, bg: '#dbeafe' },
  'Passable':    { color: colors.warning, bg: '#fef3c7' },
  'Insuffisant': { color: colors.danger,  bg: '#fee2e2' },
}

function buildClass(id: string, name: string): ClassBulletin {
  const students: StudentBulletin[] = [
    { id: 's1', name: 'ABENA Marie',      avatar: 'AM', conduct: 'Très Bien',  appreciation: '', status: 'draft',
      assessments: [
        { title: 'Interrogation 1', maxScore: 20, coeff: 1, value: 14 },
        { title: 'Devoir surveillé', maxScore: 20, coeff: 2, value: 16 },
        { title: 'Interrogation 2', maxScore: 20, coeff: 1, value: 13 },
        { title: 'Examen',          maxScore: 20, coeff: 3, value: 15 },
      ]},
    { id: 's2', name: 'BONGO Jean',        avatar: 'BJ', conduct: 'Bien',       appreciation: '', status: 'draft',
      assessments: [
        { title: 'Interrogation 1', maxScore: 20, coeff: 1, value: 17 },
        { title: 'Devoir surveillé', maxScore: 20, coeff: 2, value: 18 },
        { title: 'Interrogation 2', maxScore: 20, coeff: 1, value: 16 },
        { title: 'Examen',          maxScore: 20, coeff: 3, value: 19 },
      ]},
    { id: 's3', name: 'DIBAS Lucie',       avatar: 'DL', conduct: 'Assez Bien', appreciation: '', status: 'draft',
      assessments: [
        { title: 'Interrogation 1', maxScore: 20, coeff: 1, value: 10 },
        { title: 'Devoir surveillé', maxScore: 20, coeff: 2, value: 11 },
        { title: 'Interrogation 2', maxScore: 20, coeff: 1, value: 9  },
        { title: 'Examen',          maxScore: 20, coeff: 3, value: 12 },
      ]},
    { id: 's4', name: 'EBANG Paul',        avatar: 'EP', conduct: 'Bien',       appreciation: '', status: 'draft',
      assessments: [
        { title: 'Interrogation 1', maxScore: 20, coeff: 1, value: 15 },
        { title: 'Devoir surveillé', maxScore: 20, coeff: 2, value: 14 },
        { title: 'Interrogation 2', maxScore: 20, coeff: 1, value: 16 },
        { title: 'Examen',          maxScore: 20, coeff: 3, value: 14 },
      ]},
    { id: 's5', name: 'FOUDA Christelle',  avatar: 'FC', conduct: 'Passable',   appreciation: '', status: 'draft',
      assessments: [
        { title: 'Interrogation 1', maxScore: 20, coeff: 1, value: 7  },
        { title: 'Devoir surveillé', maxScore: 20, coeff: 2, value: 8  },
        { title: 'Interrogation 2', maxScore: 20, coeff: 1, value: 9  },
        { title: 'Examen',          maxScore: 20, coeff: 3, value: 8  },
      ]},
    { id: 's6', name: 'GABIN Théo',        avatar: 'GT', conduct: 'Très Bien',  appreciation: '', status: 'draft',
      assessments: [
        { title: 'Interrogation 1', maxScore: 20, coeff: 1, value: 18 },
        { title: 'Devoir surveillé', maxScore: 20, coeff: 2, value: 17 },
        { title: 'Interrogation 2', maxScore: 20, coeff: 1, value: 19 },
        { title: 'Examen',          maxScore: 20, coeff: 3, value: 18 },
      ]},
  ]
  return { id, name, subject: 'Mathématiques', students }
}

const INITIAL_CLASSES: ClassBulletin[] = [
  buildClass('c1', '3ème B'),
  buildClass('c2', '4ème A'),
  buildClass('c3', '5ème C'),
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcAverage(assessments: Assessment[]): number | null {
  const graded = assessments.filter(a => a.value !== null)
  if (graded.length === 0) return null
  const sumWeighted = graded.reduce((s, a) => s + (a.value! / a.maxScore) * 20 * a.coeff, 0)
  const sumCoeff    = graded.reduce((s, a) => s + a.coeff, 0)
  return sumCoeff > 0 ? sumWeighted / sumCoeff : null
}

function mention(avg: number | null): { label: string; color: string; bg: string } {
  if (avg === null) return { label: '—',          color: colors.gray[400], bg: colors.gray[100] }
  if (avg >= 16)    return { label: 'Très Bien',  color: '#059669',        bg: '#d1fae5' }
  if (avg >= 14)    return { label: 'Bien',        color: colors.success,  bg: '#dcfce7' }
  if (avg >= 12)    return { label: 'Assez Bien',  color: colors.primary,  bg: '#dbeafe' }
  if (avg >= 10)    return { label: 'Passable',    color: colors.warning,  bg: '#fef3c7' }
  return                    { label: 'Insuffisant',color: colors.danger,   bg: '#fee2e2' }
}

function avgColor(v: number | null) {
  if (v === null)  return colors.gray[400]
  if (v >= 14)     return colors.success
  if (v >= 10)     return colors.warning
  return colors.danger
}

function classRanks(students: StudentBulletin[]): Record<string, number> {
  const sorted = [...students]
    .map(s => ({ id: s.id, avg: calcAverage(s.assessments) ?? -1 }))
    .sort((a, b) => b.avg - a.avg)
  const ranks: Record<string, number> = {}
  sorted.forEach((s, i) => { ranks[s.id] = i + 1 })
  return ranks
}

const APPRECIATION_SUGGESTIONS = [
  'Bon trimestre dans l\'ensemble. Continuez ainsi.',
  'Des progrès notables. Il faut persévérer dans l\'effort.',
  'Élève sérieux(se) et travailleur(se). Félicitations.',
  'Des résultats encourageants. Peut mieux faire en exercices.',
  'Trimestre difficile. Un soutien supplémentaire est conseillé.',
  'Excellents résultats. Élève brillant(e), à encourager.',
  'Bons acquis. Attention à la régularité du travail.',
  'Des lacunes persistent. Revoir les bases fondamentales.',
]

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TeacherBulletinScreen() {
  const { user, profile } = useAuth()
  const schoolId  = profile?.schoolId ?? 'demo'
  const teacherId = user?.uid ?? ''

  const [trimestre, setTrimestre]   = useState<Trimestre>('T2')
  const [classIdx, setClassIdx]     = useState(0)
  const [classes, setClasses]       = useState<ClassBulletin[]>(INITIAL_CLASSES)
  const [modalStudent, setModalStudent] = useState<StudentBulletin | null>(null)
  const [editAppreciation, setEditAppreciation] = useState('')
  const [editConduct, setEditConduct]           = useState('')
  const [showSuggestions, setShowSuggestions]   = useState(false)
  const [aiLoading, setAiLoading]               = useState(false)

  // ── Génération IA de l'appréciation ──────────────────────────────────────
  const handleGenerateAI = useCallback(async () => {
    if (!modalStudent) return
    const avg = calcAverage(modalStudent.assessments)
    setAiLoading(true)
    try {
      const res = await genAppreciationCF({
        schoolId,
        students: [{
          studentName:  modalStudent.name,
          subject:      cls.subject,
          average:      avg,
          maxScore:     20,
          conduct:      editConduct || 'Bien',
          trimestre,
        }],
        useAI: schoolId !== 'demo',
      }) as any
      const found = res.data?.appreciations?.[0]?.appreciation
      if (found) {
        setEditAppreciation(found)
        setShowSuggestions(false)
      } else {
        Alert.alert('IA indisponible', 'Choisissez une suggestion manuelle.')
        setShowSuggestions(true)
      }
    } catch {
      Alert.alert('IA indisponible', 'Utilisez les suggestions manuelles.')
      setShowSuggestions(true)
    } finally {
      setAiLoading(false)
    }
  }, [modalStudent, editConduct, trimestre, schoolId, cls])

  const cls     = classes[classIdx]
  const ranks   = useMemo(() => classRanks(cls.students), [cls.students])
  const classAvg = useMemo(() => {
    const avgs = cls.students.map(s => calcAverage(s.assessments)).filter(v => v !== null) as number[]
    return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null
  }, [cls.students])

  const completedCount = cls.students.filter(s => s.appreciation.trim().length > 0).length
  const allComplete    = completedCount === cls.students.length
  const alreadySubmitted = cls.students.every(s => s.status === 'submitted')

  function openModal(student: StudentBulletin) {
    setModalStudent(student)
    setEditAppreciation(student.appreciation)
    setEditConduct(student.conduct)
    setShowSuggestions(false)
  }

  function saveModal() {
    if (!modalStudent) return
    setClasses(prev => prev.map((c, i) =>
      i !== classIdx ? c : {
        ...c,
        students: c.students.map(s =>
          s.id !== modalStudent.id ? s : {
            ...s,
            appreciation: editAppreciation,
            conduct:      editConduct,
            status:       editAppreciation.trim() ? 'complete' : 'draft',
          }
        ),
      }
    ))
    setModalStudent(null)
  }

  function submitClass() {
    if (!allComplete) {
      Alert.alert(
        'Bulletins incomplets',
        `${cls.students.length - completedCount} élève(s) sans appréciation. Voulez-vous soumettre quand même ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Soumettre', style: 'destructive', onPress: doSubmit },
        ]
      )
    } else {
      doSubmit()
    }
  }

  const doSubmit = useCallback(() => {
    // 1. Mise à jour locale instantanée
    setClasses(prev => prev.map((c, i) =>
      i !== classIdx ? c : {
        ...c,
        students: c.students.map(s => ({ ...s, status: 'submitted' as BulletinStatus })),
      }
    ))
    Alert.alert('✅ Soumis', `Bulletins de ${cls.name} envoyés à la Direction pour validation.`)

    // 2. Persistance Firebase en arrière-plan (fire-and-forget)
    if (schoolId !== 'demo' && teacherId) {
      cls.students.forEach(student => {
        submitBulletin(schoolId, {
          studentId:    student.id,
          studentName:  student.name,
          classId:      cls.id,
          className:    cls.name,
          teacherId,
          teacherName:  profile?.displayName ?? '',
          trimestre,
          schoolYear:   '2025-2026',
          subject:      cls.subject,
          average:      calcAverage(student.assessments),
          conduct:      student.conduct,
          appreciation: student.appreciation,
          assessments:  student.assessments.map(a => ({
            title: a.title, value: a.value, maxScore: a.maxScore, coeff: a.coeff,
          })),
          status: 'submitted',
        }).catch(e => console.warn('[bulletin] submitBulletin failed:', e))
      })
    }
  }, [schoolId, teacherId, cls, classIdx, trimestre])

  const tri = TRIMESTRES.find(t => t.id === trimestre)!

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bulletins</Text>
          <Text style={styles.headerSub}>Saisie des appréciations</Text>
        </View>
        {/* Trimestre picker */}
        <View style={styles.triRow}>
          {TRIMESTRES.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.triChip, trimestre === t.id && styles.triChipActive]}
              onPress={() => setTrimestre(t.id)}
            >
              <Text style={[styles.triText, trimestre === t.id && styles.triTextActive]}>{t.id}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Periode label ── */}
      <View style={styles.periodBar}>
        <Ionicons name="calendar-outline" size={13} color={colors.primary} />
        <Text style={styles.periodText}>{tri.label} · {tri.period}</Text>
      </View>

      {/* ── Class Selector ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.classStrip}
      >
        {classes.map((c, i) => {
          const done = c.students.filter(s => s.appreciation.trim()).length
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.classTab, classIdx === i && styles.classTabActive]}
              onPress={() => setClassIdx(i)}
            >
              <Text style={[styles.classTabName, classIdx === i && styles.classTabNameActive]}>{c.name}</Text>
              <Text style={[styles.classTabSub,  classIdx === i && styles.classTabSubActive]}>
                {done}/{c.students.length} appréciations
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Class Summary ── */}
        <View style={styles.classSummary}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryClassName}>{cls.name} · {cls.subject}</Text>
            <Text style={styles.summaryMeta}>{cls.students.length} élèves · {tri.period}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {classAvg !== null && (
              <Text style={[styles.summaryAvg, { color: avgColor(classAvg) }]}>
                Moy. classe : {classAvg.toFixed(2)}/20
              </Text>
            )}
            {/* Progress */}
            <View style={styles.progressWrap}>
              <View style={[
                styles.progressFill,
                { width: `${(completedCount / cls.students.length) * 100}%` as any }
              ]} />
            </View>
            <Text style={styles.progressLabel}>{completedCount}/{cls.students.length} complétés</Text>
          </View>
        </View>

        {/* ── Student List ── */}
        <View style={styles.listContainer}>
          {cls.students.map(student => {
            const avg  = calcAverage(student.assessments)
            const men  = mention(avg)
            const rank = ranks[student.id]
            const conductCfg = CONDUCT_COLOR[student.conduct] ?? CONDUCT_COLOR['Bien']
            const hasAppreciation = student.appreciation.trim().length > 0

            return (
              <TouchableOpacity
                key={student.id}
                style={[
                  styles.studentRow,
                  student.status === 'submitted' && styles.studentRowSubmitted,
                ]}
                onPress={() => !alreadySubmitted && openModal(student)}
                activeOpacity={alreadySubmitted ? 1 : 0.7}
              >
                {/* Avatar + rank */}
                <View style={{ alignItems: 'center', width: 44 }}>
                  <View style={[styles.avatar, { backgroundColor: men.bg }]}>
                    <Text style={[styles.avatarText, { color: men.color }]}>{student.avatar}</Text>
                  </View>
                  <Text style={styles.rankText}>#{rank}</Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{student.name}</Text>

                  {/* Appreciation preview */}
                  {hasAppreciation ? (
                    <Text style={styles.appreciationPreview} numberOfLines={1}>
                      "{student.appreciation}"
                    </Text>
                  ) : (
                    <Text style={styles.appreciationEmpty}>
                      {alreadySubmitted ? '—' : '✏️ Saisir une appréciation'}
                    </Text>
                  )}

                  {/* Conduct pill */}
                  <View style={[styles.conductPill, { backgroundColor: conductCfg.bg }]}>
                    <Text style={[styles.conductText, { color: conductCfg.color }]}>
                      {student.conduct}
                    </Text>
                  </View>
                </View>

                {/* Average */}
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {avg !== null ? (
                    <>
                      <Text style={[styles.avgBig, { color: avgColor(avg) }]}>{avg.toFixed(2)}</Text>
                      <View style={[styles.mentionPill, { backgroundColor: men.bg }]}>
                        <Text style={[styles.mentionText, { color: men.color }]}>{men.label}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.avgNone}>—/20</Text>
                  )}
                  {student.status === 'submitted' ? (
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  ) : hasAppreciation ? (
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={16} color={colors.gray[300]} />
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* ── Submit Button ── */}
        <View style={styles.submitWrap}>
          {alreadySubmitted ? (
            <View style={styles.submittedBanner}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.submittedText}>Bulletins soumis à la Direction</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, !allComplete && styles.submitBtnWarning]}
              onPress={submitClass}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={18} color={colors.white} />
              <Text style={styles.submitBtnText}>
                {allComplete
                  ? `Soumettre les ${cls.students.length} bulletins à la Direction`
                  : `Soumettre quand même (${completedCount}/${cls.students.length} complets)`
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Appreciation Modal ── */}
      <Modal
        visible={!!modalStudent}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setModalStudent(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modal}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalStudent(null)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Appréciation</Text>
              <TouchableOpacity onPress={saveModal}>
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
              {/* Student card */}
              {modalStudent && (() => {
                const avg  = calcAverage(modalStudent.assessments)
                const men  = mention(avg)
                const rank = ranks[modalStudent.id]
                return (
                  <>
                    <View style={styles.modalStudentCard}>
                      <View style={[styles.modalAvatar, { backgroundColor: men.bg }]}>
                        <Text style={[styles.modalAvatarText, { color: men.color }]}>
                          {modalStudent.avatar}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalStudentName}>{modalStudent.name}</Text>
                        <Text style={styles.modalStudentSub}>{cls.name} · {cls.subject} · Rang #{rank}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        {avg !== null && (
                          <Text style={[styles.modalAvgBig, { color: avgColor(avg) }]}>
                            {avg.toFixed(2)}/20
                          </Text>
                        )}
                        <View style={[styles.mentionPill, { backgroundColor: men.bg }]}>
                          <Text style={[styles.mentionText, { color: men.color }]}>{men.label}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Assessments detail */}
                    <Text style={styles.modalSection}>Détail des notes</Text>
                    <View style={styles.assessmentTable}>
                      {modalStudent.assessments.map((a, i) => (
                        <View key={i} style={styles.assessmentRow}>
                          <Text style={styles.assessmentTitle} numberOfLines={1}>{a.title}</Text>
                          <Text style={styles.assessmentCoeff}>×{a.coeff}</Text>
                          <Text style={[
                            styles.assessmentGrade,
                            { color: a.value !== null ? avgColor((a.value / a.maxScore) * 20) : colors.gray[400] },
                          ]}>
                            {a.value !== null ? `${a.value}/${a.maxScore}` : 'ABS'}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Conduct */}
                    <Text style={styles.modalSection}>Conduite</Text>
                    <View style={styles.conductRow}>
                      {CONDUCT_OPTIONS.map(opt => {
                        const cfg = CONDUCT_COLOR[opt]
                        const sel = editConduct === opt
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              styles.conductOption,
                              sel && { backgroundColor: cfg.bg, borderColor: cfg.color },
                            ]}
                            onPress={() => setEditConduct(opt)}
                          >
                            <Text style={[
                              styles.conductOptionText,
                              { color: sel ? cfg.color : colors.gray[500] },
                            ]}>
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>

                    {/* Appreciation */}
                    <View style={styles.appreciationHeader}>
                      <Text style={styles.modalSection}>Appréciation</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {/* Bouton IA ✨ */}
                        <TouchableOpacity
                          style={styles.aiBtn}
                          onPress={handleGenerateAI}
                          disabled={aiLoading}
                        >
                          {aiLoading
                            ? <ActivityIndicator size="small" color={colors.primary} />
                            : <Text style={styles.aiBtnText}>✨ IA</Text>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowSuggestions(v => !v)}>
                          <Text style={styles.suggestionToggle}>
                            {showSuggestions ? 'Masquer' : '💡 Manuel'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {showSuggestions && (
                      <ScrollView
                        horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.suggestionsRow}
                      >
                        {APPRECIATION_SUGGESTIONS.map((s, i) => (
                          <TouchableOpacity
                            key={i}
                            style={styles.suggestionChip}
                            onPress={() => {
                              setEditAppreciation(s)
                              setShowSuggestions(false)
                            }}
                          >
                            <Text style={styles.suggestionText}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    <TextInput
                      style={styles.appreciationInput}
                      multiline
                      numberOfLines={4}
                      placeholder="Ex : Bon trimestre dans l'ensemble. Kevin fait preuve de sérieux et de rigueur. Il doit cependant améliorer sa participation orale."
                      placeholderTextColor={colors.gray[400]}
                      value={editAppreciation}
                      onChangeText={setEditAppreciation}
                      textAlignVertical="top"
                      maxLength={300}
                    />
                    <Text style={styles.charCount}>{editAppreciation.length}/300</Text>
                  </>
                )
              })()}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 1 },
  triRow:      { flexDirection: 'row', gap: 4 },
  triChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
    backgroundColor: colors.gray[100], borderWidth: 1, borderColor: colors.gray[200],
  },
  triChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  triText:       { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[600] },
  triTextActive: { color: colors.white },

  periodBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: '#eff6ff', borderBottomWidth: 1, borderBottomColor: '#bfdbfe',
  },
  periodText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },

  classStrip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  classTab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, minWidth: 110, alignItems: 'center',
    ...shadow.sm,
  },
  classTabActive:    { backgroundColor: '#312e81', borderColor: '#312e81' },
  classTabName:      { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[700] },
  classTabNameActive:{ color: colors.white },
  classTabSub:       { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 2 },
  classTabSubActive: { color: 'rgba(255,255,255,0.7)' },

  classSummary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: spacing.md, marginVertical: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    ...shadow.sm,
  },
  summaryLeft:     { flex: 1 },
  summaryClassName:{ fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  summaryMeta:     { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  summaryAvg:      { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  progressWrap:    { width: 100, height: 5, backgroundColor: colors.gray[100], borderRadius: radius.full, overflow: 'hidden' },
  progressFill:    { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  progressLabel:   { fontSize: 10, color: colors.gray[400] },

  listContainer: {
    marginHorizontal: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, ...shadow.sm, overflow: 'hidden',
  },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.gray[50],
  },
  studentRowSubmitted: { backgroundColor: colors.gray[50] },
  avatar:      { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 11, fontWeight: fontWeight.bold },
  rankText:    { fontSize: 9, color: colors.gray[400], fontWeight: fontWeight.bold, marginTop: 2 },
  studentName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[800] },
  appreciationPreview: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2, fontStyle: 'italic' },
  appreciationEmpty:   { fontSize: fontSize.xs, color: colors.primary, marginTop: 2 },
  conductPill: {
    alignSelf: 'flex-start', marginTop: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full,
  },
  conductText:    { fontSize: 9, fontWeight: fontWeight.bold },
  avgBig:         { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  avgNone:        { fontSize: fontSize.sm, color: colors.gray[400] },
  mentionPill:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  mentionText:    { fontSize: 9, fontWeight: fontWeight.bold },

  submitWrap: { margin: spacing.md },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 15,
    ...shadow.md,
  },
  submitBtnWarning: { backgroundColor: colors.warning },
  submitBtnText:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.white, textAlign: 'center' },
  submittedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: '#dcfce7', borderRadius: radius.lg, paddingVertical: 14,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  submittedText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.success },

  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle:      { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  modalCancelText: { fontSize: fontSize.base, color: colors.gray[500] },
  modalSaveText:   { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.primary },

  modalStudentCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    ...shadow.sm, marginBottom: spacing.sm,
  },
  modalAvatar:      { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  modalAvatarText:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  modalStudentName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  modalStudentSub:  { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  modalAvgBig:      { fontSize: fontSize.lg, fontWeight: fontWeight.bold },

  modalSection: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[500],
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.xs, marginTop: spacing.md,
  },

  assessmentTable: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  assessmentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: colors.gray[50],
  },
  assessmentTitle: { flex: 1, fontSize: fontSize.xs, color: colors.gray[700] },
  assessmentCoeff: { fontSize: fontSize.xs, color: colors.gray[400], marginHorizontal: spacing.sm },
  assessmentGrade: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, width: 52, textAlign: 'right' },

  conductRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  conductOption: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  conductOptionText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  appreciationHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.md, marginBottom: spacing.xs,
  },
  suggestionToggle: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.semibold },
  aiBtn:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '30' },
  aiBtnText:  { fontSize: fontSize.xs, color: colors.primary, fontWeight: '700' },
  suggestionsRow:   { paddingBottom: spacing.sm, gap: spacing.xs },
  suggestionChip: {
    maxWidth: 220, backgroundColor: '#eff6ff', borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 7,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  suggestionText: { fontSize: fontSize.xs, color: colors.primary, lineHeight: 16 },

  appreciationInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.md,
    fontSize: fontSize.sm, color: colors.gray[900], minHeight: 110, lineHeight: 22,
  },
  charCount: { fontSize: fontSize.xs, color: colors.gray[400], textAlign: 'right', marginTop: 3 },
})
