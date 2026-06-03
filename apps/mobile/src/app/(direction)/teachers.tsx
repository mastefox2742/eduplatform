import { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, TextInput, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { useTeachers, type FSTeacher } from '@/hooks/useTeachers'

// ─── Types ───────────────────────────────────────────────────────────────────

type ContractType = 'permanent' | 'contractuel' | 'vacataire'
type StatusType   = 'active' | 'leave' | 'inactive'

interface Teacher {
  id:        string
  name:      string
  avatar:    string
  subjects:  string[]
  classes:   string[]
  contract:  ContractType
  status:    StatusType
  phone:     string
  email:     string
  hrsWeek:   number
  joinDate:  string
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const TEACHERS: Teacher[] = [
  {
    id: 't1', name: 'NGUEMA Pierre', avatar: 'NP',
    subjects: ['Mathématiques'], classes: ['3ème B', '4ème A', '5ème C'],
    contract: 'permanent', status: 'active',
    phone: '06 12 34 56 78', email: 'nguema@college.ga',
    hrsWeek: 18, joinDate: 'sept. 2018',
  },
  {
    id: 't2', name: 'ONDO Claire', avatar: 'OC',
    subjects: ['Français', 'Littérature'], classes: ['3ème B', '4ème A'],
    contract: 'permanent', status: 'active',
    phone: '07 98 76 54 32', email: 'ondo@college.ga',
    hrsWeek: 16, joinDate: 'sept. 2020',
  },
  {
    id: 't3', name: 'ABENA Paul', avatar: 'AP',
    subjects: ['Anglais'], classes: ['3ème B', '5ème C', '6ème A'],
    contract: 'contractuel', status: 'active',
    phone: '06 55 44 33 22', email: 'abena@college.ga',
    hrsWeek: 20, joinDate: 'janv. 2022',
  },
  {
    id: 't4', name: 'BIBANG Rose', avatar: 'BR',
    subjects: ['Sciences Physiques', 'Chimie'], classes: ['4ème A', '5ème C'],
    contract: 'permanent', status: 'leave',
    phone: '07 11 22 33 44', email: 'bibang@college.ga',
    hrsWeek: 14, joinDate: 'sept. 2019',
  },
  {
    id: 't5', name: 'MEBALE Jacques', avatar: 'MJ',
    subjects: ['SVT'], classes: ['3ème B', '4ème A', '6ème B'],
    contract: 'contractuel', status: 'active',
    phone: '06 77 88 99 00', email: 'mebale@college.ga',
    hrsWeek: 15, joinDate: 'sept. 2021',
  },
  {
    id: 't6', name: 'ELLA Marie', avatar: 'EM',
    subjects: ['Histoire-Géographie'], classes: ['3ème B', '5ème C'],
    contract: 'vacataire', status: 'active',
    phone: '07 33 44 55 66', email: 'ella@college.ga',
    hrsWeek: 10, joinDate: 'oct. 2023',
  },
  {
    id: 't7', name: 'KOUMBA René', avatar: 'KR',
    subjects: ['Philosophie', 'Éducation civique'], classes: ['3ème B'],
    contract: 'permanent', status: 'active',
    phone: '06 00 11 22 33', email: 'koumba@college.ga',
    hrsWeek: 8, joinDate: 'sept. 2016',
  },
  {
    id: 't8', name: 'IKOBEY Serge', avatar: 'IS',
    subjects: ['EPS'], classes: ['3ème B', '4ème A', '5ème C', '6ème A', '6ème B'],
    contract: 'permanent', status: 'inactive',
    phone: '07 55 66 77 88', email: 'ikobey@college.ga',
    hrsWeek: 22, joinDate: 'sept. 2015',
  },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const CONTRACT_CFG: Record<ContractType, { label: string; color: string; bg: string }> = {
  permanent:   { label: 'Permanent',   color: colors.primary,  bg: '#dbeafe' },
  contractuel: { label: 'Contractuel', color: '#7c3aed',        bg: '#ede9fe' },
  vacataire:   { label: 'Vacataire',   color: colors.warning,  bg: '#fef3c7' },
}

const STATUS_CFG: Record<StatusType, { label: string; color: string; dot: string }> = {
  active:   { label: 'Actif',      color: colors.success,     dot: colors.success },
  leave:    { label: 'En congé',   color: colors.warning,     dot: colors.warning },
  inactive: { label: 'Inactif',    color: colors.gray[400],   dot: colors.gray[300] },
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

/** Transforme un FSTeacher (Firestore) en Teacher (local) pour l'affichage. */
function fsToTeacher(fs: FSTeacher): Teacher {
  return {
    id:       fs.id,
    name:     fs.name,
    avatar:   fs.avatar,
    subjects: fs.subjects.length > 0 ? fs.subjects : ['—'],
    classes:  fs.classes.length  > 0 ? fs.classes  : [],
    contract: fs.contract,
    status:   fs.status,
    phone:    fs.phone    || '—',
    email:    fs.email    || '—',
    hrsWeek:  fs.hrsWeek  || 0,
    joinDate: fs.joinDate || '—',
  }
}

export default function DirectionTeachersScreen() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? 'demo'

  const [query, setQuery] = useState('')
  const [filterContract, setFilterContract] = useState<ContractType | 'all'>('all')
  const [selected, setSelected] = useState<Teacher | null>(null)

  // Données Firebase (tableau vide si demo ou pas encore chargé)
  const { teachers: fsTeachers } = useTeachers(schoolId)

  // Source effective : Firebase si disponible, sinon demo
  const allTeachers: Teacher[] = useMemo(
    () => fsTeachers.length > 0 ? fsTeachers.map(fsToTeacher) : TEACHERS,
    [fsTeachers],
  )

  const filtered = allTeachers.filter(t => {
    const matchQuery = query === '' ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.subjects.some(s => s.toLowerCase().includes(query.toLowerCase()))
    const matchContract = filterContract === 'all' || t.contract === filterContract
    return matchQuery && matchContract
  })

  const active   = allTeachers.filter(t => t.status === 'active').length
  const onLeave  = allTeachers.filter(t => t.status === 'leave').length
  const totalHrs = allTeachers.reduce((s, t) => s + t.hrsWeek, 0)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Enseignants</Text>
        <Text style={styles.headerSub}>{allTeachers.length} enseignants · {totalHrs}h/sem</Text>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderTopColor: colors.success }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{active}</Text>
          <Text style={styles.statLabel}>En poste</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: colors.warning }]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{onLeave}</Text>
          <Text style={styles.statLabel}>En congé</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: colors.primary }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {allTeachers.filter(t => t.contract === 'permanent').length}
          </Text>
          <Text style={styles.statLabel}>Permanents</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#7c3aed' }]}>
          <Text style={[styles.statValue, { color: '#7c3aed' }]}>
            {allTeachers.filter(t => t.contract !== 'permanent').length}
          </Text>
          <Text style={styles.statLabel}>Non-perm.</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={colors.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Nom, matière…"
          placeholderTextColor={colors.gray[400]}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter Pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterStrip}
      >
        {(['all', 'permanent', 'contractuel', 'vacataire'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filterContract === f && styles.filterPillActive]}
            onPress={() => setFilterContract(f)}
          >
            <Text style={[styles.filterText, filterContract === f && styles.filterTextActive]}>
              {f === 'all' ? 'Tous' : CONTRACT_CFG[f].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun résultat</Text>
          </View>
        }
        renderItem={({ item: t }) => {
          const stCfg = STATUS_CFG[t.status]
          const ctCfg = CONTRACT_CFG[t.contract]
          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(t)} activeOpacity={0.7}>
              <View style={styles.cardLeft}>
                {/* Avatar + status dot */}
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{t.avatar}</Text>
                  <View style={[styles.statusDot, { backgroundColor: stCfg.dot }]} />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.teacherName}>{t.name}</Text>
                    <View style={[styles.contractPill, { backgroundColor: ctCfg.bg }]}>
                      <Text style={[styles.contractText, { color: ctCfg.color }]}>{ctCfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.subjects}>{t.subjects.join(', ')}</Text>
                  <Text style={styles.classes}>{t.classes.length} classe{t.classes.length > 1 ? 's' : ''} · {t.hrsWeek}h/sem</Text>
                </View>
              </View>

              {/* Status */}
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.statusLabel, { color: stCfg.color }]}>{stCfg.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.gray[300]} />
              </View>
            </TouchableOpacity>
          )
        }}
      />

      {/* ── Teacher Detail Modal ── */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (() => {
          const stCfg = STATUS_CFG[selected.status]
          const ctCfg = CONTRACT_CFG[selected.contract]
          return (
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Text style={styles.modalClose}>Fermer</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Fiche enseignant</Text>
                <View style={{ width: 56 }} />
              </View>

              <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                {/* Identity */}
                <View style={styles.identityCard}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>{selected.avatar}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{selected.name}</Text>
                    <Text style={styles.modalSub}>{selected.subjects.join(', ')}</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                      <View style={[styles.contractPill, { backgroundColor: ctCfg.bg }]}>
                        <Text style={[styles.contractText, { color: ctCfg.color }]}>{ctCfg.label}</Text>
                      </View>
                      <View style={[styles.contractPill, { backgroundColor: stCfg.color + '18' }]}>
                        <Text style={[styles.contractText, { color: stCfg.color }]}>{stCfg.label}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Details */}
                <Text style={styles.sectionTitle}>Informations</Text>
                {[
                  { icon: 'call-outline',     label: 'Téléphone',    value: selected.phone },
                  { icon: 'mail-outline',     label: 'Email',        value: selected.email },
                  { icon: 'calendar-outline', label: 'En poste depuis', value: selected.joinDate },
                  { icon: 'time-outline',     label: 'Heures / semaine', value: `${selected.hrsWeek}h` },
                ].map(row => (
                  <View key={row.label} style={styles.detailRow}>
                    <Ionicons name={row.icon as any} size={16} color={colors.primary} />
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>{row.value}</Text>
                  </View>
                ))}

                {/* Classes */}
                <Text style={styles.sectionTitle}>Classes assignées</Text>
                <View style={styles.classChips}>
                  {selected.classes.map(cls => (
                    <View key={cls} style={styles.classChip}>
                      <Text style={styles.classChipText}>{cls}</Text>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>Envoyer un message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="document-text-outline" size={18} color={colors.success} />
                    <Text style={[styles.actionText, { color: colors.success }]}>Voir le planning</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )
        })()}
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 1 },

  statsRow: {
    flexDirection: 'row', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.xs,
    borderTopWidth: 2, borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  statLabel: { fontSize: 10, color: colors.gray[500], marginTop: 1 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: 9,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.gray[900] },

  filterStrip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText:       { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray[600] },
  filterTextActive: { color: colors.white },

  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: fontSize.base, color: colors.gray[400] },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm,
  },
  cardLeft:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  avatarText:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  statusDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: colors.surface,
  },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  teacherName:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  contractPill:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  contractText:  { fontSize: 10, fontWeight: fontWeight.bold },
  subjects:      { fontSize: fontSize.xs, color: colors.gray[600], marginTop: 1 },
  classes:       { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 1 },
  statusLabel:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  modalClose: { fontSize: fontSize.base, color: colors.gray[500] },
  identityCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm, marginBottom: spacing.md,
  },
  modalAvatar: {
    width: 56, height: 56, borderRadius: radius.full,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  modalAvatarText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
  modalName:    { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  modalSub:     { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[400],
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: spacing.md, marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.xs,
  },
  detailLabel: { fontSize: fontSize.sm, color: colors.gray[500], width: 130 },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800], flex: 1 },
  classChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  classChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    backgroundColor: '#eff6ff', borderRadius: radius.full,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  classChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  actions: { gap: spacing.xs },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: radius.lg,
  },
  actionText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
})
