/**
 * Discipline & Vie Scolaire — Direction
 * Sanctions (avertissement → exclusion) + Mérites (tableau d'honneur)
 * Notification push parent instantanée à chaque sanction
 */
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { httpsCallable } from 'firebase/functions'
import {
  collection, query, orderBy, onSnapshot, where,
} from 'firebase/firestore'
import { db, functions } from '@/config/firebase'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'sanctions' | 'merites'

interface DisciplineRecord {
  id:           string
  studentName:  string
  className:    string
  type:         'sanction' | 'merite'
  sanction?:    string
  merite?:      string
  motif:        string
  date:         string
  issuedByName: string
  parentNotified: boolean
}

// ── Config sanctions / mérites ────────────────────────────────────────────────

const SANCTIONS = [
  { id: 'avertissement',  label: 'Avertissement',         icon: '⚠️',  color: '#F59E0B' },
  { id: 'blame',          label: 'Blâme',                  icon: '📋', color: '#EF4444' },
  { id: 'retenue',        label: 'Retenue',                icon: '⏰',  color: '#F97316' },
  { id: 'exclusion_temp', label: 'Exclusion temporaire',   icon: '🚫', color: '#DC2626' },
  { id: 'exclusion_def',  label: 'Exclusion définitive',   icon: '❌', color: '#7F1D1D' },
]

const MERITES = [
  { id: 'encouragement',  label: 'Encouragements',         icon: '👏', color: '#10B981' },
  { id: 'tableau_honneur',label: 'Tableau d\'honneur',     icon: '🏆', color: '#F59E0B' },
  { id: 'felicitations',  label: 'Félicitations',          icon: '🌟', color: '#8B5CF6' },
  { id: 'prix_excellence',label: 'Prix d\'excellence',     icon: '🥇', color: '#2563EB' },
]

// ── Cloud Function ─────────────────────────────────────────────────────────────
const issueDisciplineCF = httpsCallable(functions, 'issueDisciplineRecord')

// ── Composant ─────────────────────────────────────────────────────────────────

export default function DisciplineScreen() {
  const { profile } = useAuth()
  const schoolId    = profile?.schoolId ?? 'demo'

  const [tab,      setTab]      = useState<TabId>('sanctions')
  const [records,  setRecords]  = useState<DisciplineRecord[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)

  const [form, setForm] = useState({
    studentName:  '',
    studentId:    '',
    classId:      '',
    className:    '',
    type:         'sanction' as 'sanction' | 'merite',
    subType:      '',
    motif:        '',
    description:  '',
    date:         new Date().toISOString().split('T')[0],
    duration:     undefined as number | undefined,
  })

  // Chargement temps réel
  useEffect(() => {
    if (schoolId === 'demo') { setRecords(DEMO_RECORDS); setLoading(false); return }

    const q = query(
      collection(db, 'schools', schoolId, 'discipline'),
      where('type', '==', tab),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as DisciplineRecord)))
      setLoading(false)
    }, () => setLoading(false))
  }, [schoolId, tab])

  const handleSubmit = useCallback(async () => {
    if (!form.studentName || !form.subType || !form.motif) {
      Alert.alert('Champs manquants', 'Remplissez tous les champs obligatoires.')
      return
    }
    setSaving(true)
    try {
      await issueDisciplineCF({
        schoolId,
        studentId:   form.studentId || 'unknown',
        studentName: form.studentName,
        classId:     form.classId   || 'unknown',
        className:   form.className,
        type:        form.type,
        subType:     form.subType,
        motif:       form.motif,
        description: form.description,
        date:        form.date,
        duration:    form.duration,
      })

      Alert.alert(
        form.type === 'sanction' ? '✅ Sanction enregistrée' : '✅ Mérite enregistré',
        form.type === 'sanction'
          ? 'Le parent a été notifié par notification push.'
          : 'L\'élève a reçu ses points et son badge.',
      )
      setShowForm(false)
      setForm(f => ({ ...f, studentName: '', subType: '', motif: '', description: '', duration: undefined }))
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'enregistrer.')
    } finally {
      setSaving(false)
    }
  }, [form, schoolId])

  const items  = tab === 'sanctions' ? SANCTIONS : MERITES
  const color  = tab === 'sanctions' ? '#DC2626' : '#10B981'
  const icon   = tab === 'sanctions' ? '⚠️' : '🌟'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discipline & Vie scolaire</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: color }]}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([['sanctions', '⚠️ Sanctions'], ['merites', '🌟 Mérites']] as [TabId, string][]).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, tab === id && styles.tabActive]}
            onPress={() => setTab(id)}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> :
         records.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{icon}</Text>
            <Text style={styles.emptyText}>Aucun enregistrement</Text>
          </View>
         ) : records.map(r => {
          const cfg = [...SANCTIONS, ...MERITES].find(s => s.id === (r.sanction ?? r.merite))
          return (
            <View key={r.id} style={[styles.card, { borderLeftColor: cfg?.color ?? colors.gray[300] }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardSubType}>{cfg?.icon} {cfg?.label ?? '—'}</Text>
                {r.type === 'sanction' && (
                  <View style={[styles.notifBadge, { backgroundColor: r.parentNotified ? '#ECFDF5' : '#FEF2F2' }]}>
                    <Ionicons
                      name={r.parentNotified ? 'checkmark-circle' : 'alert-circle'}
                      size={11}
                      color={r.parentNotified ? '#059669' : '#DC2626'}
                    />
                    <Text style={[styles.notifText, { color: r.parentNotified ? '#059669' : '#DC2626' }]}>
                      {r.parentNotified ? 'Parent notifié' : 'Non notifié'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardStudent}>{r.studentName} — <Text style={styles.cardClass}>{r.className}</Text></Text>
              <Text style={styles.cardMotif}>{r.motif}</Text>
              <Text style={styles.cardMeta}>{r.date} · Par {r.issuedByName}</Text>
            </View>
          )
        })}
      </ScrollView>

      {/* Modal formulaire */}
      <Modal visible={showForm} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={{ color: colors.gray[500] }}>Annuler</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{tab === 'sanctions' ? 'Nouvelle sanction' : 'Nouveau mérite'}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>

            {/* Type */}
            <View>
              <Text style={styles.label}>Type *</Text>
              <View style={styles.typeRow}>
                {items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.typeChip, form.subType === item.id && { borderColor: item.color, backgroundColor: item.color + '15' }]}
                    onPress={() => setForm(f => ({ ...f, subType: item.id }))}
                  >
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                    <Text style={[styles.typeChipText, form.subType === item.id && { color: item.color, fontWeight: '700' }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Élève */}
            <View>
              <Text style={styles.label}>Nom de l'élève *</Text>
              <TextInput style={styles.input} value={form.studentName} onChangeText={v => setForm(f => ({ ...f, studentName: v }))} placeholder="Prénom NOM" />
            </View>

            {/* Classe */}
            <View>
              <Text style={styles.label}>Classe</Text>
              <TextInput style={styles.input} value={form.className} onChangeText={v => setForm(f => ({ ...f, className: v }))} placeholder="Ex: 4ème A" />
            </View>

            {/* Motif */}
            <View>
              <Text style={styles.label}>Motif *</Text>
              <TextInput style={styles.input} value={form.motif} onChangeText={v => setForm(f => ({ ...f, motif: v }))} placeholder="Motif court..." />
            </View>

            {/* Description */}
            <View>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="Détails..."
                multiline
              />
            </View>

            {/* Durée (exclusion temp) */}
            {form.subType === 'exclusion_temp' && (
              <View>
                <Text style={styles.label}>Durée (jours)</Text>
                <TextInput style={styles.input} keyboardType="number-pad"
                  value={form.duration?.toString() ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, duration: parseInt(v) || undefined }))}
                  placeholder="3" />
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: color }, saving && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Enregistrer et notifier</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

// ── Demo ──────────────────────────────────────────────────────────────────────

const DEMO_RECORDS: DisciplineRecord[] = [
  { id: '1', studentName: 'Kwamé Asante',   className: '5ème B', type: 'sanction', sanction: 'avertissement', motif: 'Perturbation en classe', date: '2026-05-28', issuedByName: 'M. Leblanc', parentNotified: true },
  { id: '2', studentName: 'Amina Diallo',   className: '6ème A', type: 'sanction', sanction: 'retenue',        motif: 'Absence injustifiée × 3', date: '2026-05-26', issuedByName: 'Censeur', parentNotified: false },
  { id: '3', studentName: 'Marie Dubois',   className: '4ème C', type: 'merite',   merite:   'tableau_honneur', motif: 'Première de la classe T2', date: '2026-05-20', issuedByName: 'Direction', parentNotified: false },
]

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.gray[50] },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  headerTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[900] },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md },
  addBtnText:   { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  tabs:         { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText:      { fontSize: fontSize.sm, color: colors.gray[400], fontWeight: '600' },
  tabTextActive:{ color: colors.primary },
  list:         { padding: spacing.md, gap: spacing.sm, paddingBottom: 40 },
  card:         { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 4, ...shadow.sm },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardSubType:  { fontSize: fontSize.sm, fontWeight: '700', color: colors.gray[800] },
  notifBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  notifText:    { fontSize: 10, fontWeight: '600' },
  cardStudent:  { fontSize: fontSize.md, fontWeight: '600', color: colors.gray[900], marginBottom: 2 },
  cardClass:    { fontWeight: 'normal', color: colors.gray[500] },
  cardMotif:    { fontSize: fontSize.sm, color: colors.gray[600], marginBottom: 4 },
  cardMeta:     { fontSize: fontSize.xs, color: colors.gray[400] },
  empty:        { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyIcon:    { fontSize: 48 },
  emptyText:    { fontSize: fontSize.md, color: colors.gray[400] },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  modalTitle:   { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.gray[900] },
  label:        { fontSize: fontSize.sm, fontWeight: '600', color: colors.gray[700], marginBottom: 6 },
  input:        { borderWidth: 1, borderColor: colors.gray[200], borderRadius: radius.md, padding: 12, fontSize: fontSize.sm, color: colors.gray[900] },
  typeRow:      { gap: 8 },
  typeChip:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1.5, borderColor: colors.gray[200], borderRadius: radius.md },
  typeChipText: { fontSize: fontSize.sm, color: colors.gray[700] },
  submitBtn:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: radius.lg, marginTop: 8 },
  submitBtnText:{ color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
})
