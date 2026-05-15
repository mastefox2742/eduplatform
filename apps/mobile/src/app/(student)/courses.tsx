/**
 * Cours — Interface Élève
 * Affiche les résumés de cours publiés par les professeurs
 */
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { BurgerMenu } from '@/components/ui/BurgerMenu'

// ── Types ────────────────────────────────────────────────────────────────────
interface Course {
  id:          string
  title:       string
  subject:     string
  content:     string
  teacherName: string
  classTarget: string
  emoji:       string
  publishedAt: string
  readTime:    number   // minutes
  read:        boolean
}

// ── Demo data ────────────────────────────────────────────────────────────────
const DEMO_COURSES: Course[] = [
  {
    id: 'c1', emoji: '📐',
    title:       'Introduction aux Dérivées',
    subject:     'Mathématiques',
    teacherName: 'M. Diallo',
    classTarget: '3ème A',
    content:     'Une dérivée mesure le taux de variation instantané d\'une fonction en un point donné.\n\n📌 Définition\nf\'(x) = lim[h→0] (f(x+h) - f(x)) / h\n\n📌 Règles fondamentales\n• (xⁿ)\' = n·xⁿ⁻¹\n• (sin x)\' = cos x\n• (cos x)\' = -sin x\n• (eˣ)\' = eˣ\n• (ln x)\' = 1/x\n\n📌 Exemple\nSi f(x) = 3x² + 2x - 5\nalors f\'(x) = 6x + 2\n\n💡 Astuce\nLa dérivée d\'une somme est la somme des dérivées.',
    publishedAt: '10 mai 2026', readTime: 5, read: true,
  },
  {
    id: 'c2', emoji: '📊',
    title:       'Équations du Second Degré',
    subject:     'Mathématiques',
    teacherName: 'M. Diallo',
    classTarget: '3ème A',
    content:     'L\'équation ax² + bx + c = 0 avec a ≠ 0.\n\n📌 Discriminant\nΔ = b² - 4ac\n\n📌 Solutions\n• Si Δ > 0 : deux racines x = (-b ± √Δ) / 2a\n• Si Δ = 0 : racine double x = -b / 2a\n• Si Δ < 0 : pas de solution réelle\n\n📌 Exemple\nx² - 5x + 6 = 0\nΔ = 25 - 24 = 1\nx₁ = (5+1)/2 = 3, x₂ = (5-1)/2 = 2',
    publishedAt: '8 mai 2026', readTime: 6, read: false,
  },
  {
    id: 'c3', emoji: '📝',
    title:       'Les Temps du Passé en Français',
    subject:     'Français',
    teacherName: 'Mme Camara',
    classTarget: '3ème A',
    content:     'Le passé composé et l\'imparfait sont deux temps du passé aux usages distincts.\n\n📌 Passé composé\nAction achevée, délimitée dans le temps.\n"J\'ai mangé une pomme ce matin."\n\n📌 Imparfait\nAction habituelle ou état dans le passé.\n"Quand j\'étais petit, je jouais au football."\n\n📌 Astuce\nPassé composé = action ponctuelle\nImparfait = décor, habitude, état',
    publishedAt: '7 mai 2026', readTime: 4, read: false,
  },
  {
    id: 'c4', emoji: '🔬',
    title:       'La Cellule — Unité du Vivant',
    subject:     'SVT',
    teacherName: 'M. Kouyaté',
    classTarget: '3ème A',
    content:     'La cellule est l\'unité structurale et fonctionnelle du vivant.\n\n📌 Composition\n• Membrane plasmique — enveloppe la cellule\n• Cytoplasme — milieu intérieur\n• Noyau — contient l\'ADN\n• Organites — mitochondries, ribosomes…\n\n📌 Types\n• Cellule procaryote (bactérie) : sans noyau\n• Cellule eucaryote (animale/végétale) : avec noyau',
    publishedAt: '6 mai 2026', readTime: 7, read: false,
  },
  {
    id: 'c5', emoji: '🌍',
    title:       'La Guerre Froide (1947–1991)',
    subject:     'Histoire-Géo',
    teacherName: 'Mme Bah',
    classTarget: '3ème A',
    content:     'Affrontement indirect entre les États-Unis et l\'URSS après la Seconde Guerre mondiale.\n\n📌 Blocs\n• Bloc occidental (USA) : capitalisme, OTAN\n• Bloc oriental (URSS) : communisme, Pacte de Varsovie\n\n📌 Dates clés\n• 1947 : Début de la Guerre froide\n• 1961 : Construction du Mur de Berlin\n• 1969 : Alunissage américain\n• 1989 : Chute du Mur\n• 1991 : Dissolution de l\'URSS',
    publishedAt: '5 mai 2026', readTime: 8, read: false,
  },
]

const SUBJECTS = ['Tous', ...new Set(DEMO_COURSES.map(c => c.subject))]
const SUBJECT_COLORS: Record<string, string> = {
  'Mathématiques': '#3b82f6',
  'Français':      '#8b5cf6',
  'SVT':           '#10b981',
  'Histoire-Géo':  '#f59e0b',
  'Physique-Chimie':'#ef4444',
  'Anglais':       '#06b6d4',
}

// ── Course Reader Modal ───────────────────────────────────────────────────────
function CourseReader({ course, onClose, onMarkRead }: {
  course:       Course
  onClose:      () => void
  onMarkRead:   (id: string) => void
}) {
  const subjectColor = SUBJECT_COLORS[course.subject] ?? colors.primary

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={[rStyles.header, { borderBottomColor: subjectColor + '30' }]}>
          <TouchableOpacity onPress={onClose} style={rStyles.closeBtn}>
            <Ionicons name="chevron-down" size={22} color={colors.gray[600]} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={rStyles.headerSubject}>{course.subject}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={rStyles.body}>
          {/* Hero */}
          <Text style={rStyles.emoji}>{course.emoji}</Text>
          <Text style={rStyles.title}>{course.title}</Text>

          <View style={rStyles.metaRow}>
            <View style={[rStyles.metaBadge, { backgroundColor: subjectColor + '15' }]}>
              <Ionicons name="school-outline" size={12} color={subjectColor} />
              <Text style={[rStyles.metaText, { color: subjectColor }]}>{course.teacherName}</Text>
            </View>
            <View style={rStyles.metaBadge}>
              <Ionicons name="time-outline" size={12} color={colors.gray[500]} />
              <Text style={rStyles.metaText}>{course.readTime} min de lecture</Text>
            </View>
          </View>

          {/* Content */}
          <View style={rStyles.contentBox}>
            <Text style={rStyles.content}>{course.content}</Text>
          </View>

          {/* Mark read */}
          {!course.read && (
            <TouchableOpacity
              style={[rStyles.markReadBtn, { backgroundColor: subjectColor }]}
              onPress={() => { onMarkRead(course.id); onClose() }}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.white} />
              <Text style={rStyles.markReadText}>Marquer comme lu</Text>
            </TouchableOpacity>
          )}
          {course.read && (
            <View style={rStyles.alreadyRead}>
              <Ionicons name="checkmark-circle" size={16} color='#10b981' />
              <Text style={rStyles.alreadyReadText}>Cours déjà lu ✓</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Course Card ───────────────────────────────────────────────────────────────
function CourseCard({ course, onPress }: { course: Course; onPress: () => void }) {
  const subjectColor = SUBJECT_COLORS[course.subject] ?? colors.primary
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardLeft, { backgroundColor: subjectColor + '15' }]}>
        <Text style={{ fontSize: 28 }}>{course.emoji}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardSubject, { color: subjectColor }]}>{course.subject}</Text>
          {course.read && (
            <View style={styles.readBadge}>
              <Ionicons name="checkmark-circle" size={12} color='#10b981' />
              <Text style={styles.readText}>Lu</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{course.title}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardTeacher}>{course.teacherName}</Text>
          <Text style={styles.cardTime}>⏱ {course.readTime} min</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function StudentCoursesScreen() {
  const [courses,       setCourses]       = useState<Course[]>(DEMO_COURSES)
  const [activeSubject, setActiveSubject] = useState('Tous')
  const [search,        setSearch]        = useState('')
  const [openCourse,    setOpenCourse]    = useState<Course | null>(null)

  const readCount = courses.filter(c => c.read).length

  const filtered = courses.filter(c => {
    const matchSubj   = activeSubject === 'Tous' || c.subject === activeSubject
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase())
    return matchSubj && matchSearch
  })

  function markRead(id: string) {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, read: true } : c))
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📚 Mes Cours</Text>
          <Text style={styles.headerSub}>{readCount}/{courses.length} cours lus</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPct}>{Math.round(readCount / courses.length * 100)}%</Text>
          </View>
          <BurgerMenu iconColor={colors.gray[700]} />
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${readCount / courses.length * 100}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>{readCount} lu{readCount > 1 ? 's' : ''}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.gray[400]} />
        <TextInput
          style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Rechercher un cours…" placeholderTextColor={colors.gray[400]}
        />
      </View>

      {/* Subject filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {SUBJECTS.map(s => {
          const color = s === 'Tous' ? colors.primary : (SUBJECT_COLORS[s] ?? colors.primary)
          const active = activeSubject === s
          return (
            <TouchableOpacity key={s}
              style={[styles.filterChip, active && { backgroundColor: color }]}
              onPress={() => setActiveSubject(s)}>
              <Text style={[styles.filterText, active && { color: colors.white }]}>{s}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <CourseCard course={item} onPress={() => setOpenCourse(item)} />
        )}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>🔍</Text>
            <Text style={styles.emptyText}>Aucun cours trouvé</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Reader */}
      {openCourse && (
        <CourseReader
          course={openCourse}
          onClose={() => setOpenCourse(null)}
          onMarkRead={markRead}
        />
      )}
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  headerTitle:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:    { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  progressCircle:{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  progressPct:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },

  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.white },
  progressTrack:{ flex: 1, height: 6, backgroundColor: colors.gray[100], borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressLabel:{ fontSize: fontSize.xs, color: colors.gray[500], minWidth: 30 },

  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, marginHorizontal: spacing.lg, marginVertical: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray[200] },
  searchInput:  { flex: 1, fontSize: fontSize.sm, color: colors.gray[900] },

  filterRow:    { flexGrow: 0, marginBottom: spacing.sm },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.gray[300] },
  filterText:   { fontSize: fontSize.xs, color: colors.gray[700], fontWeight: fontWeight.semibold },

  card:         { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  cardLeft:     { width: 72, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  cardBody:     { flex: 1, padding: spacing.md, gap: 4 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardSubject:  { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  readBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#10b981' + '15', borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  readText:     { fontSize: 10, color: '#10b981', fontWeight: fontWeight.semibold },
  cardTitle:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900], lineHeight: 20 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTeacher:  { fontSize: fontSize.xs, color: colors.gray[500] },
  cardTime:     { fontSize: fontSize.xs, color: colors.gray[400] },

  empty:        { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:    { fontSize: fontSize.base, color: colors.gray[400] },
})

// ── Reader styles ─────────────────────────────────────────────────────────────
const rStyles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 2 },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray[100], alignItems: 'center', justifyContent: 'center' },
  headerSubject:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[700] },

  body:         { padding: spacing.lg, paddingBottom: 60 },
  emoji:        { fontSize: 56, textAlign: 'center', marginBottom: spacing.sm },
  title:        { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900], textAlign: 'center', marginBottom: spacing.md },

  metaRow:      { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  metaBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gray[100], borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  metaText:     { fontSize: fontSize.xs, color: colors.gray[600], fontWeight: fontWeight.medium },

  contentBox:   { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  content:      { fontSize: fontSize.base, color: colors.gray[800], lineHeight: 28 },

  markReadBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg },
  markReadText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.white },

  alreadyRead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md },
  alreadyReadText: { fontSize: fontSize.sm, color: '#10b981', fontWeight: fontWeight.medium },
})
