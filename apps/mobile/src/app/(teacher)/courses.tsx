/**
 * Cours — Interface Professeur
 * Créer, éditer et publier des résumés de cours pour les élèves
 */
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// ── Types ────────────────────────────────────────────────────────────────────
interface Course {
  id:          string
  title:       string
  subject:     string
  content:     string
  classTarget: string
  emoji:       string
  published:   boolean
  createdAt:   string
  updatedAt:   string
  views:       number
}

// ── Demo data ────────────────────────────────────────────────────────────────
const SUBJECTS = ['Mathématiques', 'Français', 'Sciences', 'Histoire-Géo', 'Anglais', 'Physique-Chimie', 'SVT', 'Philosophie']
const CLASSES  = ['6ème A', '5ème A', '4ème A', '3ème A', '3ème B', 'Terminale A', 'Terminale D']
const EMOJIS   = ['📐', '📝', '🔬', '🌍', '🇬🇧', '⚗️', '🧬', '💡', '📊', '📚', '🧮', '🌱']

const INITIAL_COURSES: Course[] = [
  {
    id: 'c1', title: 'Introduction aux Dérivées',
    subject: 'Mathématiques', classTarget: '3ème A',
    content: 'Une dérivée mesure le taux de variation instantané d\'une fonction en un point donné.\n\nDéfinition : f\'(x) = lim[h→0] (f(x+h) - f(x)) / h\n\nRègles fondamentales :\n• (xⁿ)\' = n·xⁿ⁻¹\n• (sin x)\' = cos x\n• (cos x)\' = -sin x\n• (eˣ)\' = eˣ',
    emoji: '📐', published: true, createdAt: '10 mai 2026', updatedAt: '10 mai 2026', views: 24,
  },
  {
    id: 'c2', title: 'Les Équations du Second Degré',
    subject: 'Mathématiques', classTarget: '3ème A',
    content: 'L\'équation ax² + bx + c = 0 avec a ≠ 0.\n\nDiscriminant : Δ = b² - 4ac\n\n• Si Δ > 0 : deux racines réelles distinctes\n• Si Δ = 0 : une racine double\n• Si Δ < 0 : pas de racine réelle',
    emoji: '📊', published: true, createdAt: '8 mai 2026', updatedAt: '8 mai 2026', views: 31,
  },
  {
    id: 'c3', title: 'Les Temps du Passé',
    subject: 'Français', classTarget: '3ème A',
    content: 'Le passé composé exprime une action achevée dans le passé.\nL\'imparfait décrit un état ou une habitude passée.',
    emoji: '📝', published: false, createdAt: '7 mai 2026', updatedAt: '7 mai 2026', views: 0,
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Sub-components ───────────────────────────────────────────────────────────
function CourseCard({ course, onPress, onTogglePublish }: {
  course: Course
  onPress: () => void
  onTogglePublish: () => void
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={styles.cardEmoji}>
          <Text style={{ fontSize: 22 }}>{course.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{course.title}</Text>
          <Text style={styles.cardMeta}>{course.subject} · {course.classTarget}</Text>
        </View>
        <TouchableOpacity
          style={[styles.publishBadge, { backgroundColor: course.published ? '#10b981' + '15' : colors.gray[100] }]}
          onPress={onTogglePublish}
        >
          <Ionicons
            name={course.published ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={course.published ? '#10b981' : colors.gray[400]}
          />
          <Text style={[styles.publishText, { color: course.published ? '#10b981' : colors.gray[400] }]}>
            {course.published ? 'Publié' : 'Brouillon'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cardContent} numberOfLines={2}>{course.content}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>Modifié le {course.updatedAt}</Text>
        {course.published && (
          <View style={styles.viewsRow}>
            <Ionicons name="eye-outline" size={12} color={colors.gray[400]} />
            <Text style={styles.viewsText}>{course.views} vues</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ── Create / Edit Modal ──────────────────────────────────────────────────────
function CourseModal({ visible, course, onClose, onSave }: {
  visible: boolean
  course:  Course | null
  onClose: () => void
  onSave:  (c: Course) => void
}) {
  const [title,       setTitle]       = useState(course?.title       ?? '')
  const [subject,     setSubject]     = useState(course?.subject     ?? SUBJECTS[0])
  const [classTarget, setClassTarget] = useState(course?.classTarget ?? CLASSES[3])
  const [content,     setContent]     = useState(course?.content     ?? '')
  const [emoji,       setEmoji]       = useState(course?.emoji       ?? '📚')
  const [saving,      setSaving]      = useState(false)
  const [showEmoji,   setShowEmoji]   = useState(false)

  const isEdit = !!course

  const handleSave = async (publish: boolean) => {
    if (!title.trim())   { Alert.alert('Titre requis', 'Veuillez saisir un titre pour le cours.'); return }
    if (!content.trim()) { Alert.alert('Contenu requis', 'Veuillez saisir le contenu du cours.'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    onSave({
      id:          course?.id ?? 'c' + Date.now(),
      title:       title.trim(),
      subject, classTarget, content: content.trim(), emoji,
      published:   publish,
      createdAt:   course?.createdAt ?? now(),
      updatedAt:   now(),
      views:       course?.views ?? 0,
    })
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={colors.gray[600]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEdit ? 'Modifier le cours' : 'Nouveau cours'}</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Emoji picker */}
            <TouchableOpacity style={styles.emojiPickerBtn} onPress={() => setShowEmoji(v => !v)}>
              <Text style={{ fontSize: 36 }}>{emoji}</Text>
              <Text style={styles.emojiHint}>Changer l'icône</Text>
            </TouchableOpacity>
            {showEmoji && (
              <View style={styles.emojiGrid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity key={e} onPress={() => { setEmoji(e); setShowEmoji(false) }}
                    style={[styles.emojiOption, emoji === e && styles.emojiSelected]}>
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Title */}
            <Text style={styles.fieldLabel}>Titre du cours *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Introduction aux Dérivées"
              placeholderTextColor={colors.gray[400]}
            />

            {/* Subject */}
            <Text style={styles.fieldLabel}>Matière</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {SUBJECTS.map(s => (
                <TouchableOpacity key={s} onPress={() => setSubject(s)}
                  style={[styles.chip, subject === s && styles.chipActive]}>
                  <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Class */}
            <Text style={styles.fieldLabel}>Classe cible</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {CLASSES.map(c => (
                <TouchableOpacity key={c} onPress={() => setClassTarget(c)}
                  style={[styles.chip, classTarget === c && styles.chipActive]}>
                  <Text style={[styles.chipText, classTarget === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Content */}
            <Text style={styles.fieldLabel}>Contenu du cours *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="Rédigez le résumé du cours ici…&#10;&#10;Vous pouvez utiliser des sauts de ligne pour structurer."
              placeholderTextColor={colors.gray[400]}
              multiline
              textAlignVertical="top"
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.draftBtn]}
                onPress={() => handleSave(false)}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={colors.gray[600]} size="small" />
                        : <Text style={styles.draftBtnText}>Enregistrer brouillon</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.publishBtn]}
                onPress={() => handleSave(true)}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={colors.white} size="small" />
                        : <>
                            <Ionicons name="cloud-upload-outline" size={16} color={colors.white} />
                            <Text style={styles.publishBtnText}>Publier</Text>
                          </>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ visible, course, onClose, onEdit }: {
  visible: boolean; course: Course | null; onClose: () => void; onEdit: () => void
}) {
  if (!course) return null
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={colors.gray[600]} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Aperçu</Text>
          <TouchableOpacity onPress={onEdit} style={styles.editHeaderBtn}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: spacing.sm }}>{course.emoji}</Text>
          <Text style={styles.previewTitle}>{course.title}</Text>
          <View style={styles.previewMeta}>
            <Text style={styles.previewMetaText}>{course.subject}</Text>
            <Text style={styles.previewMetaDot}>·</Text>
            <Text style={styles.previewMetaText}>{course.classTarget}</Text>
          </View>
          <View style={styles.previewContent}>
            <Text style={styles.previewContentText}>{course.content}</Text>
          </View>
          <Text style={styles.previewDate}>Mis à jour le {course.updatedAt}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function TeacherCoursesScreen() {
  const { profile } = useAuth()
  const [courses,     setCourses]     = useState<Course[]>(INITIAL_COURSES)
  const [showCreate,  setShowCreate]  = useState(false)
  const [editCourse,  setEditCourse]  = useState<Course | null>(null)
  const [previewCourse, setPreview]   = useState<Course | null>(null)
  const [filterSubj,  setFilterSubj]  = useState<string | null>(null)
  const [search,      setSearch]      = useState('')

  const subjects  = [...new Set(courses.map(c => c.subject))]
  const published = courses.filter(c => c.published).length
  const drafts    = courses.filter(c => !c.published).length

  const filtered = courses.filter(c => {
    const matchSubj = !filterSubj || c.subject === filterSubj
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase())
    return matchSubj && matchSearch
  })

  function handleSave(c: Course) {
    setCourses(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      return idx >= 0 ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev]
    })
    setShowCreate(false)
    setEditCourse(null)
  }

  function togglePublish(id: string) {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, published: !c.published, updatedAt: now() } : c))
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📚 Mes Cours</Text>
          <Text style={styles.headerSub}>{published} publiés · {drafts} brouillons</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.createBtnText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.gray[400]} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un cours…"
          placeholderTextColor={colors.gray[400]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Subject filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        <TouchableOpacity
          style={[styles.filterChip, !filterSubj && styles.filterChipActive]}
          onPress={() => setFilterSubj(null)}>
          <Text style={[styles.filterText, !filterSubj && styles.filterTextActive]}>Tous</Text>
        </TouchableOpacity>
        {subjects.map(s => (
          <TouchableOpacity key={s}
            style={[styles.filterChip, filterSubj === s && styles.filterChipActive]}
            onPress={() => setFilterSubj(prev => prev === s ? null : s)}>
            <Text style={[styles.filterText, filterSubj === s && styles.filterTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <CourseCard
            course={item}
            onPress={() => setPreview(item)}
            onTogglePublish={() => togglePublish(item.id)}
          />
        )}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={styles.emptyText}>Aucun cours trouvé</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Create modal */}
      <CourseModal
        visible={showCreate}
        course={null}
        onClose={() => setShowCreate(false)}
        onSave={handleSave}
      />

      {/* Edit modal */}
      <CourseModal
        visible={!!editCourse}
        course={editCourse}
        onClose={() => setEditCourse(null)}
        onSave={handleSave}
      />

      {/* Preview modal */}
      <PreviewModal
        visible={!!previewCourse}
        course={previewCourse}
        onClose={() => setPreview(null)}
        onEdit={() => { setEditCourse(previewCourse); setPreview(null) }}
      />
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  createBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8 },
  createBtnText:{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.white },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, marginHorizontal: spacing.lg, marginVertical: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray[200] },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.gray[900] },

  filterRow:   { flexGrow: 0, marginBottom: spacing.sm },
  filterChip:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.gray[100] },
  filterChipActive: { backgroundColor: colors.primary },
  filterText:  { fontSize: fontSize.xs, color: colors.gray[600], fontWeight: fontWeight.medium },
  filterTextActive: { color: colors.white },

  card:        { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  cardEmoji:   { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary + '12', alignItems: 'center', justifyContent: 'center' },
  cardTitle:   { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  cardMeta:    { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  publishBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  publishText: { fontSize: 10, fontWeight: fontWeight.semibold },
  cardContent: { fontSize: fontSize.sm, color: colors.gray[600], lineHeight: 20, marginBottom: spacing.sm },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate:    { fontSize: fontSize.xs, color: colors.gray[400] },
  viewsRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsText:   { fontSize: fontSize.xs, color: colors.gray[400] },

  empty:       { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:   { fontSize: fontSize.base, color: colors.gray[400] },

  // Modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  modalClose:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray[100], alignItems: 'center', justifyContent: 'center' },
  modalTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[900] },
  editHeaderBtn:{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  modalBody:   { padding: spacing.lg, gap: 0 },

  emojiPickerBtn: { alignItems: 'center', marginBottom: spacing.md },
  emojiHint:      { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 4 },
  emojiGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.md },
  emojiOption:    { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.gray[100], alignItems: 'center', justifyContent: 'center' },
  emojiSelected:  { backgroundColor: colors.primary + '20', borderWidth: 2, borderColor: colors.primary },

  fieldLabel:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[700], marginBottom: 6, marginTop: spacing.sm },
  textInput:   { backgroundColor: colors.gray[50], borderWidth: 1, borderColor: colors.gray[200], borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: fontSize.sm, color: colors.gray[900], marginBottom: spacing.sm },
  textArea:    { minHeight: 200, paddingTop: spacing.md },

  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.gray[100], marginRight: spacing.sm },
  chipActive:  { backgroundColor: colors.primary },
  chipText:    { fontSize: fontSize.xs, color: colors.gray[600], fontWeight: fontWeight.medium },
  chipTextActive:{ color: colors.white },

  modalActions:  { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: 12, borderRadius: radius.lg },
  draftBtn:      { backgroundColor: colors.gray[100] },
  draftBtnText:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[700] },
  publishBtn:    { backgroundColor: colors.primary },
  publishBtnText:{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.white },

  // Preview
  previewTitle:      { fontSize: 22, fontWeight: fontWeight.bold, color: colors.gray[900], textAlign: 'center', marginBottom: spacing.sm },
  previewMeta:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  previewMetaText:   { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  previewMetaDot:    { color: colors.gray[300] },
  previewContent:    { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, ...shadow.sm, marginBottom: spacing.md },
  previewContentText:{ fontSize: fontSize.base, color: colors.gray[800], lineHeight: 26 },
  previewDate:       { fontSize: fontSize.xs, color: colors.gray[400], textAlign: 'center' },
})
