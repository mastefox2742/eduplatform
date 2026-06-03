import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { saveAttendanceRecord } from '@/services/firestore'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firestore'

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | null

interface Student {
  id: string
  name: string
  avatar: string
}

interface AttendanceRecord {
  studentId: string
  status: AttendanceStatus
  note?: string
}

interface ClassSession {
  id: string
  className: string
  subject: string
  time: string
  room: string
  studentCount: number
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const CLASSES: ClassSession[] = [
  { id: 'c1', className: '3ème B', subject: 'Mathématiques', time: '07:30 – 09:00', room: 'S.12', studentCount: 32 },
  { id: 'c2', className: '4ème A', subject: 'Mathématiques', time: '09:15 – 10:45', room: 'S.08', studentCount: 28 },
  { id: 'c3', className: '5ème C', subject: 'Mathématiques', time: '11:00 – 12:30', room: 'S.15', studentCount: 30 },
]

const STUDENTS_BY_CLASS: Record<string, Student[]> = {
  c1: [
    { id: 's1',  name: 'ABENA Marie',       avatar: 'AM' },
    { id: 's2',  name: 'BONGO Jean',         avatar: 'BJ' },
    { id: 's3',  name: 'DIBAS Lucie',        avatar: 'DL' },
    { id: 's4',  name: 'EBANG Paul',         avatar: 'EP' },
    { id: 's5',  name: 'FOUDA Christelle',   avatar: 'FC' },
    { id: 's6',  name: 'GABIN Théo',         avatar: 'GT' },
    { id: 's7',  name: 'HANGA Sophie',       avatar: 'HS' },
    { id: 's8',  name: 'IBINGA Marc',        avatar: 'IM' },
    { id: 's9',  name: 'JAFIA Nadia',        avatar: 'JN' },
    { id: 's10', name: 'KOMBILA Franck',     avatar: 'KF' },
    { id: 's11', name: 'LEKOGA Elise',       avatar: 'LE' },
    { id: 's12', name: 'MBOULA Patrick',     avatar: 'MP' },
    { id: 's13', name: 'NDONG Aurore',       avatar: 'NA' },
    { id: 's14', name: 'OBAME Kevin',        avatar: 'OK' },
    { id: 's15', name: 'PAMBOU Laetitia',    avatar: 'PL' },
  ],
  c2: [
    { id: 's16', name: 'ASSOUMOU Berthe',    avatar: 'AB' },
    { id: 's17', name: 'BININGA Rodrigue',   avatar: 'BR' },
    { id: 's18', name: 'CONGO Félicité',     avatar: 'CF' },
    { id: 's19', name: 'DOSSOU Armand',      avatar: 'DA' },
    { id: 's20', name: 'EDZANG Sabine',      avatar: 'ES' },
    { id: 's21', name: 'FANG Herman',        avatar: 'FH' },
    { id: 's22', name: 'GNAGNA Yvette',      avatar: 'GY' },
    { id: 's23', name: 'HOUDA Blaise',       avatar: 'HB' },
    { id: 's24', name: 'IPOUHO Carole',      avatar: 'IC' },
    { id: 's25', name: 'JONGLE Thierry',     avatar: 'JT' },
  ],
  c3: [
    { id: 's26', name: 'ABOGHE Sylvie',      avatar: 'AS' },
    { id: 's27', name: 'BEKALE Jonas',       avatar: 'BJ' },
    { id: 's28', name: 'CLOTAIRE Madeleine', avatar: 'CM' },
    { id: 's29', name: 'DANG Gaston',        avatar: 'DG' },
    { id: 's30', name: 'EVINA Patricia',     avatar: 'EP' },
    { id: 's31', name: 'FOYET Lionel',       avatar: 'FL' },
    { id: 's32', name: 'GOMA Cécile',        avatar: 'GC' },
    { id: 's33', name: 'HINGOU Martial',     avatar: 'HM' },
    { id: 's34', name: 'IKA Rosalie',        avatar: 'IR' },
    { id: 's35', name: 'JOCKO Emmanuel',     avatar: 'JE' },
    { id: 's36', name: 'KOUMBA Florence',    avatar: 'KF' },
  ],
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const FULL_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const DATE_NUMS = ['19', '20', '21', '22', '23', '24']
// Dates ISO correspondantes (semaine du 19/05/2026 en démo)
const DATE_ISO = ['2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24']

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Exclude<AttendanceStatus, null>,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  present: { label: 'Présent',  color: colors.success, bg: '#dcfce7', icon: 'checkmark-circle' },
  absent:  { label: 'Absent',   color: colors.danger,  bg: '#fee2e2', icon: 'close-circle' },
  late:    { label: 'Retard',   color: colors.warning, bg: '#fef3c7', icon: 'time' },
  excused: { label: 'Excusé',   color: colors.info,    bg: '#e0f2fe', icon: 'document-text' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInitialRecords(students: Student[]): Record<string, AttendanceRecord> {
  const rec: Record<string, AttendanceRecord> = {}
  students.forEach(s => { rec[s.id] = { studentId: s.id, status: null } })
  return rec
}

function countByStatus(records: Record<string, AttendanceRecord>) {
  let present = 0, absent = 0, late = 0, excused = 0, unmarked = 0
  Object.values(records).forEach(r => {
    if      (r.status === 'present') present++
    else if (r.status === 'absent')  absent++
    else if (r.status === 'late')    late++
    else if (r.status === 'excused') excused++
    else                              unmarked++
  })
  return { present, absent, late, excused, unmarked }
}

// ─── Components ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AttendanceStatus }) {
  if (!status) return (
    <View style={[styles.statusBadge, { backgroundColor: colors.gray[100] }]}>
      <Text style={[styles.statusText, { color: colors.gray[400] }]}>—</Text>
    </View>
  )
  const cfg = STATUS_CONFIG[status]
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={12} color={cfg.color} />
      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  )
}

function StudentRow({
  student,
  record,
  onPress,
}: {
  student: Student
  record: AttendanceRecord
  onPress: () => void
}) {
  const status = record.status
  const hasNote = !!record.note

  return (
    <TouchableOpacity style={styles.studentRow} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={[
        styles.avatar,
        status ? { backgroundColor: STATUS_CONFIG[status].bg } : { backgroundColor: colors.gray[100] },
      ]}>
        <Text style={[
          styles.avatarText,
          { color: status ? STATUS_CONFIG[status].color : colors.gray[500] },
        ]}>
          {student.avatar}
        </Text>
      </View>

      {/* Name */}
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{student.name}</Text>
        {hasNote && (
          <Text style={styles.notePreview} numberOfLines={1}>📝 {record.note}</Text>
        )}
      </View>

      {/* Status Badge */}
      <StatusBadge status={status} />

      <Ionicons name="chevron-forward" size={14} color={colors.gray[400]} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  )
}

function StatusPicker({
  value,
  onChange,
}: {
  value: AttendanceStatus
  onChange: (s: AttendanceStatus) => void
}) {
  return (
    <View style={styles.statusPicker}>
      {(Object.keys(STATUS_CONFIG) as Exclude<AttendanceStatus, null>[]).map(key => {
        const cfg = STATUS_CONFIG[key]
        const selected = value === key
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.statusOption,
              selected && { backgroundColor: cfg.bg, borderColor: cfg.color },
            ]}
            onPress={() => onChange(key)}
            activeOpacity={0.7}
          >
            <Ionicons name={cfg.icon} size={20} color={selected ? cfg.color : colors.gray[400]} />
            <Text style={[
              styles.statusOptionLabel,
              { color: selected ? cfg.color : colors.gray[600] },
            ]}>
              {cfg.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TeacherAttendanceScreen() {
  // ── Firebase ──────────────────────────────────────────────────────────────
  const { user, profile } = useAuth()
  const schoolId  = profile?.schoolId ?? 'demo'
  const teacherId = user?.uid ?? ''

  const [selectedDay, setSelectedDay] = useState(5) // Samedi (today)
  const [selectedClassId, setSelectedClassId] = useState('c1')
  const [records, setRecords] = useState<Record<string, Record<string, AttendanceRecord>>>({
    c1: buildInitialRecords(STUDENTS_BY_CLASS.c1),
    c2: buildInitialRecords(STUDENTS_BY_CLASS.c2),
    c3: buildInitialRecords(STUDENTS_BY_CLASS.c3),
  })
  const [saved, setSaved] = useState<Record<string, boolean>>({ c1: false, c2: false, c3: false })

  // ── Chargement Firebase du jour sélectionné ───────────────────────────────
  useEffect(() => {
    if (!schoolId || schoolId === 'demo' || !teacherId) return

    const dateISO = DATE_ISO[selectedDay]
    const docId   = `${selectedClassId}_${dateISO}`

    const unsub = onSnapshot(
      doc(db, 'schools', schoolId, 'attendance', docId),
      snap => {
        if (!snap.exists()) return
        const data = snap.data()
        if (!data.records) return
        // Fusionne les présences sauvegardées dans l'état local
        setRecords(prev => ({
          ...prev,
          [selectedClassId]: data.records,
        }))
        // Marque comme sauvegardé si le document existe
        setSaved(prev => ({ ...prev, [selectedClassId]: true }))
      },
    )

    return unsub
  }, [schoolId, teacherId, selectedClassId, selectedDay])

  // Modal state
  const [modalStudent, setModalStudent] = useState<Student | null>(null)
  const [pendingStatus, setPendingStatus] = useState<AttendanceStatus>(null)
  const [pendingNote, setPendingNote] = useState('')

  const cls = CLASSES.find(c => c.id === selectedClassId)!
  const students = STUDENTS_BY_CLASS[selectedClassId]
  const classRecords = records[selectedClassId]
  const counts = countByStatus(classRecords)
  const total = students.length
  const isSaved = saved[selectedClassId]

  function openModal(student: Student) {
    const rec = classRecords[student.id]
    setModalStudent(student)
    setPendingStatus(rec.status)
    setPendingNote(rec.note ?? '')
  }

  function closeModal() {
    setModalStudent(null)
    setPendingStatus(null)
    setPendingNote('')
  }

  function confirmModal() {
    if (!modalStudent) return
    setRecords(prev => ({
      ...prev,
      [selectedClassId]: {
        ...prev[selectedClassId],
        [modalStudent.id]: { studentId: modalStudent.id, status: pendingStatus, note: pendingNote || undefined },
      },
    }))
    closeModal()
  }

  function markAll(status: Exclude<AttendanceStatus, null>) {
    setRecords(prev => {
      const updated: Record<string, AttendanceRecord> = {}
      students.forEach(s => { updated[s.id] = { studentId: s.id, status } })
      return { ...prev, [selectedClassId]: updated }
    })
  }

  async function saveAttendance() {
    // 1. Mise à jour locale instantanée
    setSaved(prev => ({ ...prev, [selectedClassId]: true }))

    // 2. Persistance Firebase en arrière-plan
    if (schoolId !== 'demo' && teacherId) {
      try {
        await saveAttendanceRecord(
          schoolId,
          selectedClassId,
          DATE_ISO[selectedDay],
          teacherId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          classRecords as any,
          {
            className: cls.className,
            dayLabel:  FULL_DAYS[selectedDay],
            subject:   cls.subject,
          },
        )
      } catch (e) {
        console.warn('[attendance] saveAttendance Firebase failed:', e)
      }
    }
  }

  const presentPct = total > 0 ? Math.round((counts.present / total) * 100) : 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Présences</Text>
          <Text style={styles.headerSub}>Semaine du 19 mai 2026</Text>
        </View>
        {isSaved && (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.savedText}>Sauvegardé</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Day Picker ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStrip}
        >
          {DAYS.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[styles.dayNum, selectedDay === i && styles.dayNumActive]}>
                {DATE_NUMS[i]}
              </Text>
              <Text style={[styles.dayName, selectedDay === i && styles.dayNameActive]}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Class Selector ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.classStrip}
        >
          {CLASSES.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.classTab, selectedClassId === c.id && styles.classTabActive]}
              onPress={() => setSelectedClassId(c.id)}
            >
              <Text style={[styles.classTabName, selectedClassId === c.id && styles.classTabNameActive]}>
                {c.className}
              </Text>
              <Text style={[styles.classTabSub, selectedClassId === c.id && styles.classTabSubActive]}>
                {c.subject}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Session Info ── */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionRow}>
            <Ionicons name="time-outline" size={15} color={colors.primary} />
            <Text style={styles.sessionInfo}>{cls.time}</Text>
          </View>
          <View style={styles.sessionRow}>
            <Ionicons name="location-outline" size={15} color={colors.primary} />
            <Text style={styles.sessionInfo}>Salle {cls.room}</Text>
          </View>
          <View style={styles.sessionRow}>
            <Ionicons name="people-outline" size={15} color={colors.primary} />
            <Text style={styles.sessionInfo}>{total} élèves</Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Présents', value: counts.present, color: colors.success, bg: '#dcfce7' },
            { label: 'Absents',  value: counts.absent,  color: colors.danger,  bg: '#fee2e2' },
            { label: 'Retards',  value: counts.late,    color: colors.warning, bg: '#fef3c7' },
            { label: 'Non saisis', value: counts.unmarked, color: colors.gray[500], bg: colors.gray[100] },
          ].map(s => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: s.bg }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: s.color }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Presence Rate ── */}
        <View style={styles.rateCard}>
          <View style={styles.rateHeader}>
            <Text style={styles.rateTitle}>Taux de présence</Text>
            <Text style={[styles.rateValue, { color: presentPct >= 80 ? colors.success : presentPct >= 60 ? colors.warning : colors.danger }]}>
              {counts.unmarked === total ? '—' : `${presentPct}%`}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              {
                width: `${presentPct}%` as any,
                backgroundColor: presentPct >= 80 ? colors.success : presentPct >= 60 ? colors.warning : colors.danger,
              },
            ]} />
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickRow}>
          <Text style={styles.quickLabel}>Marquer tout :</Text>
          {(['present', 'absent'] as const).map(key => {
            const cfg = STATUS_CONFIG[key]
            return (
              <TouchableOpacity
                key={key}
                style={[styles.quickBtn, { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                onPress={() => markAll(key)}
              >
                <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                <Text style={[styles.quickBtnText, { color: cfg.color }]}>{cfg.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* ── Student List ── */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            {FULL_DAYS[selectedDay]} — {cls.className}
          </Text>
          {students.map(student => (
            <StudentRow
              key={student.id}
              student={student}
              record={classRecords[student.id]}
              onPress={() => openModal(student)}
            />
          ))}
        </View>

        {/* ── Save Button ── */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaved && styles.saveBtnDone]}
          onPress={saveAttendance}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSaved ? 'checkmark-circle' : 'save-outline'}
            size={18}
            color={colors.white}
          />
          <Text style={styles.saveBtnText}>
            {isSaved ? 'Présences sauvegardées' : 'Valider les présences'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Student Modal ── */}
      <Modal
        visible={!!modalStudent}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modal}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Saisie de présence</Text>
            <TouchableOpacity onPress={confirmModal} style={styles.modalConfirm}>
              <Text style={styles.modalConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
            {/* Student Info */}
            {modalStudent && (
              <View style={styles.modalStudentCard}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>{modalStudent.avatar}</Text>
                </View>
                <View>
                  <Text style={styles.modalStudentName}>{modalStudent.name}</Text>
                  <Text style={styles.modalStudentSub}>{cls.className} · {FULL_DAYS[selectedDay]}</Text>
                </View>
              </View>
            )}

            {/* Status Picker */}
            <Text style={styles.modalSection}>Statut</Text>
            <StatusPicker value={pendingStatus} onChange={setPendingStatus} />

            {/* Note */}
            <Text style={styles.modalSection}>Note (optionnel)</Text>
            <TouchableOpacity
              style={styles.noteInput}
              activeOpacity={0.9}
            >
              <Text style={[styles.noteInputText, !pendingNote && { color: colors.gray[400] }]}>
                {pendingNote || 'Ex : certificat médical, retard de transport…'}
              </Text>
            </TouchableOpacity>

            {/* Presets */}
            <View style={styles.notePresets}>
              {['Certificat médical', 'Retard de transport', 'Problème familial'].map(preset => (
                <TouchableOpacity
                  key={preset}
                  style={styles.notePresetBtn}
                  onPress={() => setPendingNote(preset)}
                >
                  <Text style={styles.notePresetText}>{preset}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 1,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  savedText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },

  // Day Picker
  dayStrip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  dayChip: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 52,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayNum: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.gray[700],
  },
  dayNumActive: {
    color: colors.white,
  },
  dayName: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 1,
  },
  dayNameActive: {
    color: 'rgba(255,255,255,0.8)',
  },

  // Class Selector
  classStrip: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  classTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 120,
    alignItems: 'center',
    ...shadow.sm,
  },
  classTabActive: {
    backgroundColor: '#312e81',
    borderColor: '#312e81',
  },
  classTabName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.gray[700],
  },
  classTabNameActive: {
    color: colors.white,
  },
  classTabSub: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  classTabSubActive: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Session Card
  sessionCard: {
    marginHorizontal: spacing.md,
    backgroundColor: '#eff6ff',
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionInfo: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    marginTop: 2,
    textAlign: 'center',
  },

  // Rate
  rateCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rateTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  rateValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.gray[100],
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },

  // Quick Actions
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  quickLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
    marginRight: 4,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  quickBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },

  // Student List
  listContainer: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.sm,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.gray[500],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
    gap: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
  },
  studentName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[800],
  },
  notePreview: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
  },

  // Save Button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    ...shadow.md,
  },
  saveBtnDone: {
    backgroundColor: colors.success,
  },
  saveBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },

  // Modal
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  modalCancel: {
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  modalCancelText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
  },
  modalConfirm: {
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  modalConfirmText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  modalStudentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  modalStudentName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  modalStudentSub: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  modalSection: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[600],
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPicker: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  statusOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  statusOptionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  noteInputText: {
    fontSize: fontSize.base,
    color: colors.gray[800],
    lineHeight: 22,
  },
  notePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  notePresetBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  notePresetText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
})
