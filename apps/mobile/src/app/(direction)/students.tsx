/**
 * Liste des élèves — Direction
 */
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

interface Student {
  id:    string; name: string; class: string; feeStatus: 'ok' | 'warning' | 'danger'
  average: number; absences: number; email: string
}

const STUDENTS: Student[] = [
  { id: 's1', name: 'Aminata Bah',       class: '3ème A', feeStatus: 'danger',  average: 14.2, absences: 2,  email: 'aminata@school.gn' },
  { id: 's2', name: 'Fatoumata Camara',  class: '3ème A', feeStatus: 'warning', average: 12.8, absences: 5,  email: 'fatoumata@school.gn' },
  { id: 's3', name: 'Mamadou Diallo',    class: '3ème B', feeStatus: 'ok',      average: 17.5, absences: 0,  email: 'mamadou@school.gn' },
  { id: 's4', name: 'Aissatou Barry',    class: '4ème A', feeStatus: 'ok',      average: 15.9, absences: 1,  email: 'aissatou@school.gn' },
  { id: 's5', name: 'Ibrahim Kouyaté',   class: '4ème A', feeStatus: 'danger',  average: 11.3, absences: 8,  email: 'ibrahim@school.gn' },
  { id: 's6', name: 'Mariam Soumah',     class: '5ème A', feeStatus: 'warning', average: 13.7, absences: 3,  email: 'mariam@school.gn' },
  { id: 's7', name: 'Ousmane Balde',     class: '5ème A', feeStatus: 'ok',      average: 16.2, absences: 1,  email: 'ousmane@school.gn' },
  { id: 's8', name: 'Kadiatou Diallo',   class: '6ème A', feeStatus: 'ok',      average: 18.1, absences: 0,  email: 'kadiatou@school.gn' },
]

const FEE_COLORS = { ok: '#10b981', warning: '#f59e0b', danger: '#ef4444' }
const FEE_LABELS = { ok: 'À jour', warning: 'En attente', danger: 'Impayé' }

export default function DirectionStudentsScreen() {
  const [search,    setSearch]    = useState('')
  const [classFilter, setClassFilter] = useState<string | null>(null)

  const classes  = [...new Set(STUDENTS.map(s => s.class))].sort()
  const filtered = STUDENTS.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
    const matchClass  = !classFilter || s.class === classFilter
    return matchSearch && matchClass
  })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👩‍🎓 Élèves</Text>
        <Text style={styles.headerSub}>{STUDENTS.length} inscrits · {STUDENTS.filter(s => s.feeStatus === 'danger').length} impayés</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.gray[400]} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Rechercher un élève…" placeholderTextColor={colors.gray[400]} />
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
        <FlatList
          data={[null, ...classes]}
          keyExtractor={c => c ?? 'all'}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.classChip, classFilter === item && styles.classChipActive]}
              onPress={() => setClassFilter(item)}>
              <Text style={[styles.classText, classFilter === item && styles.classTextActive]}>
                {item ?? 'Toutes'}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        renderItem={({ item }) => {
          const feeColor = FEE_COLORS[item.feeStatus]
          const avgColor = item.average >= 14 ? '#10b981' : item.average >= 10 ? '#f59e0b' : '#ef4444'
          return (
            <View style={styles.studentCard}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{item.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.studentClass}>{item.class}</Text>
              </View>
              <View style={styles.studentStats}>
                <Text style={[styles.average, { color: avgColor }]}>{item.average}/20</Text>
                {item.absences > 0 && (
                  <Text style={styles.absences}>{item.absences} abs.</Text>
                )}
                <View style={[styles.feeBadge, { backgroundColor: feeColor + '15' }]}>
                  <Text style={[styles.feeText, { color: feeColor }]}>{FEE_LABELS[item.feeStatus]}</Text>
                </View>
              </View>
            </View>
          )
        }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  header:      { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, marginHorizontal: spacing.lg, marginVertical: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray[200] },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.gray[900] },

  classChip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.gray[100] },
  classChipActive: { backgroundColor: colors.primary },
  classText:       { fontSize: fontSize.xs, color: colors.gray[600], fontWeight: fontWeight.medium },
  classTextActive: { color: colors.white },

  studentCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  studentName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  studentClass:{ fontSize: fontSize.xs, color: colors.gray[500] },

  studentStats:{ alignItems: 'flex-end', gap: 4 },
  average:     { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  absences:    { fontSize: 10, color: colors.gray[400] },
  feeBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  feeText:     { fontSize: 10, fontWeight: fontWeight.bold },
})
