/**
 * Saisie Flash des Notes — Mode Grille Rapide
 * Pavé numérique géant optimisé mobile : 14 → Suivant → 08 → Suivant…
 * Calcul de la moyenne de classe en temps réel
 * Sauvegarde offline-aware via useSyncQueue
 */
import { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Alert, Vibration, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentRow {
  id:     string
  name:   string
  grade:  number | null
  saved:  boolean
}

// ── Données démo ──────────────────────────────────────────────────────────────

const DEMO_STUDENTS: StudentRow[] = [
  { id: 's1', name: 'Amina Diallo',    grade: null, saved: false },
  { id: 's2', name: 'Kwamé Asante',   grade: null, saved: false },
  { id: 's3', name: 'Marie Dubois',   grade: null, saved: false },
  { id: 's4', name: 'Lucas Martin',   grade: null, saved: false },
  { id: 's5', name: 'Fatou Sow',      grade: null, saved: false },
  { id: 's6', name: 'Moussa Traoré',  grade: null, saved: false },
  { id: 's7', name: 'Claire Konan',   grade: null, saved: false },
  { id: 's8', name: 'Ibrahim Diop',   grade: null, saved: false },
]

// ── Composant ─────────────────────────────────────────────────────────────────

export default function GradesFlashScreen() {
  const { profile, user } = useAuth()
  const schoolId          = profile?.schoolId ?? 'demo'
  const { queueWrite }    = useSyncQueue()

  const [students,    setStudents]    = useState<StudentRow[]>(DEMO_STUDENTS)
  const [currentIdx,  setCurrentIdx]  = useState(0)
  const [inputValue,  setInputValue]  = useState('')
  const [assessment,  setAssessment]  = useState('Interrogation 1')
  const [maxScore,    setMaxScore]    = useState(20)
  const [saving,      setSaving]      = useState(false)
  const flashAnim = useRef(new Animated.Value(1)).current

  const current = students[currentIdx]

  // Moyenne de classe en temps réel
  const graded  = students.filter(s => s.grade !== null)
  const classAvg = graded.length > 0
    ? (graded.reduce((s, r) => s + (r.grade ?? 0), 0) / graded.length).toFixed(1)
    : '—'

  const flashCard = useCallback(() => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.6, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1,   duration: 80, useNativeDriver: true }),
    ]).start()
  }, [flashAnim])

  const confirmGrade = useCallback(() => {
    const val = parseFloat(inputValue.replace(',', '.'))
    if (isNaN(val) || val < 0 || val > maxScore) {
      Alert.alert('Note invalide', `Entrez une note entre 0 et ${maxScore}`)
      Vibration.vibrate(100)
      return
    }

    flashCard()
    setStudents(prev => prev.map((s, i) =>
      i === currentIdx ? { ...s, grade: val } : s
    ))
    setInputValue('')

    // Passer à l'élève suivant
    if (currentIdx < students.length - 1) {
      setCurrentIdx(prev => prev + 1)
    } else {
      handleSaveAll()
    }
  }, [inputValue, currentIdx, students, maxScore])

  const handleSaveAll = useCallback(async () => {
    const graded = students.filter(s => s.grade !== null)
    if (graded.length === 0) return

    setSaving(true)
    for (const s of graded) {
      await queueWrite(
        async () => {
          const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
          const { db } = await import('@/config/firebase')
          await setDoc(
            doc(db, 'schools', schoolId, 'grades', `${user?.uid}_${s.id}_${assessment}`),
            {
              teacherId:    user?.uid,
              studentId:    s.id,
              studentName:  s.name,
              assessment,
              maxScore,
              value:        s.grade,
              savedAt:      serverTimestamp(),
            },
            { merge: true }
          )
        },
        'submitBulletin',
        schoolId,
        { studentId: s.id, studentName: s.name, assessment, value: s.grade, maxScore },
        `Note ${s.name} — ${assessment}`,
      )
    }

    setStudents(prev => prev.map(s => s.grade !== null ? { ...s, saved: true } : s))
    setSaving(false)
    Alert.alert('✅ Notes sauvegardées', `${graded.length} notes enregistrées. Moyenne : ${classAvg}/${maxScore}`)
  }, [students, queueWrite, schoolId, assessment, maxScore, classAvg, user])

  // ── Pavé numérique ─────────────────────────────────────────────────────────
  const PAD = [['7','8','9'],['4','5','6'],['1','2','3'],['.',  '0','⌫']]

  const onPadPress = useCallback((key: string) => {
    if (key === '⌫') {
      setInputValue(v => v.slice(0, -1))
    } else {
      setInputValue(v => {
        if (key === '.' && v.includes('.')) return v
        if (v.length >= 4) return v
        return v + key
      })
    }
  }, [])

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* Header config */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.assessmentInput}
            value={assessment}
            onChangeText={setAssessment}
            placeholder="Nom de l'évaluation"
          />
        </View>
        <View style={styles.maxScoreRow}>
          <Text style={styles.maxScoreLabel}>Sur</Text>
          <TextInput
            style={styles.maxScoreInput}
            value={String(maxScore)}
            onChangeText={v => setMaxScore(parseInt(v) || 20)}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {/* Progression + moyenne */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>{currentIdx + 1} / {students.length}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentIdx) / students.length) * 100}%` }]} />
        </View>
        <Text style={styles.statsAvg}>Moy. classe : <Text style={{ color: colors.primary, fontWeight: '700' }}>{classAvg}</Text></Text>
      </View>

      {/* Élève courant */}
      <Animated.View style={[styles.studentCard, { opacity: flashAnim }]}>
        <Text style={styles.studentName}>{current.name}</Text>
        <Text style={styles.studentNum}>Élève {currentIdx + 1} sur {students.length}</Text>
        <View style={styles.gradeDisplay}>
          <Text style={styles.gradeValue}>{inputValue || '—'}</Text>
          <Text style={styles.gradeMax}>/{maxScore}</Text>
        </View>
      </Animated.View>

      {/* Pavé numérique */}
      <View style={styles.pad}>
        {PAD.map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map(key => (
              <TouchableOpacity
                key={key}
                style={[styles.padKey, key === '⌫' && styles.padKeyDelete]}
                onPress={() => onPadPress(key)}
                activeOpacity={0.6}
              >
                <Text style={[styles.padKeyText, key === '⌫' && { color: colors.error }]}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Bouton Suivant */}
        <TouchableOpacity
          style={[styles.nextBtn, !inputValue && styles.nextBtnDisabled]}
          onPress={confirmGrade}
          disabled={!inputValue}
          activeOpacity={0.8}
        >
          <Text style={styles.nextBtnText}>
            {currentIdx === students.length - 1 ? '✅ Terminer' : 'Suivant →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste latérale (mini) */}
      <ScrollView horizontal style={styles.studentList} showsHorizontalScrollIndicator={false}>
        {students.map((s, i) => (
          <TouchableOpacity
            key={s.id}
            style={[
              styles.studentChip,
              i === currentIdx && styles.studentChipActive,
              s.saved && styles.studentChipSaved,
            ]}
            onPress={() => { setCurrentIdx(i); setInputValue(s.grade?.toString() ?? '') }}
          >
            <Text style={styles.studentChipInitials}>
              {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </Text>
            {s.grade !== null && <Text style={styles.studentChipGrade}>{s.grade}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>

    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0F172A' },
  header:             { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: '#1E293B' },
  assessmentInput:    { color: colors.white, fontSize: fontSize.md, fontWeight: '600', backgroundColor: '#334155', borderRadius: radius.md, padding: 10, flex: 1 },
  maxScoreRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  maxScoreLabel:      { color: colors.gray[400], fontSize: fontSize.sm },
  maxScoreInput:      { color: colors.white, fontSize: fontSize.md, fontWeight: '700', backgroundColor: '#334155', borderRadius: radius.md, padding: 10, width: 50, textAlign: 'center' },
  statsBar:           { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 8, backgroundColor: '#1E293B' },
  statsText:          { color: colors.gray[400], fontSize: fontSize.xs, width: 50 },
  progressBar:        { flex: 1, height: 4, backgroundColor: '#334155', borderRadius: 2 },
  progressFill:       { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  statsAvg:           { color: colors.gray[400], fontSize: fontSize.xs },
  studentCard:        { margin: spacing.md, backgroundColor: '#1E293B', borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', ...shadow.lg },
  studentName:        { fontSize: 22, fontWeight: '800', color: colors.white, marginBottom: 4 },
  studentNum:         { fontSize: fontSize.xs, color: colors.gray[400] },
  gradeDisplay:       { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.lg },
  gradeValue:         { fontSize: 56, fontWeight: '900', color: colors.white, lineHeight: 60 },
  gradeMax:           { fontSize: 24, color: colors.gray[500], marginBottom: 8, marginLeft: 4 },
  pad:                { paddingHorizontal: spacing.xl, gap: spacing.sm },
  padRow:             { flexDirection: 'row', gap: spacing.sm },
  padKey:             { flex: 1, backgroundColor: '#1E293B', borderRadius: radius.lg, height: 60, justifyContent: 'center', alignItems: 'center' },
  padKeyDelete:       { backgroundColor: '#2D1515' },
  padKeyText:         { fontSize: 22, fontWeight: '700', color: colors.white },
  nextBtn:            { backgroundColor: colors.primary, borderRadius: radius.lg, height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  nextBtnDisabled:    { backgroundColor: '#334155' },
  nextBtnText:        { fontSize: fontSize.lg, fontWeight: '800', color: colors.white },
  studentList:        { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  studentChip:        { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  studentChipActive:  { borderColor: colors.primary },
  studentChipSaved:   { backgroundColor: '#052e16', borderColor: '#10b981' },
  studentChipInitials:{ fontSize: 12, fontWeight: '700', color: colors.white },
  studentChipGrade:   { fontSize: 9, color: colors.gray[400] },
})
