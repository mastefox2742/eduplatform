import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId      = 'academique' | 'financier' | 'presences'
type PeriodId   = 'T1' | 'T2' | 'T3' | 'annee'

// ─── Demo Data ────────────────────────────────────────────────────────────────

const CLASSES_STATS = [
  { name: '6ème A', students: 34, avg: 12.4, passRate: 79, bestSubject: 'EPS',          worstSubject: 'Mathématiques' },
  { name: '6ème B', students: 32, avg: 11.8, passRate: 72, bestSubject: 'Français',     worstSubject: 'Sciences Phy.' },
  { name: '5ème C', students: 30, avg: 13.1, passRate: 83, bestSubject: 'Anglais',      worstSubject: 'Philosophie'   },
  { name: '4ème A', students: 28, avg: 12.9, passRate: 81, bestSubject: 'Histoire-Géo', worstSubject: 'Mathématiques' },
  { name: '3ème B', students: 32, avg: 14.2, passRate: 91, bestSubject: 'Mathématiques',worstSubject: 'Philosophie'   },
]

const SUBJECTS_STATS = [
  { name: 'Mathématiques',       avg: 12.6, classAvgs: [10.1, 11.2, 13.0, 12.5, 14.2], coef: 4 },
  { name: 'Français',            avg: 12.1, classAvgs: [12.4, 13.0, 11.8, 12.0, 13.0], coef: 4 },
  { name: 'Anglais',             avg: 13.5, classAvgs: [13.0, 12.5, 14.2, 13.8, 15.5], coef: 3 },
  { name: 'Sciences Physiques',  avg: 11.4, classAvgs: [10.5, 10.8, 11.5, 12.0, 12.0], coef: 3 },
  { name: 'SVT',                 avg: 12.8, classAvgs: [12.0, 12.5, 13.2, 13.0, 14.0], coef: 2 },
  { name: 'Histoire-Géo',        avg: 12.3, classAvgs: [11.5, 12.0, 12.5, 13.5, 13.5], coef: 3 },
  { name: 'Philosophie',         avg: 10.9, classAvgs: [10.0, 10.5, 10.8, 11.0, 11.0], coef: 2 },
  { name: 'EPS',                 avg: 15.2, classAvgs: [15.5, 14.8, 15.0, 15.5, 17.0], coef: 1 },
]

// Distribution des moyennes générales — 3ème B
const DISTRIBUTION = [
  { range: '0–4',    count: 0  },
  { range: '5–7',    count: 1  },
  { range: '8–9',    count: 2  },
  { range: '10–11',  count: 4  },
  { range: '12–13',  count: 8  },
  { range: '14–15',  count: 10 },
  { range: '16–17',  count: 5  },
  { range: '18–20',  count: 2  },
]

const AT_RISK = [
  { name: 'ABENA Marie',       class: '6ème B', avg: 7.2,  absences: 8,  alert: 'critique' },
  { name: 'FOUGA Patrick',     class: '5ème C', avg: 8.1,  absences: 12, alert: 'critique' },
  { name: 'MOUNDZEGOU Elie',   class: '6ème A', avg: 8.5,  absences: 5,  alert: 'risque'   },
  { name: 'NZENG Christelle',  class: '4ème A', avg: 8.8,  absences: 6,  alert: 'risque'   },
  { name: 'ONDO Théophile',    class: '6ème A', avg: 9.0,  absences: 9,  alert: 'risque'   },
]

// Financial
const MONTHLY_COLLECTION = [
  { month: 'Oct',  expected: 8125000, received: 6900000 },
  { month: 'Nov',  expected: 8125000, received: 7800000 },
  { month: 'Déc',  expected: 8125000, received: 8125000 },
  { month: 'Jan',  expected: 8125000, received: 7500000 },
  { month: 'Fév',  expected: 8125000, received: 8000000 },
  { month: 'Mar',  expected: 8125000, received: 7200000 },
  { month: 'Avr',  expected: 8125000, received: 7900000 },
  { month: 'Mai',  expected: 8125000, received: 4300000 },
]

const CLASS_PAYMENTS = [
  { name: '3ème B', paid: 30, total: 32, amount: 1500000 },
  { name: '4ème A', paid: 25, total: 28, amount: 1250000 },
  { name: '5ème C', paid: 22, total: 30, amount: 1100000 },
  { name: '6ème A', paid: 28, total: 34, amount: 1400000 },
  { name: '6ème B', paid: 24, total: 32, amount: 1200000 },
]

// Attendance
const CLASS_ATTENDANCE = [
  { name: '6ème A', total: 34, absences: 42, justified: 28, rate: 93.8 },
  { name: '6ème B', total: 32, absences: 67, justified: 35, rate: 89.7 },
  { name: '5ème C', total: 30, absences: 31, justified: 22, rate: 94.8 },
  { name: '4ème A', total: 28, absences: 28, justified: 20, rate: 95.0 },
  { name: '3ème B', total: 32, absences: 19, justified: 15, rate: 97.1 },
]

const WEEKLY_ABS = [
  { week: 'S1',  count: 18 },
  { week: 'S2',  count: 22 },
  { week: 'S3',  count: 15 },
  { week: 'S4',  count: 31 },
  { week: 'S5',  count: 12 },
  { week: 'S6',  count: 19 },
  { week: 'S7',  count: 8  },
  { week: 'S8',  count: 24 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return (n / 1000000).toFixed(1) + 'M'
}

function mention(avg: number) {
  if (avg >= 16) return { label: 'Très Bien', color: '#059669' }
  if (avg >= 14) return { label: 'Bien',      color: colors.success }
  if (avg >= 12) return { label: 'Assez Bien',color: '#2563eb' }
  if (avg >= 10) return { label: 'Passable',  color: colors.warning }
  return              { label: 'Insuffisant', color: colors.danger }
}

function avgColor(v: number) {
  if (v >= 14) return colors.success
  if (v >= 10) return colors.warning
  return colors.danger
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────

function BarChart({
  data,
  maxValue,
  barColor,
  labelKey,
  valueKey,
  height = 100,
}: {
  data: Record<string, any>[]
  maxValue: number
  barColor: string | ((item: any) => string)
  labelKey: string
  valueKey: string
  height?: number
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: height + 24, gap: 4 }}>
      {data.map((item, i) => {
        const val    = item[valueKey] as number
        const pct    = maxValue > 0 ? val / maxValue : 0
        const barH   = Math.max(4, Math.round(pct * height))
        const color  = typeof barColor === 'function' ? barColor(item) : barColor
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ width: '80%', height: barH, backgroundColor: color, borderRadius: 3 }} />
            <Text style={{ fontSize: 9, color: colors.gray[500], marginTop: 3, textAlign: 'center' }}>
              {item[labelKey]}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

// ─── Summary KPI Card ─────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string; sub?: string
  color: string; icon: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View style={[kpi.card, { borderTopColor: color }]}>
      <View style={[kpi.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[kpi.value, { color }]}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
      {sub && <Text style={kpi.sub}>{sub}</Text>}
    </View>
  )
}
const kpi = StyleSheet.create({
  card:     { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm, borderTopWidth: 3, ...shadow.sm, alignItems: 'center', gap: 2 },
  iconWrap: { width: 30, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  value:    { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  label:    { fontSize: 10, color: colors.gray[500], fontWeight: fontWeight.medium, textAlign: 'center' },
  sub:      { fontSize: 9, color: colors.gray[400], textAlign: 'center' },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DirectionReportsScreen() {
  const [tab, setTab]       = useState<TabId>('academique')
  const [period, setPeriod] = useState<PeriodId>('T2')

  const totalStudents  = CLASSES_STATS.reduce((s, c) => s + c.students, 0)
  const schoolAvg      = CLASSES_STATS.reduce((s, c) => s + c.avg * c.students, 0) / totalStudents
  const schoolPassRate = CLASSES_STATS.reduce((s, c) => s + c.passRate * c.students, 0) / totalStudents
  const atRiskCount    = AT_RISK.length

  const totalExpected  = MONTHLY_COLLECTION.reduce((s, m) => s + m.expected, 0)
  const totalReceived  = MONTHLY_COLLECTION.reduce((s, m) => s + m.received, 0)
  const collectRate    = Math.round((totalReceived / totalExpected) * 100)

  const totalAbs       = CLASS_ATTENDANCE.reduce((s, c) => s + c.absences, 0)
  const schoolAttRate  = CLASS_ATTENDANCE.reduce((s, c) => s + c.rate * c.total, 0) / totalStudents
  const maxWeeklyAbs   = Math.max(...WEEKLY_ABS.map(w => w.count))

  const maxClassBar    = Math.max(...MONTHLY_COLLECTION.map(m => m.expected))

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rapports</Text>
          <Text style={styles.headerSub}>Année scolaire 2025 – 2026</Text>
        </View>
        {/* Period Picker */}
        <View style={styles.periodRow}>
          {(['T1','T2','T3','annee'] as PeriodId[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'annee' ? 'An.' : p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        {([
          { id: 'academique', label: '🎓 Académique' },
          { id: 'financier',  label: '💰 Financier'  },
          { id: 'presences',  label: '📋 Présences'  },
        ] as { id: TabId; label: string }[]).map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabItem, tab === t.id && styles.tabItemActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ══ ACADÉMIQUE ════════════════════════════════════════════ */}
        {tab === 'academique' && (
          <View style={styles.section}>

            {/* KPIs */}
            <View style={styles.kpiRow}>
              <KpiCard label="Moy. établissement" value={schoolAvg.toFixed(1)+'/20'} color={avgColor(schoolAvg)} icon="stats-chart" />
              <KpiCard label="Taux de réussite"   value={Math.round(schoolPassRate)+'%'} color={colors.success} icon="checkmark-circle" sub={`${totalStudents} élèves`} />
              <KpiCard label="Élèves à risque"    value={String(atRiskCount)} color={colors.danger} icon="alert-circle" />
            </View>

            {/* Mention badge */}
            <View style={[styles.mentionBanner, { backgroundColor: mention(schoolAvg).color + '12', borderColor: mention(schoolAvg).color + '40' }]}>
              <Text style={[styles.mentionText, { color: mention(schoolAvg).color }]}>
                Mention globale : {mention(schoolAvg).label}
              </Text>
              <Text style={[styles.mentionSub, { color: mention(schoolAvg).color }]}>
                {period === 'annee' ? 'Année scolaire' : `Trimestre ${period.replace('T','')}`} · {totalStudents} élèves
              </Text>
            </View>

            {/* Résultats par classe */}
            <Text style={styles.cardTitle}>Résultats par classe</Text>
            {CLASSES_STATS.map(cls => {
              const m = mention(cls.avg)
              return (
                <View key={cls.name} style={styles.classRow}>
                  <View style={styles.classLeft}>
                    <Text style={styles.className}>{cls.name}</Text>
                    <Text style={styles.classSub}>{cls.students} élèves</Text>
                  </View>
                  <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
                    {/* Pass rate bar */}
                    <View style={styles.miniBarBg}>
                      <View style={[
                        styles.miniBarFill,
                        {
                          width: `${cls.passRate}%` as any,
                          backgroundColor: cls.passRate >= 80 ? colors.success : cls.passRate >= 60 ? colors.warning : colors.danger,
                        },
                      ]} />
                    </View>
                    <Text style={styles.classSubjects}>
                      ✅ {cls.bestSubject}  ·  ⚠️ {cls.worstSubject}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
                    <Text style={[styles.classAvg, { color: avgColor(cls.avg) }]}>{cls.avg.toFixed(1)}/20</Text>
                    <Text style={[styles.classPassRate, { color: m.color }]}>{cls.passRate}% réussite</Text>
                  </View>
                </View>
              )
            })}

            {/* Résultats par matière */}
            <Text style={styles.cardTitle}>Performances par matière</Text>
            <View style={styles.card}>
              {SUBJECTS_STATS.map(s => (
                <View key={s.name} style={styles.subjectBar}>
                  <View style={styles.subjectBarLeft}>
                    <Text style={styles.subjectName}>{s.name}</Text>
                    <Text style={styles.subjectCoef}>coef {s.coef}</Text>
                  </View>
                  <View style={styles.subjectBarTrack}>
                    <View style={[
                      styles.subjectBarFill,
                      {
                        width: `${(s.avg / 20) * 100}%` as any,
                        backgroundColor: avgColor(s.avg),
                      },
                    ]} />
                  </View>
                  <Text style={[styles.subjectAvgText, { color: avgColor(s.avg) }]}>
                    {s.avg.toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Distribution des moyennes */}
            <Text style={styles.cardTitle}>Distribution des moyennes — 3ème B</Text>
            <View style={styles.card}>
              <BarChart
                data={DISTRIBUTION}
                maxValue={Math.max(...DISTRIBUTION.map(d => d.count))}
                barColor={item => {
                  const r = item.range as string
                  if (r.startsWith('0') || r.startsWith('5') || r.startsWith('8')) return colors.danger
                  if (r.startsWith('10') || r.startsWith('12')) return colors.warning
                  return colors.success
                }}
                labelKey="range"
                valueKey="count"
                height={80}
              />
              <Text style={styles.chartSub}>Nombre d'élèves par tranche de moyenne (/20)</Text>
            </View>

            {/* Élèves à risque */}
            <Text style={styles.cardTitle}>⚠️ Élèves à risque</Text>
            {AT_RISK.map((e, i) => (
              <View key={i} style={[
                styles.riskRow,
                { borderLeftColor: e.alert === 'critique' ? colors.danger : colors.warning },
              ]}>
                <View style={[
                  styles.riskAvg,
                  { backgroundColor: e.alert === 'critique' ? '#fee2e2' : '#fef3c7' },
                ]}>
                  <Text style={[
                    styles.riskAvgText,
                    { color: e.alert === 'critique' ? colors.danger : colors.warning },
                  ]}>
                    {e.avg.toFixed(1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.riskName}>{e.name}</Text>
                  <Text style={styles.riskMeta}>{e.class} · {e.absences} absences</Text>
                </View>
                <View style={[
                  styles.riskBadge,
                  { backgroundColor: e.alert === 'critique' ? '#fee2e2' : '#fef3c7' },
                ]}>
                  <Text style={[
                    styles.riskBadgeText,
                    { color: e.alert === 'critique' ? colors.danger : colors.warning },
                  ]}>
                    {e.alert === 'critique' ? 'Critique' : 'À risque'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ══ FINANCIER ═════════════════════════════════════════════ */}
        {tab === 'financier' && (
          <View style={styles.section}>

            {/* KPIs */}
            <View style={styles.kpiRow}>
              <KpiCard label="Taux de collecte"  value={collectRate+'%'}          color={collectRate >= 80 ? colors.success : colors.warning} icon="trending-up" />
              <KpiCard label="Perçu"             value={fmt(totalReceived)}        color={colors.success} icon="checkmark-circle" sub="FCFA" />
              <KpiCard label="Reste à percevoir" value={fmt(totalExpected-totalReceived)} color={colors.danger} icon="alert-circle" sub="FCFA" />
            </View>

            {/* Bar chart mensuel */}
            <Text style={styles.cardTitle}>Collecte mensuelle</Text>
            <View style={styles.card}>
              {/* Dual bar : expected vs received */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 }}>
                {MONTHLY_COLLECTION.map((m, i) => {
                  const hExp = Math.round((m.expected / maxClassBar) * 100)
                  const hRec = Math.round((m.received / maxClassBar) * 100)
                  const pct  = Math.round((m.received / m.expected) * 100)
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
                        {/* Expected */}
                        <View style={{ width: 6, height: hExp, backgroundColor: colors.gray[200], borderRadius: 2 }} />
                        {/* Received */}
                        <View style={{
                          width: 6, height: hRec, borderRadius: 2,
                          backgroundColor: pct >= 90 ? colors.success : pct >= 70 ? colors.warning : colors.danger,
                        }} />
                      </View>
                      <Text style={{ fontSize: 9, color: colors.gray[500], marginTop: 3 }}>{m.month}</Text>
                    </View>
                  )
                })}
              </View>
              {/* Legend */}
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 10, height: 6, backgroundColor: colors.gray[200], borderRadius: 1 }} />
                  <Text style={{ fontSize: 10, color: colors.gray[500] }}>Attendu</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 10, height: 6, backgroundColor: colors.success, borderRadius: 1 }} />
                  <Text style={{ fontSize: 10, color: colors.gray[500] }}>Reçu</Text>
                </View>
              </View>
              <Text style={styles.chartSub}>Montants en millions FCFA par mois</Text>
            </View>

            {/* Bilan global */}
            <Text style={styles.cardTitle}>Bilan global</Text>
            <View style={styles.card}>
              {[
                { label: 'Total attendu (année)',   value: fmt(totalExpected), color: colors.gray[700] },
                { label: 'Total perçu',             value: fmt(totalReceived), color: colors.success   },
                { label: 'Reste à percevoir',       value: fmt(totalExpected - totalReceived), color: colors.danger },
                { label: 'Taux de collecte',        value: collectRate + '%',  color: collectRate >= 80 ? colors.success : colors.warning },
              ].map(row => (
                <View key={row.label} style={styles.bilanRow}>
                  <Text style={styles.bilanLabel}>{row.label}</Text>
                  <Text style={[styles.bilanValue, { color: row.color }]}>{row.value}</Text>
                </View>
              ))}
              <View style={styles.collectBar}>
                <View style={[styles.collectFill, {
                  width: `${collectRate}%` as any,
                  backgroundColor: collectRate >= 80 ? colors.success : colors.warning,
                }]} />
              </View>
            </View>

            {/* Par classe */}
            <Text style={styles.cardTitle}>Situation par classe</Text>
            {CLASS_PAYMENTS.map(cp => {
              const pct = Math.round((cp.paid / cp.total) * 100)
              return (
                <View key={cp.name} style={styles.classPayRow}>
                  <Text style={styles.classPayName}>{cp.name}</Text>
                  <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
                    <View style={styles.miniBarBg}>
                      <View style={[
                        styles.miniBarFill,
                        {
                          width: `${pct}%` as any,
                          backgroundColor: pct >= 85 ? colors.success : pct >= 70 ? colors.warning : colors.danger,
                        },
                      ]} />
                    </View>
                    <Text style={styles.classPaySub}>{cp.paid}/{cp.total} élèves payés</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', minWidth: 68 }}>
                    <Text style={[styles.classPayPct, { color: pct >= 85 ? colors.success : pct >= 70 ? colors.warning : colors.danger }]}>
                      {pct}%
                    </Text>
                    <Text style={styles.classPayAmt}>{fmt(cp.amount)}</Text>
                  </View>
                </View>
              )
            })}

            {/* Impayés en retard */}
            <View style={styles.overdueCard}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.overdueTitle}>42 élèves avec impayés &gt; 30 jours</Text>
                <Text style={styles.overdueSub}>
                  Montant total : {fmt(42 * 50000)} · Envoyer rappel aux parents ?
                </Text>
              </View>
              <TouchableOpacity style={styles.overdueBtn}>
                <Text style={styles.overdueBtnText}>Notifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══ PRÉSENCES ═════════════════════════════════════════════ */}
        {tab === 'presences' && (
          <View style={styles.section}>

            {/* KPIs */}
            <View style={styles.kpiRow}>
              <KpiCard label="Taux de présence"  value={schoolAttRate.toFixed(1)+'%'} color={schoolAttRate >= 95 ? colors.success : colors.warning} icon="checkbox" />
              <KpiCard label="Total absences"    value={String(totalAbs)}              color={colors.danger}  icon="close-circle" sub="ce trimestre" />
              <KpiCard label="Non justifiées"    value={String(totalAbs - CLASS_ATTENDANCE.reduce((s,c)=>s+c.justified,0))} color={colors.warning} icon="help-circle" />
            </View>

            {/* Évolution hebdomadaire */}
            <Text style={styles.cardTitle}>Absences par semaine</Text>
            <View style={styles.card}>
              <BarChart
                data={WEEKLY_ABS}
                maxValue={maxWeeklyAbs}
                barColor={item => item.count > 25 ? colors.danger : item.count > 15 ? colors.warning : colors.success}
                labelKey="week"
                valueKey="count"
                height={80}
              />
              <Text style={styles.chartSub}>Nombre total d'absences par semaine (toutes classes)</Text>
            </View>

            {/* Par classe */}
            <Text style={styles.cardTitle}>Présences par classe</Text>
            {CLASS_ATTENDANCE.sort((a, b) => b.rate - a.rate).map(ca => {
              const unjust = ca.absences - ca.justified
              return (
                <View key={ca.name} style={styles.attRow}>
                  <View style={styles.attLeft}>
                    <Text style={styles.attClass}>{ca.name}</Text>
                    <Text style={styles.attSub}>{ca.total} élèves</Text>
                  </View>
                  <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
                    <View style={styles.miniBarBg}>
                      <View style={[
                        styles.miniBarFill,
                        {
                          width: `${ca.rate}%` as any,
                          backgroundColor: ca.rate >= 95 ? colors.success : ca.rate >= 90 ? colors.warning : colors.danger,
                        },
                      ]} />
                    </View>
                    <Text style={styles.attDetail}>
                      {ca.absences} abs. · {ca.justified} just. · {unjust} non just.
                    </Text>
                  </View>
                  <Text style={[
                    styles.attRate,
                    { color: ca.rate >= 95 ? colors.success : ca.rate >= 90 ? colors.warning : colors.danger },
                  ]}>
                    {ca.rate.toFixed(1)}%
                  </Text>
                </View>
              )
            })}

            {/* Absentéisme chronique */}
            <View style={[styles.overdueCard, { borderColor: '#fde68a', backgroundColor: '#fffbeb' }]}>
              <Ionicons name="time" size={20} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.overdueTitle, { color: '#92400e' }]}>7 élèves absents &gt; 10 jours</Text>
                <Text style={[styles.overdueSub, { color: '#b45309' }]}>
                  Absentéisme chronique — convocation des parents recommandée
                </Text>
              </View>
              <TouchableOpacity style={[styles.overdueBtn, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                <Text style={[styles.overdueBtnText, { color: '#b45309' }]}>Convoquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    flexWrap: 'wrap', gap: spacing.xs,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 1 },

  periodRow: { flexDirection: 'row', gap: 4 },
  periodChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
    backgroundColor: colors.gray[100], borderWidth: 1, borderColor: colors.gray[200],
  },
  periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText:       { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray[600] },
  periodTextActive: { color: colors.white },

  tabBar: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive:  { borderBottomColor: colors.primary },
  tabLabel:       { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray[400] },
  tabLabelActive: { color: colors.primary },

  section:   { padding: spacing.md, gap: spacing.sm },
  kpiRow:    { flexDirection: 'row', gap: spacing.xs },
  cardTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.bold,
    color: colors.gray[700], marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm,
  },
  chartSub: {
    fontSize: 10, color: colors.gray[400], marginTop: spacing.xs, textAlign: 'center',
  },

  mentionBanner: {
    borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, alignItems: 'center',
  },
  mentionText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  mentionSub:  { fontSize: fontSize.xs, marginTop: 2 },

  // Class stats
  classRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, ...shadow.sm,
  },
  classLeft:    { minWidth: 60 },
  className:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[800] },
  classSub:     { fontSize: 10, color: colors.gray[400] },
  miniBarBg:    { height: 7, backgroundColor: colors.gray[100], borderRadius: radius.full, overflow: 'hidden' },
  miniBarFill:  { height: '100%', borderRadius: radius.full },
  classSubjects:{ fontSize: 10, color: colors.gray[400], marginTop: 3 },
  classAvg:     { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  classPassRate:{ fontSize: 10, fontWeight: fontWeight.semibold },

  // Subject bars
  subjectBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.gray[50],
  },
  subjectBarLeft:  { width: 110 },
  subjectName:     { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray[700] },
  subjectCoef:     { fontSize: 9, color: colors.gray[400] },
  subjectBarTrack: { flex: 1, height: 8, backgroundColor: colors.gray[100], borderRadius: radius.full, overflow: 'hidden' },
  subjectBarFill:  { height: '100%', borderRadius: radius.full },
  subjectAvgText:  { fontSize: fontSize.xs, fontWeight: fontWeight.bold, width: 30, textAlign: 'right' },

  // At risk
  riskRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderLeftWidth: 3, ...shadow.sm,
  },
  riskAvg: {
    width: 44, height: 44, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  riskAvgText:   { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  riskName:      { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800] },
  riskMeta:      { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  riskBadge:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  riskBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },

  // Financial
  bilanRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.gray[50],
  },
  bilanLabel: { fontSize: fontSize.sm, color: colors.gray[600] },
  bilanValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  collectBar: { height: 10, backgroundColor: colors.gray[100], borderRadius: radius.full, overflow: 'hidden', marginTop: spacing.sm },
  collectFill:{ height: '100%', borderRadius: radius.full },

  classPayRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, ...shadow.sm,
  },
  classPayName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[800], width: 60 },
  classPaySub:  { fontSize: 10, color: colors.gray[400], marginTop: 2 },
  classPayPct:  { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  classPayAmt:  { fontSize: 10, color: colors.gray[400] },

  overdueCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#fff1f2', borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: '#fecdd3',
  },
  overdueTitle:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.danger },
  overdueSub:     { fontSize: fontSize.xs, color: '#dc2626', marginTop: 1 },
  overdueBtn: {
    backgroundColor: '#fee2e2', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  overdueBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.danger },

  // Attendance
  attRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, ...shadow.sm,
  },
  attLeft:   { minWidth: 60 },
  attClass:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[800] },
  attSub:    { fontSize: 10, color: colors.gray[400] },
  attDetail: { fontSize: 10, color: colors.gray[400], marginTop: 2 },
  attRate:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold, minWidth: 44, textAlign: 'right' },
})
