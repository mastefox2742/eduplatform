import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, TextInput, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { publishAnnouncement } from '@/hooks/useAnnouncements'

// ─── Types ───────────────────────────────────────────────────────────────────

type AudienceType = 'all' | 'parents' | 'students' | 'teachers'
type CategoryType = 'general' | 'urgent' | 'event' | 'exam' | 'holiday'
type ViewMode     = 'list' | 'compose'

interface Announcement {
  id:        string
  title:     string
  body:      string
  category:  CategoryType
  audience:  AudienceType
  date:      string
  author:    string
  readCount: number
  totalRecipients: number
  pinned:    boolean
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'Réunion de parents — 3ème trimestre',
    body: 'Une réunion parents-professeurs est organisée le samedi 30 mai 2026 de 09h à 12h en salle polyvalente. La présence est fortement souhaitée.',
    category: 'event', audience: 'parents', date: '24 mai 2026',
    author: 'Direction', readCount: 87, totalRecipients: 120, pinned: true,
  },
  {
    id: 'a2',
    title: 'Examens blancs — Semaine du 1er juin',
    body: 'Les examens blancs de fin d\'année se dérouleront du lundi 1er au vendredi 5 juin. Les élèves doivent se munir de leur convocation et d\'une pièce d\'identité.',
    category: 'exam', audience: 'all', date: '22 mai 2026',
    author: 'Direction', readCount: 215, totalRecipients: 280, pinned: true,
  },
  {
    id: 'a3',
    title: '⚠️ Fermeture exceptionnelle jeudi 28 mai',
    body: 'L\'établissement sera fermé le jeudi 28 mai 2026 pour travaux de maintenance électrique. Les cours reprennent normalement vendredi.',
    category: 'urgent', audience: 'all', date: '21 mai 2026',
    author: 'Direction', readCount: 198, totalRecipients: 280, pinned: false,
  },
  {
    id: 'a4',
    title: 'Rappel — Tenue vestimentaire',
    body: 'Nous rappelons à tous les élèves que le port de la tenue scolaire réglementaire est obligatoire. Les contrevenants se verront refuser l\'entrée.',
    category: 'general', audience: 'students', date: '18 mai 2026',
    author: 'Censeur', readCount: 142, totalRecipients: 160, pinned: false,
  },
  {
    id: 'a5',
    title: 'Journée pédagogique enseignants',
    body: 'Une journée pédagogique est prévue le mercredi 27 mai. Tous les enseignants sont convoqués à 8h en salle des professeurs. Ordre du jour : harmonisation des pratiques d\'évaluation.',
    category: 'event', audience: 'teachers', date: '15 mai 2026',
    author: 'Direction', readCount: 11, totalRecipients: 12, pinned: false,
  },
  {
    id: 'a6',
    title: 'Congé du 8 juin — Fête nationale',
    body: 'A l\'occasion de la Fête nationale du 8 juin, l\'établissement sera fermé. Les cours reprennent normalement le mercredi 9 juin.',
    category: 'holiday', audience: 'all', date: '10 mai 2026',
    author: 'Direction', readCount: 203, totalRecipients: 280, pinned: false,
  },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CFG: Record<CategoryType, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  general:  { label: 'Général',  color: colors.primary,  bg: '#dbeafe', icon: 'information-circle' },
  urgent:   { label: 'Urgent',   color: colors.danger,   bg: '#fee2e2', icon: 'alert-circle' },
  event:    { label: 'Événement',color: '#7c3aed',        bg: '#ede9fe', icon: 'calendar' },
  exam:     { label: 'Examen',   color: '#d97706',        bg: '#fef3c7', icon: 'pencil' },
  holiday:  { label: 'Congé',    color: colors.success,  bg: '#dcfce7', icon: 'sunny' },
}

const AUDIENCE_CFG: Record<AudienceType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  all:      { label: 'Tout le monde',  icon: 'globe-outline'   },
  parents:  { label: 'Parents',        icon: 'people-outline'  },
  students: { label: 'Élèves',         icon: 'school-outline'  },
  teachers: { label: 'Enseignants',    icon: 'briefcase-outline'},
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DirectionAnnouncementsScreen() {
  // ── Firebase ──────────────────────────────────────────────────────────────
  const { user, profile } = useAuth()
  const schoolId    = profile?.schoolId ?? 'demo'
  const directorId  = user?.uid ?? ''
  const directorName = profile?.displayName ?? 'Direction'

  const [view, setView] = useState<ViewMode>('list')
  const [filterAudience, setFilterAudience] = useState<AudienceType | 'all'>('all')
  const [selected, setSelected] = useState<Announcement | null>(null)
  const [publishing, setPublishing] = useState(false)

  // Compose state
  const [title, setTitle]         = useState('')
  const [body, setBody]           = useState('')
  const [category, setCategory]   = useState<CategoryType>('general')
  const [audience, setAudience]   = useState<AudienceType>('all')

  const pinned   = ANNOUNCEMENTS.filter(a => a.pinned)
  const regular  = ANNOUNCEMENTS.filter(a => !a.pinned && (filterAudience === 'all' || a.audience === filterAudience || a.audience === 'all'))

  function resetCompose() {
    setTitle(''); setBody(''); setCategory('general'); setAudience('all')
  }

  async function handlePublish() {
    if (!title.trim() || !body.trim() || publishing) return
    setPublishing(true)

    // Persistance Firebase (fire-and-forget)
    await publishAnnouncement(schoolId, directorId, directorName, {
      title:    title.trim(),
      body:     body.trim(),
      category,
      audience,
      pinned:   false,
    })

    setPublishing(false)
    setView('list')
    resetCompose()
  }

  // ── Detail Modal ─────────────────────────────────────────────────
  if (selected) {
    const cat = CATEGORY_CFG[selected.category]
    const aud = AUDIENCE_CFG[selected.audience]
    const readPct = Math.round((selected.readCount / selected.totalRecipients) * 100)
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Détail</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {/* Category + Pinned */}
          <View style={styles.detailCatRow}>
            <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
              <Ionicons name={cat.icon} size={13} color={cat.color} />
              <Text style={[styles.catText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            {selected.pinned && (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={12} color='#7c3aed' />
                <Text style={styles.pinnedText}>Épinglé</Text>
              </View>
            )}
          </View>

          <Text style={styles.detailTitle}>{selected.title}</Text>
          <Text style={styles.detailMeta}>{selected.author} · {selected.date}</Text>
          <Text style={styles.detailBody}>{selected.body}</Text>

          {/* Read Rate */}
          <View style={styles.readRateCard}>
            <View style={styles.readRateHeader}>
              <Text style={styles.readRateTitle}>Taux de lecture</Text>
              <Text style={[styles.readRateValue, { color: readPct >= 80 ? colors.success : colors.warning }]}>
                {readPct}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${readPct}%` as any, backgroundColor: readPct >= 80 ? colors.success : colors.warning },
              ]} />
            </View>
            <Text style={styles.readRateSub}>{selected.readCount} / {selected.totalRecipients} destinataires</Text>
          </View>

          {/* Audience */}
          <View style={styles.audienceCard}>
            <Ionicons name={aud.icon} size={18} color={colors.primary} />
            <Text style={styles.audienceText}>Destinataires : <Text style={{ fontWeight: fontWeight.bold }}>{aud.label}</Text></Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Compose View ─────────────────────────────────────────────────
  if (view === 'compose') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setView('list'); resetCompose() }}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvelle annonce</Text>
          <TouchableOpacity
            style={[styles.publishBtn, (!title.trim() || !body.trim() || publishing) && { opacity: 0.4 }]}
            onPress={handlePublish}
            disabled={!title.trim() || !body.trim() || publishing}
          >
            <Text style={styles.publishBtnText}>{publishing ? '...' : 'Publier'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
          {/* Title */}
          <View>
            <Text style={styles.composeLabel}>Titre *</Text>
            <TextInput
              style={styles.composeInput}
              placeholder="Ex: Réunion parents…"
              placeholderTextColor={colors.gray[400]}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Body */}
          <View>
            <Text style={styles.composeLabel}>Message *</Text>
            <TextInput
              style={[styles.composeInput, styles.composeTextarea]}
              placeholder="Rédigez votre annonce ici…"
              placeholderTextColor={colors.gray[400]}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{body.length}/1000</Text>
          </View>

          {/* Category */}
          <View>
            <Text style={styles.composeLabel}>Catégorie</Text>
            <View style={styles.optionGrid}>
              {(Object.keys(CATEGORY_CFG) as CategoryType[]).map(k => {
                const cfg = CATEGORY_CFG[k]
                const sel = category === k
                return (
                  <TouchableOpacity
                    key={k}
                    style={[styles.optionChip, sel && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                    onPress={() => setCategory(k)}
                  >
                    <Ionicons name={cfg.icon} size={14} color={sel ? cfg.color : colors.gray[400]} />
                    <Text style={[styles.optionText, { color: sel ? cfg.color : colors.gray[600] }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Audience */}
          <View>
            <Text style={styles.composeLabel}>Destinataires</Text>
            <View style={styles.optionGrid}>
              {(Object.keys(AUDIENCE_CFG) as AudienceType[]).map(k => {
                const cfg = AUDIENCE_CFG[k]
                const sel = audience === k
                return (
                  <TouchableOpacity
                    key={k}
                    style={[styles.optionChip, sel && styles.optionChipActive]}
                    onPress={() => setAudience(k)}
                  >
                    <Ionicons name={cfg.icon} size={14} color={sel ? colors.primary : colors.gray[400]} />
                    <Text style={[styles.optionText, { color: sel ? colors.primary : colors.gray[600] }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Preview */}
          {(title || body) && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Aperçu</Text>
              {title ? <Text style={styles.previewTitle}>{title}</Text> : null}
              {body  ? <Text style={styles.previewBody} numberOfLines={3}>{body}</Text> : null}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── List View ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Annonces</Text>
          <Text style={styles.headerSub}>{ANNOUNCEMENTS.length} annonces publiées</Text>
        </View>
        <TouchableOpacity style={styles.composeIconBtn} onPress={() => setView('compose')}>
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Pinned ── */}
        {pinned.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📌 Épinglées</Text>
            {pinned.map(a => <AnnouncementCard key={a.id} item={a} onPress={() => setSelected(a)} />)}
          </View>
        )}

        {/* ── Audience Filter ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterStrip}
        >
          {(['all', 'parents', 'students', 'teachers'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filterAudience === f && styles.filterPillActive]}
              onPress={() => setFilterAudience(f)}
            >
              {f !== 'all' && <Ionicons name={AUDIENCE_CFG[f].icon} size={12} color={filterAudience === f ? colors.white : colors.gray[500]} />}
              <Text style={[styles.filterText, filterAudience === f && styles.filterTextActive]}>
                {f === 'all' ? 'Toutes' : AUDIENCE_CFG[f].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Recent ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récentes</Text>
          {regular.map(a => <AnnouncementCard key={a.id} item={a} onPress={() => setSelected(a)} />)}
          {regular.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune annonce pour ce filtre</Text>
            </View>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Card Component ───────────────────────────────────────────────────────────

function AnnouncementCard({ item: a, onPress }: { item: Announcement; onPress: () => void }) {
  const cat = CATEGORY_CFG[a.category]
  const aud = AUDIENCE_CFG[a.audience]
  const readPct = Math.round((a.readCount / a.totalRecipients) * 100)

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
          <Ionicons name={cat.icon} size={12} color={cat.color} />
          <Text style={[styles.catText, { color: cat.color }]}>{cat.label}</Text>
        </View>
        <Text style={styles.cardDate}>{a.date}</Text>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{a.title}</Text>
      <Text style={styles.cardBody} numberOfLines={2}>{a.body}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Ionicons name={aud.icon} size={12} color={colors.gray[400]} />
          <Text style={styles.footerMeta}>{aud.label}</Text>
        </View>
        <View style={styles.footerRight}>
          <Ionicons name="eye-outline" size={12} color={colors.gray[400]} />
          <Text style={styles.footerMeta}>{readPct}% lus</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.gray[300]} />
      </View>
    </TouchableOpacity>
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
  composeIconBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  section: { padding: spacing.md, gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[500],
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },

  filterStrip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText:       { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray[600] },
  filterTextActive: { color: colors.white },

  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: colors.gray[400] },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm, gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full,
  },
  catText:    { fontSize: 10, fontWeight: fontWeight.bold },
  cardDate:   { fontSize: fontSize.xs, color: colors.gray[400] },
  cardTitle:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  cardBody:   { fontSize: fontSize.sm, color: colors.gray[600], lineHeight: 19 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  footerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerMeta:  { fontSize: fontSize.xs, color: colors.gray[400] },

  // Detail
  detailCatRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full,
    backgroundColor: '#ede9fe',
  },
  pinnedText: { fontSize: 10, fontWeight: fontWeight.bold, color: '#7c3aed' },
  detailTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900], marginBottom: 4 },
  detailMeta:  { fontSize: fontSize.sm, color: colors.gray[500], marginBottom: spacing.md },
  detailBody:  { fontSize: fontSize.base, color: colors.gray[700], lineHeight: 24, marginBottom: spacing.md },
  readRateCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm, marginBottom: spacing.sm,
  },
  readRateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  readRateTitle:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[700] },
  readRateValue:  { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  progressBar: { height: 8, backgroundColor: colors.gray[100], borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  readRateSub: { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 4 },
  audienceCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#eff6ff', borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  audienceText: { fontSize: fontSize.sm, color: colors.gray[700] },

  // Compose
  cancelText:  { fontSize: fontSize.base, color: colors.gray[500] },
  publishBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radius.full,
  },
  publishBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.white },
  composeLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[700], marginBottom: spacing.xs,
  },
  composeInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: fontSize.base, color: colors.gray[900],
  },
  composeTextarea: { minHeight: 120 },
  charCount: { fontSize: fontSize.xs, color: colors.gray[400], textAlign: 'right', marginTop: 3 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  optionChipActive: { backgroundColor: '#eff6ff', borderColor: colors.primary },
  optionText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  previewCard: {
    backgroundColor: '#f8fafc', borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  previewLabel: { fontSize: fontSize.xs, color: colors.gray[400], marginBottom: 6, fontWeight: fontWeight.semibold },
  previewTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900], marginBottom: 4 },
  previewBody:  { fontSize: fontSize.sm, color: colors.gray[600], lineHeight: 20 },
})
