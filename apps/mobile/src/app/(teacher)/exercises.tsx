/**
 * Exercices — Interface Professeur
 * Voir les soumissions des élèves, photos de solutions, corrections IA
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, SafeAreaView, StatusBar, Image, TextInput, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// ── Types ─────────────────────────────────────────────────────────────────────

type AIPointType = 'ok' | 'warn' | 'error'

interface AICorrection {
  score:   number
  summary: string
  points:  { type: AIPointType; text: string }[]
}

interface Submission {
  id:           string
  studentName:  string
  studentClass: string
  avatarColor:  string
  submittedAt:  string
  photoUri:     string    // URL placeholder (simulated)
  studentNote?: string
  aiCorrection: AICorrection
  teacherNote?: string
  reviewed:     boolean
  grade?:       number
}

interface TeacherExercise {
  id:         string
  subject:    string
  title:      string
  color:      string
  icon:       string
  difficulty: 'Facile' | 'Moyen' | 'Difficile'
  createdAt:  string
  deadline?:  string
  questions:  number
  submissions: Submission[]
}

// ── Données démo ──────────────────────────────────────────────────────────────

const DEMO_EXERCISES: TeacherExercise[] = [
  {
    id: '1',
    subject: 'Mathématiques',
    title: 'Calcul de dérivées — Exercice 1',
    color: '#3b82f6',
    icon: '📐',
    difficulty: 'Moyen',
    createdAt: '10/01/2026',
    deadline: '20/01/2026',
    questions: 3,
    submissions: [
      {
        id: 's1',
        studentName: 'Aminata Bah',
        studentClass: '3ème B',
        avatarColor: '#8b5cf6',
        submittedAt: '12/01/2026 · 14h32',
        photoUri: 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Solution+Aminata',
        studentNote: 'J\'ai eu du mal avec la Q3 sur la règle de la chaîne.',
        aiCorrection: {
          score: 72,
          summary: 'Bonne compréhension générale, quelques erreurs de calcul.',
          points: [
            { type: 'ok',    text: 'Méthode de dérivation terme à terme correcte ✓' },
            { type: 'ok',    text: 'Règle de la chaîne bien identifiée ✓' },
            { type: 'warn',  text: 'Zone d\'ombre : écriture de e^(2x) illisible' },
            { type: 'error', text: 'Erreur : (-5)\' écrit comme -5 au lieu de 0' },
            { type: 'warn',  text: 'Développement intermédiaire manquant Q3' },
          ],
        },
        reviewed: false,
      },
      {
        id: 's2',
        studentName: 'Mamadou Diallo',
        studentClass: '3ème B',
        avatarColor: '#f43f5e',
        submittedAt: '11/01/2026 · 16h15',
        photoUri: 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Solution+Mamadou',
        aiCorrection: {
          score: 95,
          summary: 'Excellent travail ! Toutes les dérivées sont correctement calculées.',
          points: [
            { type: 'ok', text: 'Dérivée de f(x) = x³+2x-5 : 3x²+2 ✓' },
            { type: 'ok', text: 'Dérivée de sin(x) : cos(x) ✓' },
            { type: 'ok', text: 'Règle de la chaîne sur e^(2x) : 2e^(2x) ✓' },
            { type: 'ok', text: 'Présentation claire et aérée ✓' },
          ],
        },
        reviewed: true,
        grade: 19,
        teacherNote: 'Excellent ! Continue comme ça.',
      },
      {
        id: 's3',
        studentName: 'Fatoumata Camara',
        studentClass: '3ème B',
        avatarColor: '#10b981',
        submittedAt: '13/01/2026 · 09h47',
        photoUri: 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Solution+Fatoumata',
        studentNote: 'Je ne suis pas sûre de ma réponse Q2.',
        aiCorrection: {
          score: 58,
          summary: 'Des efforts visibles mais la règle de dérivation n\'est pas encore maîtrisée.',
          points: [
            { type: 'ok',    text: 'Q1 correcte : 3x²+2 ✓' },
            { type: 'error', text: 'Q2 incorrecte : dérivée de sin(x) écrite comme -cos(x)' },
            { type: 'error', text: 'Q3 incorrecte : e^(2x) non modifié' },
            { type: 'warn',  text: 'Règle de la chaîne à retravailler' },
          ],
        },
        reviewed: false,
      },
    ],
  },
  {
    id: '2',
    subject: 'Mathématiques',
    title: 'Fonctions affines — Révisions',
    color: '#3b82f6',
    icon: '📊',
    difficulty: 'Facile',
    createdAt: '05/01/2026',
    deadline: '15/01/2026',
    questions: 4,
    submissions: [
      {
        id: 's4',
        studentName: 'Ibrahima Sow',
        studentClass: '3ème B',
        avatarColor: '#f59e0b',
        submittedAt: '08/01/2026 · 11h20',
        photoUri: 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Solution+Ibrahima',
        aiCorrection: {
          score: 88,
          summary: 'Bonne maîtrise des fonctions affines. Une petite erreur de signe.',
          points: [
            { type: 'ok',    text: 'Pente et ordonnée à l\'origine correctes ✓' },
            { type: 'error', text: 'Erreur de signe sur la Q3 : f(x) = -2x+3 noté 2x+3' },
            { type: 'ok',    text: 'Graphique bien tracé ✓' },
          ],
        },
        reviewed: true,
        grade: 17,
        teacherNote: 'Attention aux signes négatifs !',
      },
    ],
  },
]

// ── Composants ────────────────────────────────────────────────────────────────

function AIPointIcon({ type }: { type: AIPointType }) {
  return <Text style={{ fontSize: 13 }}>{type === 'ok' ? '✅' : type === 'warn' ? '⚠️' : '❌'}</Text>
}

function SubmissionModal({
  submission, exercise, onClose, onReviewed,
}: {
  submission: Submission | null
  exercise:   TeacherExercise | null
  onClose:    () => void
  onReviewed: (note: string, grade: number | undefined) => void
}) {
  const [note,    setNote]    = useState(submission?.teacherNote ?? '')
  const [grade,   setGrade]   = useState(submission?.grade?.toString() ?? '')
  const [saving,  setSaving]  = useState(false)

  if (!submission || !exercise) return null

  const ai = submission.aiCorrection

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    onReviewed(note, grade ? Number(grade) : undefined)
    setSaving(false)
    Alert.alert('✅ Correction enregistrée', 'L\'élève sera notifié de votre retour.')
    onClose()
  }

  const scoreColor = ai.score >= 80 ? colors.success : ai.score >= 60 ? '#F59E0B' : colors.error

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={[styles.mHead, { borderLeftWidth: 4, borderLeftColor: exercise.color }]}>
          <TouchableOpacity onPress={onClose} style={styles.mClose}>
            <Ionicons name="close" size={22} color={colors.gray[600]} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.mTitle}>Solution de {submission.studentName}</Text>
            <Text style={styles.mSub}>{submission.studentClass} · {submission.submittedAt}</Text>
          </View>
          {submission.reviewed && (
            <View style={styles.mReviewedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.mReviewedText}>Corrigé</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>

          {/* Photo de la solution */}
          <View style={styles.photoSection}>
            <Text style={styles.sectionLabel}>📸 Solution manuscrite</Text>
            <View style={styles.photoWrapper}>
              <Image
                source={{ uri: submission.photoUri }}
                style={styles.solutionPhoto}
                resizeMode="cover"
              />
              <View style={styles.photoOverlay}>
                <Ionicons name="expand-outline" size={20} color={colors.white} />
              </View>
            </View>
            {submission.studentNote && (
              <View style={styles.studentNoteBox}>
                <Ionicons name="chatbubble-outline" size={13} color={colors.gray[400]} />
                <Text style={styles.studentNoteText}>
                  <Text style={{ fontWeight: fontWeight.semibold }}>Note élève : </Text>
                  {submission.studentNote}
                </Text>
              </View>
            )}
          </View>

          {/* Correction IA */}
          <View style={styles.aiSection}>
            <View style={styles.aiSectionHeader}>
              <Text style={styles.sectionLabel}>🤖 Pré-correction IA</Text>
              <View style={[styles.aiScoreBadge, { backgroundColor: scoreColor + '20' }]}>
                <Text style={[styles.aiScoreText, { color: scoreColor }]}>Score IA : {ai.score}/100</Text>
              </View>
            </View>

            {/* Barre score */}
            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarFill, { width: `${ai.score}%` as any, backgroundColor: scoreColor }]} />
            </View>

            <Text style={styles.aiSummary}>{ai.summary}</Text>

            <View style={styles.aiPoints}>
              {ai.points.map((p, i) => (
                <View key={i} style={[styles.aiPoint, {
                  backgroundColor: p.type === 'ok' ? '#f0fdf4' : p.type === 'warn' ? '#fffbeb' : '#fef2f2',
                }]}>
                  <AIPointIcon type={p.type} />
                  <Text style={[styles.aiPointText, {
                    color: p.type === 'ok' ? '#15803d' : p.type === 'warn' ? '#92400e' : '#dc2626',
                  }]}>{p.text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.aiDisclaimer}>
              <Ionicons name="information-circle-outline" size={13} color={colors.gray[400]} />
              <Text style={styles.aiDisclaimerText}>La correction IA est indicative. Votre retour final prévaut.</Text>
            </View>
          </View>

          {/* Retour du professeur */}
          <View style={styles.teacherSection}>
            <Text style={styles.sectionLabel}>✏️ Votre correction</Text>

            {/* Note /20 */}
            <View style={styles.gradeRow}>
              <Text style={styles.gradeLabel}>Note sur 20</Text>
              <View style={styles.gradeInputWrap}>
                <TextInput
                  style={styles.gradeInput}
                  value={grade}
                  onChangeText={t => {
                    const n = Number(t)
                    if (t === '' || (n >= 0 && n <= 20)) setGrade(t)
                  }}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={colors.gray[400]}
                  maxLength={4}
                />
                <Text style={styles.gradeSuffix}>/20</Text>
              </View>
            </View>

            {/* Commentaire */}
            <Text style={styles.noteLabel}>Commentaire pour l'élève</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Ex: Bien joué ! Attention à la règle de la chaîne..."
              placeholderTextColor={colors.gray[400]}
              multiline
              maxLength={500}
            />

            {/* Bouton sauvegarder */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-circle-outline'} size={18} color={colors.white} />
              <Text style={styles.saveBtnText}>
                {saving ? 'Enregistrement...' : submission.reviewed ? 'Mettre à jour' : 'Valider la correction'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Écran principal professeur ────────────────────────────────────────────────

export default function TeacherExercisesScreen() {
  const [exercises,    setExercises]    = useState<TeacherExercise[]>(DEMO_EXERCISES)
  const [selExercise,  setSelExercise]  = useState<TeacherExercise | null>(null)
  const [selSub,       setSelSub]       = useState<Submission | null>(null)
  const [subModalEx,   setSubModalEx]   = useState<TeacherExercise | null>(null)

  // Ouvrir la liste des soumissions d'un exercice
  const openSubmissions = (ex: TeacherExercise) => {
    setSelExercise(ex)
  }

  // Ouvrir la correction d'une soumission
  const openSubmission = (sub: Submission, ex: TeacherExercise) => {
    setSelSub(sub)
    setSubModalEx(ex)
  }

  // Enregistrer la correction du prof
  const handleReviewed = (exerciseId: string, subId: string, note: string, grade: number | undefined) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex
      return {
        ...ex,
        submissions: ex.submissions.map(s => {
          if (s.id !== subId) return s
          return { ...s, reviewed: true, teacherNote: note, grade }
        }),
      }
    }))
    if (selExercise?.id === exerciseId) {
      setSelExercise(prev => prev ? {
        ...prev,
        submissions: prev.submissions.map(s =>
          s.id === subId ? { ...s, reviewed: true, teacherNote: note, grade } : s
        ),
      } : null)
    }
  }

  const totalSubmissions = exercises.reduce((s, ex) => s + ex.submissions.length, 0)
  const pendingReview    = exercises.reduce((s, ex) => s + ex.submissions.filter(sub => !sub.reviewed).length, 0)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>✏️ Mes Exercices</Text>
          <Text style={styles.headerSub}>Soumissions & Corrections des élèves</Text>
        </View>
        {pendingReview > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingReview} à corriger</Text>
          </View>
        )}
      </View>

      {/* Vue liste exercices */}
      {!selExercise ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Stats globales */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{exercises.length}</Text>
              <Text style={styles.statLabel}>Exercices</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{totalSubmissions}</Text>
              <Text style={styles.statLabel}>Soumissions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, { color: pendingReview > 0 ? colors.error : colors.success }]}>{pendingReview}</Text>
              <Text style={styles.statLabel}>À corriger</Text>
            </View>
          </View>

          {/* Alerte corrections en attente */}
          {pendingReview > 0 && (
            <View style={styles.alertBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.alertText}>
                {pendingReview} soumission{pendingReview > 1 ? 's' : ''} en attente de correction
              </Text>
            </View>
          )}

          {/* Liste exercices */}
          <Text style={styles.sectionTitle}>Mes exercices</Text>
          {exercises.map(ex => {
            const pending  = ex.submissions.filter(s => !s.reviewed).length
            const reviewed = ex.submissions.filter(s => s.reviewed).length
            const avgAI    = ex.submissions.length > 0
              ? Math.round(ex.submissions.reduce((s, sub) => s + sub.aiCorrection.score, 0) / ex.submissions.length)
              : null

            return (
              <TouchableOpacity
                key={ex.id}
                style={styles.exerciseCard}
                onPress={() => openSubmissions(ex)}
                activeOpacity={0.75}
              >
                <View style={[styles.exerciseStripe, { backgroundColor: ex.color }]} />
                <View style={styles.exerciseIcon}>
                  <Text style={{ fontSize: 22 }}>{ex.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseSubject}>{ex.subject}</Text>
                  <Text style={styles.exerciseTitle}>{ex.title}</Text>
                  <View style={styles.exerciseMeta}>
                    <Ionicons name="people-outline" size={11} color={colors.gray[400]} />
                    <Text style={styles.exerciseMetaText}>{ex.submissions.length} soumissions</Text>
                    {ex.deadline && (
                      <>
                        <Text style={styles.exerciseMetaText}>·</Text>
                        <Ionicons name="time-outline" size={11} color={colors.gray[400]} />
                        <Text style={styles.exerciseMetaText}>Limite : {ex.deadline}</Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={styles.exerciseRight}>
                  {pending > 0 && (
                    <View style={styles.pendingPill}>
                      <Text style={styles.pendingPillText}>{pending} 🔴</Text>
                    </View>
                  )}
                  {reviewed > 0 && pending === 0 && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  )}
                  {avgAI !== null && (
                    <Text style={styles.avgAIText}>IA: {avgAI}%</Text>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={colors.gray[300]} />
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      ) : (
        /* Vue soumissions d'un exercice */
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
          {/* Sous-header */}
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setSelExercise(null)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.subHeaderTitle} numberOfLines={1}>{selExercise.icon} {selExercise.title}</Text>
              <Text style={styles.subHeaderSub}>{selExercise.submissions.length} soumission{selExercise.submissions.length > 1 ? 's' : ''}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {selExercise.submissions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>📭</Text>
                <Text style={styles.emptyStateText}>Aucune soumission pour le moment</Text>
                <Text style={styles.emptyStateSub}>Les élèves peuvent soumettre leurs solutions photo depuis l'app</Text>
              </View>
            ) : (
              selExercise.submissions.map(sub => {
                const ai = sub.aiCorrection
                const scoreColor = ai.score >= 80 ? colors.success : ai.score >= 60 ? '#F59E0B' : colors.error
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={styles.submissionCard}
                    onPress={() => openSubmission(sub, selExercise)}
                    activeOpacity={0.75}
                  >
                    {/* Avatar + infos élève */}
                    <View style={styles.submissionTop}>
                      <View style={[styles.avatar, { backgroundColor: sub.avatarColor + '20' }]}>
                        <Text style={[styles.avatarText, { color: sub.avatarColor }]}>
                          {sub.studentName.charAt(0)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{sub.studentName}</Text>
                        <Text style={styles.studentMeta}>{sub.studentClass} · {sub.submittedAt}</Text>
                      </View>
                      {sub.reviewed
                        ? <View style={styles.reviewedBadge}><Ionicons name="checkmark-circle" size={14} color={colors.success} /><Text style={styles.reviewedText}>Corrigé</Text></View>
                        : <View style={styles.pendingBadge2}><Ionicons name="time" size={12} color={colors.error} /><Text style={styles.pendingText}>En attente</Text></View>
                      }
                    </View>

                    {/* Photo miniature + AI score */}
                    <View style={styles.submissionBody}>
                      <Image source={{ uri: sub.photoUri }} style={styles.thumbPhoto} resizeMode="cover" />
                      <View style={styles.submissionInfo}>
                        {/* AI score */}
                        <View style={styles.aiScoreRow}>
                          <Text style={styles.aiScoreLabel}>Score IA</Text>
                          <View style={[styles.aiScorePill, { backgroundColor: scoreColor + '20' }]}>
                            <Text style={[styles.aiScorePillText, { color: scoreColor }]}>{ai.score}/100</Text>
                          </View>
                        </View>

                        {/* Mini barre */}
                        <View style={styles.miniBar}>
                          <View style={[styles.miniBarFill, { width: `${ai.score}%` as any, backgroundColor: scoreColor }]} />
                        </View>

                        {/* Points IA résumé */}
                        <View style={styles.aiPointsMini}>
                          {ai.points.slice(0, 2).map((p, i) => (
                            <View key={i} style={styles.aiPointMini}>
                              <Text style={{ fontSize: 10 }}>{p.type === 'ok' ? '✅' : p.type === 'warn' ? '⚠️' : '❌'}</Text>
                              <Text style={styles.aiPointMiniText} numberOfLines={1}>{p.text}</Text>
                            </View>
                          ))}
                          {ai.points.length > 2 && (
                            <Text style={styles.aiPointMore}>+{ai.points.length - 2} autres points...</Text>
                          )}
                        </View>

                        {/* Note du prof */}
                        {sub.grade !== undefined && (
                          <View style={styles.gradeDisplay}>
                            <Text style={styles.gradeDisplayText}>Note : </Text>
                            <Text style={[styles.gradeDisplayVal, { color: sub.grade >= 14 ? colors.success : sub.grade >= 10 ? '#F59E0B' : colors.error }]}>
                              {sub.grade}/20
                            </Text>
                          </View>
                        )}

                        {/* Commentaire prof */}
                        {sub.teacherNote && (
                          <View style={styles.teacherNotePreview}>
                            <Ionicons name="create-outline" size={11} color={colors.primary} />
                            <Text style={styles.teacherNoteText} numberOfLines={1}>{sub.teacherNote}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Note élève */}
                    {sub.studentNote && (
                      <View style={styles.studentNoteMini}>
                        <Ionicons name="chatbubble-outline" size={11} color={colors.gray[400]} />
                        <Text style={styles.studentNoteMiniText} numberOfLines={1}>"{sub.studentNote}"</Text>
                      </View>
                    )}

                    <View style={styles.submissionFooter}>
                      <Text style={[styles.correctionCTA, { color: sub.reviewed ? colors.success : colors.primary }]}>
                        {sub.reviewed ? '✓ Voir la correction' : '→ Corriger maintenant'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })
            )}
          </ScrollView>
        </SafeAreaView>
      )}

      {/* Modal correction */}
      <SubmissionModal
        submission={selSub}
        exercise={subModalEx}
        onClose={() => { setSelSub(null); setSubModalEx(null) }}
        onReviewed={(note, grade) => {
          if (selSub && subModalEx) {
            handleReviewed(subModalEx.id, selSub.id, note, grade)
          }
        }}
      />
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  scroll:      { padding: spacing.md, gap: spacing.sm, paddingBottom: 40 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  pendingBadge:{ backgroundColor: colors.error, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  pendingBadgeText:{ fontSize: fontSize.xs, color: colors.white, fontWeight: fontWeight.bold },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadow.sm },
  statVal:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  statLabel:{ fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FEF2F2', borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: '#FECACA' },
  alertText:   { flex: 1, fontSize: fontSize.xs, color: colors.error, fontWeight: fontWeight.medium },

  sectionTitle:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[700], marginTop: 4 },

  exerciseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  exerciseStripe:{ width: 4, alignSelf: 'stretch' },
  exerciseIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  exerciseSubject:{ fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },
  exerciseTitle:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800], marginVertical: 2 },
  exerciseMeta:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exerciseMetaText:{ fontSize: fontSize.xs, color: colors.gray[400] },
  exerciseRight:  { paddingRight: spacing.sm, alignItems: 'center', gap: 4 },
  pendingPill:    { backgroundColor: '#FEF2F2', borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  pendingPillText:{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.error },
  avgAIText:      { fontSize: 10, color: colors.gray[500] },

  subHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  backBtn:       { padding: spacing.xs },
  subHeaderTitle:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  subHeaderSub:  { fontSize: fontSize.xs, color: colors.gray[500] },

  emptyState:    { alignItems: 'center', paddingVertical: 40, gap: spacing.sm },
  emptyStateText:{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.gray[700] },
  emptyStateSub: { fontSize: fontSize.xs, color: colors.gray[400], textAlign: 'center' },

  // Submission card
  submissionCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  submissionTop:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar:         { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  studentName:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  studentMeta:    { fontSize: fontSize.xs, color: colors.gray[500] },
  reviewedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.success + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  reviewedText:   { fontSize: 10, color: colors.success, fontWeight: fontWeight.semibold },
  pendingBadge2:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.error + '12', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  pendingText:    { fontSize: 10, color: colors.error, fontWeight: fontWeight.semibold },

  submissionBody: { flexDirection: 'row', gap: spacing.sm },
  thumbPhoto:     { width: 100, height: 90, borderRadius: radius.md, backgroundColor: colors.gray[100] },
  submissionInfo: { flex: 1, gap: 5 },
  aiScoreRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  aiScoreLabel:   { fontSize: fontSize.xs, color: colors.gray[500] },
  aiScorePill:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  aiScorePillText:{ fontSize: 10, fontWeight: fontWeight.bold },
  miniBar:        { height: 5, backgroundColor: colors.gray[100], borderRadius: 3, overflow: 'hidden' },
  miniBarFill:    { height: '100%', borderRadius: 3 },
  aiPointsMini:   { gap: 3 },
  aiPointMini:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiPointMiniText:{ fontSize: 10, color: colors.gray[600], flex: 1 },
  aiPointMore:    { fontSize: 10, color: colors.gray[400], fontStyle: 'italic' },
  gradeDisplay:   { flexDirection: 'row', alignItems: 'center' },
  gradeDisplayText:{ fontSize: fontSize.xs, color: colors.gray[500] },
  gradeDisplayVal: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  teacherNotePreview:{ flexDirection: 'row', alignItems: 'center', gap: 3 },
  teacherNoteText:   { fontSize: 10, color: colors.primary, flex: 1 },

  studentNoteMini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gray[50], borderRadius: radius.sm, padding: 6 },
  studentNoteMiniText:{ fontSize: 10, color: colors.gray[600], flex: 1, fontStyle: 'italic' },

  submissionFooter:{ borderTopWidth: 1, borderTopColor: colors.gray[100], paddingTop: spacing.xs, alignItems: 'flex-end' },
  correctionCTA:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  // Modal
  mHead:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  mClose:    { padding: spacing.xs },
  mTitle:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  mSub:      { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  mReviewedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  mReviewedText: { fontSize: 10, color: colors.success, fontWeight: fontWeight.bold },

  sectionLabel:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[800], marginBottom: 8 },

  photoSection:  { gap: spacing.sm },
  photoWrapper:  { position: 'relative' },
  solutionPhoto: { width: '100%', height: 260, borderRadius: radius.lg, backgroundColor: colors.gray[100] },
  photoOverlay:  { position: 'absolute', bottom: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center' },
  studentNoteBox:{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, backgroundColor: colors.gray[50], borderRadius: radius.sm, padding: spacing.sm },
  studentNoteText:{ flex: 1, fontSize: fontSize.xs, color: colors.gray[600], lineHeight: 16 },

  aiSection:      { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  aiSectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiScoreBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  aiScoreText:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  scoreBar:       { height: 8, backgroundColor: colors.gray[100], borderRadius: radius.full, overflow: 'hidden' },
  scoreBarFill:   { height: '100%', borderRadius: radius.full },
  aiSummary:      { fontSize: fontSize.xs, color: colors.gray[600], lineHeight: 16 },
  aiPoints:       { gap: spacing.xs },
  aiPoint:        { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.sm, padding: spacing.sm },
  aiPointText:    { flex: 1, fontSize: fontSize.xs, lineHeight: 16 },
  aiDisclaimer:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiDisclaimerText:{ fontSize: 10, color: colors.gray[400], fontStyle: 'italic', flex: 1 },

  teacherSection: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  gradeRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gradeLabel:     { fontSize: fontSize.sm, color: colors.gray[700], fontWeight: fontWeight.medium },
  gradeInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gray[50], borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray[200], paddingHorizontal: spacing.sm },
  gradeInput:     { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary, width: 50, textAlign: 'center', paddingVertical: 6 },
  gradeSuffix:    { fontSize: fontSize.sm, color: colors.gray[400] },
  noteLabel:      { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },
  noteInput:      { backgroundColor: colors.gray[50], borderRadius: radius.md, padding: spacing.sm, fontSize: fontSize.sm, color: colors.gray[800], borderWidth: 1, borderColor: colors.gray[200], minHeight: 90, textAlignVertical: 'top' },
  saveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.success, borderRadius: radius.lg, padding: spacing.md },
  saveBtnText:    { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
})
