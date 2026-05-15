/**
 * Exercices — Interface élève
 * QCM + Vrai/Faux + soumission photo de solution manuscrite + correction IA
 */
import { useState, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, StatusBar, Image, ActivityIndicator,
  Alert, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { AIChat } from '@/components/ui/AIChat'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Option    { label: string; correct: boolean }
interface Question  { id: string; type: 'mcq' | 'truefalse'; text: string; options: Option[]; hint?: string; explanation: string }
interface Exercise  {
  id: string; subject: string; title: string; teacher: string
  color: string; icon: string; difficulty: 'Facile' | 'Moyen' | 'Difficile'
  duration: string; questions: Question[]
  completed?: boolean; score?: number
  submitted?: boolean   // photo solution soumise
  submittedAt?: string
}

type SubmissionStatus = 'idle' | 'picking' | 'analyzing' | 'done'

interface AICorrection {
  score: number
  summary: string
  points: { type: 'ok' | 'warn' | 'error'; text: string }[]
}

// ── Données démo ──────────────────────────────────────────────────────────────

const INITIAL_EXERCISES: Exercise[] = [
  {
    id: '1', subject: 'Mathématiques', title: 'Calcul de dérivées — Exercice 1',
    teacher: 'M. Leblanc', color: '#3b82f6', icon: '📐',
    difficulty: 'Moyen', duration: '20 min',
    questions: [
      { id: 'q1', type: 'mcq', text: 'Quelle est la dérivée de f(x) = x³ + 2x - 5 ?',
        options: [{ label: '3x² + 2', correct: true }, { label: '3x² - 5', correct: false }, { label: 'x² + 2', correct: false }, { label: '3x + 2', correct: false }],
        hint: 'Dérive terme par terme', explanation: 'On dérive terme par terme : (x³)\' = 3x², (2x)\' = 2, (-5)\' = 0. Donc f\'(x) = 3x² + 2.' },
      { id: 'q2', type: 'truefalse', text: 'La dérivée de sin(x) est -cos(x).',
        options: [{ label: 'Vrai', correct: false }, { label: 'Faux', correct: true }],
        explanation: 'Faux ! La dérivée de sin(x) est cos(x). C\'est la dérivée de cos(x) qui est -sin(x).' },
      { id: 'q3', type: 'mcq', text: 'Si f(x) = e^(2x), alors f\'(x) = ?',
        options: [{ label: 'e^(2x)', correct: false }, { label: '2e^(2x)', correct: true }, { label: 'e^(2x-1)', correct: false }, { label: '2xe^(2x)', correct: false }],
        hint: 'Règle de composition : (f∘g)\' = g\'·(f\'∘g)', explanation: 'Par la règle de la chaîne : f\'(x) = 2 × e^(2x) car (2x)\' = 2.' },
    ],
  },
  {
    id: '2', subject: 'Physique-Chimie', title: 'Les forces — QCM',
    teacher: 'M. Traoré', color: '#f43f5e', icon: '⚡',
    difficulty: 'Facile', duration: '15 min',
    questions: [
      { id: 'q1', type: 'mcq', text: 'Un objet de masse 5 kg est soumis à une force de 20 N. Quelle est son accélération ?',
        options: [{ label: '100 m/s²', correct: false }, { label: '4 m/s²', correct: true }, { label: '25 m/s²', correct: false }, { label: '15 m/s²', correct: false }],
        hint: 'F = m × a', explanation: 'D\'après F = m × a : a = F/m = 20/5 = 4 m/s².' },
      { id: 'q2', type: 'truefalse', text: 'Selon le principe d\'inertie, un objet en mouvement s\'arrête tout seul sans force extérieure.',
        options: [{ label: 'Vrai', correct: false }, { label: 'Faux', correct: true }],
        explanation: 'Faux ! Le principe d\'inertie dit qu\'un objet continue son mouvement rectiligne uniforme sans force.' },
    ],
    completed: true, score: 85,
  },
  {
    id: '3', subject: 'Français', title: 'Connecteurs logiques — Application',
    teacher: 'Mme Diallo', color: '#8b5cf6', icon: '✍️',
    difficulty: 'Facile', duration: '10 min',
    questions: [
      { id: 'q1', type: 'mcq', text: 'Quel connecteur exprime une OPPOSITION ?',
        options: [{ label: 'De plus', correct: false }, { label: 'Cependant', correct: true }, { label: 'Ainsi', correct: false }, { label: 'Car', correct: false }],
        explanation: '"Cependant" exprime une opposition. "De plus" = addition, "Ainsi" = conséquence, "Car" = cause.' },
      { id: 'q2', type: 'mcq', text: '"La pollution augmente, ___ les températures montent." Quel connecteur ?',
        options: [{ label: 'néanmoins', correct: false }, { label: 'c\'est pourquoi', correct: true }, { label: 'pourtant', correct: false }, { label: 'or', correct: false }],
        explanation: '"C\'est pourquoi" exprime la conséquence logique.' },
    ],
  },
  {
    id: '4', subject: 'SVT', title: 'L\'ADN — Structure et rôle',
    teacher: 'M. Koné', color: '#10b981', icon: '🧬',
    difficulty: 'Difficile', duration: '25 min',
    questions: [
      { id: 'q1', type: 'truefalse', text: 'L\'ADN est composé de deux brins antiparallèles reliés par des liaisons hydrogène.',
        options: [{ label: 'Vrai', correct: true }, { label: 'Faux', correct: false }],
        explanation: 'Vrai ! La double hélice de Watson et Crick est formée de 2 brins antiparallèles reliés par des liaisons H entre bases complémentaires.' },
      { id: 'q2', type: 'mcq', text: 'Quelle base est complémentaire de la cytosine (C) dans l\'ADN ?',
        options: [{ label: 'Adénine (A)', correct: false }, { label: 'Thymine (T)', correct: false }, { label: 'Guanine (G)', correct: true }, { label: 'Uracile (U)', correct: false }],
        explanation: 'C s\'apparie avec G par 3 liaisons hydrogène. A s\'apparie avec T par 2 liaisons H.' },
    ],
  },
]

// ── Simulation IA correction photo ───────────────────────────────────────────

function generateAICorrection(exerciseId: string): AICorrection {
  const corrections: Record<string, AICorrection> = {
    '1': {
      score: 72,
      summary: 'Bonne compréhension générale des dérivées, mais quelques erreurs de calcul détectées.',
      points: [
        { type: 'ok',    text: 'Méthode de dérivation term à term correcte ✓' },
        { type: 'ok',    text: 'Règle de la chaîne bien appliquée ✓' },
        { type: 'warn',  text: 'Zone d\'ombre : écriture de e^(2x) difficile à lire' },
        { type: 'error', text: 'Erreur sur la constante : (-5)\' = 0, pas -5' },
        { type: 'warn',  text: 'Développement intermédiaire manquant pour Q3' },
      ],
    },
    '3': {
      score: 90,
      summary: 'Excellent travail ! Les connecteurs logiques sont bien maîtrisés.',
      points: [
        { type: 'ok',   text: 'Distinction opposition / conséquence correcte ✓' },
        { type: 'ok',   text: 'Exemples personnels pertinents ✓' },
        { type: 'ok',   text: 'Orthographe soignée ✓' },
        { type: 'warn', text: 'Justification de Q2 un peu courte' },
      ],
    },
    '4': {
      score: 65,
      summary: 'Des notions de base acquises, mais la structure de l\'ADN mérite d\'être approfondie.',
      points: [
        { type: 'ok',    text: 'Double hélice antiparallèle bien décrite ✓' },
        { type: 'error', text: 'Erreur : A-T et G-C confondus dans le schéma' },
        { type: 'warn',  text: 'Le schéma est difficile à lire (qualité écriture)' },
        { type: 'error', text: 'Nombre de liaisons hydrogène inversé' },
        { type: 'ok',    text: 'Rôle de l\'ADN bien mentionné ✓' },
      ],
    },
  }
  return corrections[exerciseId] ?? {
    score: 80,
    summary: 'Solution analysée. Bonne approche générale avec quelques points à améliorer.',
    points: [
      { type: 'ok',   text: 'Méthode générale correcte ✓' },
      { type: 'warn', text: 'Vérifier les calculs intermédiaires' },
      { type: 'ok',   text: 'Présentation soignée ✓' },
    ],
  }
}

// ── Composant : Soumission Photo ──────────────────────────────────────────────

function SubmissionPanel({
  exercise, onSubmitted,
}: { exercise: Exercise; onSubmitted: (uri: string, correction: AICorrection, note: string) => void }) {
  const [status,     setStatus]     = useState<SubmissionStatus>('idle')
  const [photoUri,   setPhotoUri]   = useState<string | null>(null)
  const [correction, setCorrection] = useState<AICorrection | null>(null)
  const [note,       setNote]       = useState('')

  const pickImage = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) { Alert.alert('Permission refusée', 'Autorisez l\'accès à la caméra.'); return }
        result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false })
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) { Alert.alert('Permission refusée', 'Autorisez l\'accès à la galerie.'); return }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
      }
      if (result.canceled || !result.assets?.[0]) return
      const uri = result.assets[0].uri
      setPhotoUri(uri)
      setStatus('analyzing')
      // Simulation correction IA (1.5–2.5s)
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000))
      const corr = generateAICorrection(exercise.id)
      setCorrection(corr)
      setStatus('done')
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la photo.')
      setStatus('idle')
    }
  }

  if (exercise.submitted) {
    return (
      <View style={styles.submittedBanner}>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.submittedTitle}>Solution soumise ✓</Text>
          <Text style={styles.submittedSub}>Le professeur a été notifié. {exercise.submittedAt}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.submissionPanel}>
      <View style={styles.submissionHeader}>
        <Ionicons name="camera" size={18} color={colors.primary} />
        <Text style={styles.submissionTitle}>Soumettre ma solution manuscrite</Text>
      </View>
      <Text style={styles.submissionSub}>
        Prends en photo ta solution écrite sur papier. L'IA la corrige et ton professeur peut la consulter.
      </Text>

      {/* IDLE — Boutons choix source */}
      {status === 'idle' && !photoUri && (
        <View style={styles.pickRow}>
          <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(true)}>
            <Ionicons name="camera-outline" size={22} color={colors.primary} />
            <Text style={styles.pickBtnText}>Prendre une photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(false)}>
            <Ionicons name="image-outline" size={22} color={colors.primary} />
            <Text style={styles.pickBtnText}>Depuis la galerie</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ANALYZING */}
      {status === 'analyzing' && (
        <View style={styles.analyzingBox}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.photoPreviewSmall} />}
          <View style={styles.analyzingInfo}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.analyzingText}>L'IA analyse ta solution...</Text>
          </View>
        </View>
      )}

      {/* DONE — Correction IA */}
      {status === 'done' && correction && photoUri && (
        <View style={styles.correctionWrap}>
          {/* Photo */}
          <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          <TouchableOpacity style={styles.retakeBtn} onPress={() => { setPhotoUri(null); setCorrection(null); setStatus('idle') }}>
            <Ionicons name="refresh" size={14} color={colors.primary} />
            <Text style={styles.retakeBtnText}>Reprendre</Text>
          </TouchableOpacity>

          {/* Résultat IA */}
          <View style={styles.aiResultCard}>
            <View style={styles.aiResultHeader}>
              <Text style={styles.aiResultTitle}>🤖 Correction IA</Text>
              <View style={[styles.aiScoreBadge, { backgroundColor: correction.score >= 80 ? colors.success + '20' : correction.score >= 60 ? '#F59E0B20' : colors.error + '20' }]}>
                <Text style={[styles.aiScoreText, { color: correction.score >= 80 ? colors.success : correction.score >= 60 ? '#F59E0B' : colors.error }]}>
                  {correction.score}/100
                </Text>
              </View>
            </View>
            <Text style={styles.aiSummary}>{correction.summary}</Text>
            <View style={styles.aiPoints}>
              {correction.points.map((p, i) => (
                <View key={i} style={styles.aiPoint}>
                  <Text style={styles.aiPointIcon}>
                    {p.type === 'ok' ? '✅' : p.type === 'warn' ? '⚠️' : '❌'}
                  </Text>
                  <Text style={[
                    styles.aiPointText,
                    { color: p.type === 'ok' ? colors.success : p.type === 'warn' ? '#92400E' : colors.error },
                  ]}>{p.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Note optionnelle */}
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Ajouter un commentaire au prof (optionnel)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Ex: J'ai eu du mal avec la Q3..."
              placeholderTextColor={colors.gray[400]}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
            />
          </View>

          {/* Bouton soumettre */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => onSubmitted(photoUri, correction, note)}
          >
            <Ionicons name="send" size={16} color={colors.white} />
            <Text style={styles.submitBtnText}>Envoyer au professeur</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── Modal exercice ────────────────────────────────────────────────────────────

function ExerciseModal({
  exercise, onClose, onUpdate,
}: {
  exercise: Exercise | null
  onClose: () => void
  onUpdate: (updated: Exercise) => void
}) {
  const [qIndex,     setQIndex]     = useState(0)
  const [answers,    setAnswers]    = useState<Record<string, string>>({})
  const [showResult, setShowResult] = useState(false)
  const [activeTab,  setActiveTab]  = useState<'quiz' | 'photo' | 'ai'>('quiz')
  const [showHint,   setShowHint]   = useState(false)

  if (!exercise) return null

  const q       = exercise.questions[qIndex]
  const total   = exercise.questions.length
  const done    = Object.keys(answers).length
  const correct = exercise.questions.filter(q => {
    const sel = answers[q.id]
    return sel && q.options.find(o => o.label === sel)?.correct
  }).length
  const score = Math.round((correct / total) * 100)

  const select = (label: string) => {
    if (showResult) return
    setAnswers(prev => ({ ...prev, [q.id]: label }))
    setTimeout(() => {
      if (qIndex < total - 1) { setQIndex(i => i + 1); setShowHint(false) }
      else setShowResult(true)
    }, 800)
  }

  const handleSubmitted = (uri: string, correction: AICorrection, note: string) => {
    const updated: Exercise = {
      ...exercise,
      submitted: true,
      submittedAt: new Date().toLocaleString('fr', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    }
    onUpdate(updated)
    Alert.alert('✅ Envoyé !', `Ta solution a été soumise au professeur.\nScore IA : ${correction.score}/100`)
  }

  const TABS = [
    { key: 'quiz',  label: 'Quiz',       icon: 'pencil-outline'  as const },
    { key: 'photo', label: 'Ma solution', icon: 'camera-outline'  as const },
    { key: 'ai',    label: 'Aide IA',    icon: 'chatbubble-ellipses-outline' as const },
  ]

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderLeftWidth: 4, borderLeftColor: exercise.color }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={colors.gray[600]} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle} numberOfLines={1}>{exercise.icon} {exercise.title}</Text>
            <Text style={styles.modalSub}>{exercise.teacher} · {exercise.subject}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.modalTabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.modalTab, activeTab === t.key && styles.modalTabActive]}
              onPress={() => setActiveTab(t.key as any)}
            >
              <Ionicons name={t.icon} size={15} color={activeTab === t.key ? colors.primary : colors.gray[400]} />
              <Text style={[styles.modalTabLabel, activeTab === t.key && styles.modalTabLabelActive]}>{t.label}</Text>
              {t.key === 'photo' && exercise.submitted && (
                <View style={styles.submittedDot} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TAB QUIZ ── */}
        {activeTab === 'quiz' && (
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
            {!showResult ? (
              <>
                {/* Progression */}
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Question {qIndex + 1}/{total}</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${((qIndex) / total) * 100}%` as any, backgroundColor: exercise.color }]} />
                  </View>
                </View>

                {/* Question */}
                <View style={styles.questionCard}>
                  <Text style={styles.questionText}>{q.text}</Text>
                  {q.hint && (
                    <TouchableOpacity style={styles.hintBtn} onPress={() => setShowHint(h => !h)}>
                      <Ionicons name="bulb-outline" size={14} color="#F59E0B" />
                      <Text style={styles.hintBtnText}>{showHint ? 'Masquer l\'indice' : 'Voir l\'indice'}</Text>
                    </TouchableOpacity>
                  )}
                  {showHint && q.hint && (
                    <View style={styles.hintBox}>
                      <Text style={styles.hintText}>💡 {q.hint}</Text>
                    </View>
                  )}
                </View>

                {/* Options */}
                <View style={styles.optionsGrid}>
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.label
                    const revealed = !!answers[q.id]
                    const isCorrect = opt.correct
                    let bg = colors.white, border = colors.gray[200], textCol = colors.gray[800]
                    if (revealed) {
                      if (isCorrect) { bg = colors.success + '15'; border = colors.success; textCol = colors.success }
                      else if (selected) { bg = colors.error + '15'; border = colors.error; textCol = colors.error }
                    } else if (selected) { bg = colors.primary + '15'; border = colors.primary }
                    return (
                      <TouchableOpacity
                        key={opt.label}
                        style={[styles.optionCard, { backgroundColor: bg, borderColor: border }]}
                        onPress={() => select(opt.label)}
                        disabled={!!answers[q.id]}
                      >
                        <Text style={[styles.optionText, { color: textCol }]}>{opt.label}</Text>
                        {revealed && isCorrect && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                        {revealed && selected && !isCorrect && <Ionicons name="close-circle" size={18} color={colors.error} />}
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {/* Explication après réponse */}
                {answers[q.id] && (
                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationTitle}>📖 Explication</Text>
                    <Text style={styles.explanationText}>{q.explanation}</Text>
                  </View>
                )}
              </>
            ) : (
              /* Résultat final */
              <View style={styles.resultCard}>
                <Text style={styles.resultEmoji}>{score >= 80 ? '🏆' : score >= 60 ? '👍' : '📚'}</Text>
                <Text style={styles.resultTitle}>{score >= 80 ? 'Excellent !' : score >= 60 ? 'Bien joué !' : 'Continue tes efforts !'}</Text>
                <Text style={styles.resultScore}>{score}<Text style={styles.resultScoreSub}>/100</Text></Text>
                <Text style={styles.resultDetail}>{correct}/{total} réponses correctes</Text>

                <View style={styles.correctionList}>
                  {exercise.questions.map((q, i) => {
                    const sel = answers[q.id]
                    const ok  = q.options.find(o => o.label === sel)?.correct
                    return (
                      <View key={q.id} style={styles.correctionItem}>
                        <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={18} color={ok ? colors.success : colors.error} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.correctionQ} numberOfLines={2}>Q{i + 1} : {q.text}</Text>
                          <Text style={styles.correctionExp}>{q.explanation}</Text>
                        </View>
                      </View>
                    )
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.photoTabBtn]}
                  onPress={() => setActiveTab('photo')}
                >
                  <Ionicons name="camera" size={16} color={colors.white} />
                  <Text style={styles.photoTabBtnText}>Soumettre ma solution photo au prof</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── TAB PHOTO SOLUTION ── */}
        {activeTab === 'photo' && (
          <ScrollView contentContainerStyle={{ padding: spacing.md }}>
            <SubmissionPanel exercise={exercise} onSubmitted={handleSubmitted} />
          </ScrollView>
        )}

        {/* ── TAB AIDE IA ── */}
        {activeTab === 'ai' && (
          <AIChat context={exercise.title} subject={exercise.subject} />
        )}
      </SafeAreaView>
    </Modal>
  )
}

// ── Écran principal ────────────────────────────────────────────────────────────

export default function ExercisesScreen() {
  const [exercises,  setExercises]  = useState<Exercise[]>(INITIAL_EXERCISES)
  const [selected,   setSelected]   = useState<Exercise | null>(null)
  const [filter,     setFilter]     = useState<'all' | 'todo' | 'done' | 'submitted'>('all')

  const FILTERS = [
    { key: 'all',       label: 'Tous',       count: exercises.length },
    { key: 'todo',      label: 'À faire',    count: exercises.filter(e => !e.completed).length },
    { key: 'done',      label: 'Faits',      count: exercises.filter(e => e.completed).length },
    { key: 'submitted', label: 'Soumis',     count: exercises.filter(e => e.submitted).length },
  ]

  const filtered = exercises.filter(e => {
    if (filter === 'todo')      return !e.completed
    if (filter === 'done')      return e.completed
    if (filter === 'submitted') return e.submitted
    return true
  })

  const updateExercise = (updated: Exercise) => {
    setExercises(prev => prev.map(e => e.id === updated.id ? updated : e))
    setSelected(updated)
  }

  const completedCount  = exercises.filter(e => e.completed).length
  const submittedCount  = exercises.filter(e => e.submitted).length
  const avgScore        = exercises.filter(e => e.score).length > 0
    ? Math.round(exercises.filter(e => e.score).reduce((s, e) => s + (e.score ?? 0), 0) / exercises.filter(e => e.score).length)
    : 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✏️ Exercices</Text>
        <Text style={styles.headerSub}>Entraîne-toi et soumets tes solutions</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{completedCount}/{exercises.length}</Text>
            <Text style={styles.statLabel}>Complétés</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{avgScore > 0 ? avgScore + '%' : '—'}</Text>
            <Text style={styles.statLabel}>Moyenne</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: colors.success }]}>{submittedCount}</Text>
            <Text style={styles.statLabel}>Soumis</Text>
          </View>
        </View>

        {/* Info banner */}
        {submittedCount === 0 && (
          <View style={styles.infoBanner}>
            <Ionicons name="camera-outline" size={16} color={colors.primary} />
            <Text style={styles.infoBannerText}>
              Nouveau ! Après chaque exercice, soumets une photo de ta solution manuscrite pour correction IA et révision par ton professeur.
            </Text>
          </View>
        )}

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                onPress={() => setFilter(f.key as any)}
              >
                <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                  {f.label} ({f.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Liste exercices */}
        {filtered.map(ex => (
          <TouchableOpacity
            key={ex.id}
            style={styles.exerciseCard}
            onPress={() => setSelected(ex)}
            activeOpacity={0.75}
          >
            <View style={[styles.exerciseStripe, { backgroundColor: ex.color }]} />
            <View style={styles.exerciseIcon}>
              <Text style={{ fontSize: 22 }}>{ex.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.exerciseTopRow}>
                <Text style={styles.exerciseSubject}>{ex.subject}</Text>
                <View style={styles.exerciseBadges}>
                  <View style={[styles.diffBadge, {
                    backgroundColor: ex.difficulty === 'Facile' ? '#dcfce7' : ex.difficulty === 'Moyen' ? '#fef9c3' : '#fee2e2',
                  }]}>
                    <Text style={[styles.diffText, {
                      color: ex.difficulty === 'Facile' ? '#16a34a' : ex.difficulty === 'Moyen' ? '#854d0e' : '#dc2626',
                    }]}>{ex.difficulty}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.exerciseTitle}>{ex.title}</Text>
              <View style={styles.exerciseMeta}>
                <Ionicons name="person-outline" size={11} color={colors.gray[400]} />
                <Text style={styles.exerciseMetaText}>{ex.teacher}</Text>
                <Ionicons name="time-outline" size={11} color={colors.gray[400]} />
                <Text style={styles.exerciseMetaText}>{ex.duration}</Text>
                <Text style={styles.exerciseMetaText}>· {ex.questions.length} questions</Text>
              </View>
            </View>
            {/* Status icons */}
            <View style={styles.exerciseStatus}>
              {ex.submitted && (
                <View style={styles.statusIconWrap}>
                  <Ionicons name="cloud-upload" size={16} color={colors.success} />
                </View>
              )}
              {ex.completed && ex.score !== undefined && (
                <View style={[styles.scoreBadge, { backgroundColor: ex.score >= 80 ? '#dcfce7' : ex.score >= 60 ? '#fef9c3' : '#fee2e2' }]}>
                  <Text style={[styles.scoreText, { color: ex.score >= 80 ? '#16a34a' : ex.score >= 60 ? '#854d0e' : '#dc2626' }]}>
                    {ex.score}%
                  </Text>
                </View>
              )}
              {!ex.completed && (
                <Ionicons name="chevron-forward" size={18} color={colors.gray[300]} />
              )}
            </View>
          </TouchableOpacity>
        ))}

      </ScrollView>

      <ExerciseModal
        exercise={selected}
        onClose={() => setSelected(null)}
        onUpdate={updateExercise}
      />
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  scroll:      { padding: spacing.md, gap: spacing.sm, paddingBottom: 40 },

  header: {
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },

  statsRow:  { flexDirection: 'row', gap: spacing.sm },
  statCard:  { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadow.sm },
  statVal:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  statLabel: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.primary + '10', borderRadius: radius.md,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.primary + '30',
  },
  infoBannerText: { flex: 1, fontSize: fontSize.xs, color: colors.primary, lineHeight: 16 },

  filterRow:          { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs },
  filterChip:         { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray[200] },
  filterChipActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText:     { fontSize: fontSize.xs, color: colors.gray[600], fontWeight: fontWeight.medium },
  filterChipTextActive:{ color: colors.white },

  exerciseCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm,
  },
  exerciseStripe:  { width: 4, alignSelf: 'stretch' },
  exerciseIcon:    { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  exerciseTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseSubject: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },
  exerciseBadges:  { flexDirection: 'row', gap: 4 },
  diffBadge:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  diffText:        { fontSize: 9, fontWeight: fontWeight.bold },
  exerciseTitle:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800], marginVertical: 2 },
  exerciseMeta:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exerciseMetaText:{ fontSize: fontSize.xs, color: colors.gray[400] },
  exerciseStatus:  { paddingRight: spacing.sm, alignItems: 'center', gap: 4 },
  statusIconWrap:  { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.success + '15', alignItems: 'center', justifyContent: 'center' },
  scoreBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  scoreText:       { fontSize: 11, fontWeight: fontWeight.bold },

  // Modal
  modalHeader:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  modalClose:      { padding: spacing.xs },
  modalTitle:      { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  modalSub:        { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  modalTabs:       { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  modalTab:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  modalTabActive:  { borderBottomColor: colors.primary },
  modalTabLabel:   { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },
  modalTabLabelActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  submittedDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success, marginLeft: 2 },

  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressLabel:{ fontSize: fontSize.xs, color: colors.gray[500], width: 80 },
  progressBg:   { flex: 1, height: 6, backgroundColor: colors.gray[100], borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },

  questionCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  questionText: { fontSize: fontSize.base, color: colors.gray[800], lineHeight: 24 },
  hintBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4 },
  hintBtnText:  { fontSize: fontSize.xs, color: '#F59E0B', fontWeight: fontWeight.medium },
  hintBox:      { backgroundColor: '#FFFBEB', borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: '#FDE68A' },
  hintText:     { fontSize: fontSize.xs, color: '#92400E', lineHeight: 16 },

  optionsGrid:  { gap: spacing.sm },
  optionCard:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, borderWidth: 2, borderColor: colors.gray[200], ...shadow.sm },
  optionText:   { fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 },

  explanationBox: { backgroundColor: '#EFF6FF', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: '#BFDBFE' },
  explanationTitle:{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#1D4ED8', marginBottom: 4 },
  explanationText: { fontSize: fontSize.sm, color: '#1E40AF', lineHeight: 20 },

  // Résultat
  resultCard:   { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, ...shadow.md },
  resultEmoji:  { fontSize: 48 },
  resultTitle:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  resultScore:  { fontSize: 56, fontWeight: fontWeight.bold, color: colors.primary },
  resultScoreSub:{ fontSize: fontSize.lg, fontWeight: fontWeight.normal, color: colors.gray[400] },
  resultDetail: { fontSize: fontSize.sm, color: colors.gray[500] },
  correctionList:{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  correctionItem:{ flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.gray[50], borderRadius: radius.md, padding: spacing.sm },
  correctionQ:  { fontSize: fontSize.xs, color: colors.gray[700], fontWeight: fontWeight.medium },
  correctionExp:{ fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2, lineHeight: 14 },
  photoTabBtn:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignSelf: 'stretch', justifyContent: 'center', marginTop: spacing.sm },
  photoTabBtnText:{ color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },

  // Submission Panel
  submissionPanel: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  submissionHeader:{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  submissionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  submissionSub:   { fontSize: fontSize.xs, color: colors.gray[500], lineHeight: 16 },

  pickRow:     { flexDirection: 'row', gap: spacing.sm },
  pickBtn:     { flex: 1, flexDirection: 'column', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary + '08', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '30' },
  pickBtnText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium, textAlign: 'center' },

  analyzingBox:  { alignItems: 'center', gap: spacing.md },
  photoPreviewSmall:{ width: '100%', height: 120, borderRadius: radius.md, backgroundColor: colors.gray[100] },
  analyzingInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  analyzingText: { fontSize: fontSize.sm, color: colors.primary },

  correctionWrap:  { gap: spacing.md },
  photoPreview:    { width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: colors.gray[100] },
  retakeBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  retakeBtnText:   { fontSize: fontSize.xs, color: colors.primary },

  aiResultCard:    { backgroundColor: colors.gray[50], borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.gray[100] },
  aiResultHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiResultTitle:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  aiScoreBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  aiScoreText:     { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  aiSummary:       { fontSize: fontSize.xs, color: colors.gray[600], lineHeight: 16 },
  aiPoints:        { gap: 6 },
  aiPoint:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  aiPointIcon:     { fontSize: 13, marginTop: 1 },
  aiPointText:     { flex: 1, fontSize: fontSize.xs, lineHeight: 16 },

  noteBox:    { gap: spacing.xs },
  noteLabel:  { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },
  noteInput:  { backgroundColor: colors.gray[50], borderRadius: radius.md, padding: spacing.sm, fontSize: fontSize.sm, color: colors.gray[800], borderWidth: 1, borderColor: colors.gray[200], minHeight: 70, textAlignVertical: 'top' },

  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.success, borderRadius: radius.lg, padding: spacing.md },
  submitBtnText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.sm },

  submittedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.success + '15', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.success + '40' },
  submittedTitle:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.success },
  submittedSub:    { fontSize: fontSize.xs, color: colors.success, marginTop: 1 },
})
