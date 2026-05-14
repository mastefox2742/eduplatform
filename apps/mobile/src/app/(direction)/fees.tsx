/**
 * Gestion des frais — Direction
 */
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

type Status = 'all' | 'paid' | 'confirmed' | 'pending' | 'unpaid'

interface StudentFee {
  id:          string
  studentName: string
  class:       string
  invoiceNum:  string
  label:       string
  amount:      number
  status:      'paid' | 'confirmed' | 'pending' | 'unpaid'
  dueDate:     string
}

const ALL_FEES: StudentFee[] = [
  { id: '1', studentName: 'Aminata Bah',      class: '3ème A', invoiceNum: 'FAC-2026-042', label: 'Frais T3',      amount: 250000, status: 'unpaid',    dueDate: '30/04/2026' },
  { id: '2', studentName: 'Fatoumata Camara', class: '3ème A', invoiceNum: 'FAC-2026-041', label: 'Frais T3',      amount: 250000, status: 'pending',   dueDate: '30/04/2026' },
  { id: '3', studentName: 'Mamadou Diallo',   class: '3ème B', invoiceNum: 'FAC-2026-040', label: 'Inscription',   amount: 500000, status: 'paid',      dueDate: '15/10/2025' },
  { id: '4', studentName: 'Aissatou Barry',   class: '4ème A', invoiceNum: 'FAC-2026-039', label: 'Frais T2',      amount: 250000, status: 'confirmed', dueDate: '15/01/2026' },
  { id: '5', studentName: 'Ibrahim Kouyaté',  class: '4ème A', invoiceNum: 'FAC-2026-038', label: 'Frais T3',      amount: 250000, status: 'unpaid',    dueDate: '30/04/2026' },
  { id: '6', studentName: 'Mariam Soumah',    class: '5ème A', invoiceNum: 'FAC-2026-037', label: 'Activités',     amount: 75000,  status: 'pending',   dueDate: '30/05/2026' },
  { id: '7', studentName: 'Ousmane Balde',    class: '5ème A', invoiceNum: 'FAC-2026-036', label: 'Frais T3',      amount: 250000, status: 'paid',      dueDate: '30/04/2026' },
  { id: '8', studentName: 'Kadiatou Diallo',  class: '6ème A', invoiceNum: 'FAC-2026-035', label: 'Inscription',   amount: 500000, status: 'paid',      dueDate: '15/10/2025' },
]

const STATUS_CONFIG = {
  paid:      { label: 'Payé',     dot: '🟢', bg: '#10b981' + '15', color: '#10b981' },
  confirmed: { label: 'Confirmé', dot: '🔵', bg: '#3b82f6' + '15', color: '#3b82f6' },
  pending:   { label: 'En attente',dot: '🟡', bg: '#f59e0b' + '15', color: '#f59e0b' },
  unpaid:    { label: 'Impayé',   dot: '🔴', bg: '#ef4444' + '15', color: '#ef4444' },
}

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: 'all',       label: 'Tous' },
  { key: 'unpaid',    label: '🔴 Impayés' },
  { key: 'pending',   label: '🟡 En attente' },
  { key: 'confirmed', label: '🔵 Confirmés' },
  { key: 'paid',      label: '🟢 Payés' },
]

export default function DirectionFeesScreen() {
  const [tab,    setTab]    = useState<Status>('all')
  const [search, setSearch] = useState('')

  const filtered = ALL_FEES.filter(f => {
    const matchTab    = tab === 'all' || f.status === tab
    const matchSearch = !search || f.studentName.toLowerCase().includes(search.toLowerCase()) || f.invoiceNum.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const totalUnpaid = ALL_FEES.filter(f => f.status === 'unpaid').length
  const totalPending = ALL_FEES.filter(f => f.status === 'pending').length

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💳 Gestion des Frais</Text>
        <View style={styles.headerBadges}>
          {totalUnpaid > 0 && <View style={styles.badgeRed}><Text style={styles.badgeText}>{totalUnpaid} impayés</Text></View>}
          {totalPending > 0 && <View style={styles.badgeYellow}><Text style={styles.badgeText}>{totalPending} en attente</Text></View>}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.gray[400]} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Nom d'élève ou n° facture…"
          placeholderTextColor={colors.gray[400]}
        />
      </View>

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {STATUS_TABS.map(t => (
          <TouchableOpacity key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.thCell, { flex: 2 }]}>Élève</Text>
        <Text style={[styles.thCell, { flex: 1.5 }]}>Facture</Text>
        <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>Montant</Text>
        <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>État</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={f => f.id}
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status]
          return (
            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Text style={styles.studentName} numberOfLines={1}>{item.studentName}</Text>
                <Text style={styles.class}>{item.class} · Éch. {item.dueDate}</Text>
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.invoice}>{item.invoiceNum}</Text>
                <Text style={styles.label}>{item.label}</Text>
              </View>
              <Text style={[styles.amount, { flex: 1.5, textAlign: 'right' }]}>
                {item.amount.toLocaleString()} GNF
              </Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                  <Text style={{ fontSize: 10, color: cfg.color, fontWeight: '700' }}>{cfg.dot}</Text>
                </View>
              </View>
            </View>
          )
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 36 }}>🎉</Text>
            <Text style={styles.emptyText}>Aucun frais dans cette catégorie</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header:    { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerBadges:{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  badgeRed:    { backgroundColor: '#ef4444' + '15', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeYellow: { backgroundColor: '#f59e0b' + '15', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray[700] },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, marginHorizontal: spacing.lg, marginVertical: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray[200] },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.gray[900] },

  tabsRow:      { flexGrow: 0, marginBottom: spacing.sm },
  tabChip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.gray[100] },
  tabChipActive:{ backgroundColor: colors.primary },
  tabText:      { fontSize: fontSize.xs, color: colors.gray[600], fontWeight: fontWeight.medium },
  tabTextActive:{ color: colors.white },

  tableHeader: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: 8, backgroundColor: colors.gray[50], borderBottomWidth: 1, borderBottomColor: colors.gray[200] },
  thCell:      { fontSize: 10, fontWeight: fontWeight.bold, color: colors.gray[500], textTransform: 'uppercase', letterSpacing: 0.5 },

  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray[100], backgroundColor: colors.white },
  studentName:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  class:        { fontSize: 10, color: colors.gray[400] },
  invoice:      { fontSize: fontSize.xs, color: colors.gray[700], fontWeight: fontWeight.medium },
  label:        { fontSize: 10, color: colors.gray[400] },
  amount:       { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[800] },
  statusPill:   { paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.full },

  empty:        { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText:    { fontSize: fontSize.base, color: colors.gray[400] },
})
