import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

const TRIMESTERS = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3']

interface Grade {
  date:    string
  label:   string
  grade:   number
  max:     number
  coef:    number
  comment?: string
}

interface Subject {
  name:    string
  average: number
  coef:    number
  color:   string
  grades:  Grade[]
}

const SUBJECTS: Subject[] = [
  {
    name:    'Mathématiques',
    average: 15.5,
    coef:    5,
    color:   '#3b82f6',
    grades: [
      { date: '10/03', label: 'Devoir N°1', grade: 14, max: 20, coef: 2 },
      { date: '24/03', label: 'Interrogation', grade: 17, max: 20, coef: 1 },
      { date: '07/04', label: 'Devoir N°2', grade: 15.5, max: 20, coef: 2, comment: 'Bon travail' },
    ],
  },
  {
    name:    'Français',
    average: 13.0,
    coef:    4,
    color:   '#8b5cf6',
    grades: [
      { date: '12/03', label: 'Dissertation', grade: 12, max: 20, coef: 2 },
      { date: '26/03', label: 'Commentaire',  grade: 14, max: 20, coef: 2, comment: 'Expression à améliorer' },
    ],
  },
  {
    name:    'Histoire-Géo',
    average: 16.0,
    coef:    3,
    color:   '#f59e0b',
    grades: [
      { date: '15/03', label: 'Contrôle',    grade: 16, max: 20, coef: 1 },
      { date: '29/03', label: 'Exposé',      grade: 16, max: 20, coef: 2 },
    ],
  },
  {
    name:    'SVT',
    average: 14.0,
    coef:    3,
    color:   '#10b981',
    grades: [
      { date: '11/03', label: 'TP Labo',    grade: 16, max: 20, coef: 1 },
      { date: '25/03', label: 'Devoir',     grade: 13, max: 20, coef: 2 },
    ],
  },
  {
    name:    'Physique-Chimie',
    average: 11.5,
    coef:    4,
    color:   '#f43f5e',
    grades: [
      { date: '13/03', label: 'Contrôle', grade: 10, max: 20, coef: 2, comment: 'Revoir les formules' },
      { date: '27/03', label: 'TP',       grade: 13, max: 20, coef: 1 },
    ],
  },
  {
    name:    'Anglais',
    average: 17.0,
    coef:    3,
    color:   '#06b6d4',
    grades: [
      { date: '14/03', label: 'Expression orale', grade: 18, max: 20, coef: 1 },
      { date: '28/03', label: 'Compréhension',    grade: 16, max: 20, coef: 2 },
    ],
  },
]

function gradeColor(avg: number): string {
  if (avg >= 16) return colors.success
  if (avg >= 14) return colors.primary
  if (avg >= 10) return colors.warning
  return colors.danger
}

function gradeLabel(avg: number): string {
  if (avg >= 16) return 'Excellent'
  if (avg >= 14) return 'Bien'
  if (avg >= 10) return 'Passable'
  return 'Insuffisant'
}

export default function GradesScreen() {
  const [trimester, setTrimester] = useState(0)
  const [expanded, setExpanded]   = useState<string | null>(null)

  const overallAvg = SUBJECTS.reduce((sum, s) => sum + s.average * s.coef, 0)
    / SUBJECTS.reduce((sum, s) => sum + s.coef, 0)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bulletin de notes</Text>

        {/* Sélecteur trimestre */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trimesterScroll}>
          {TRIMESTERS.map((t, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.trimesterBtn, trimester === i && styles.trimesterBtnActive]}
              onPress={() => setTrimester(i)}
            >
              <Text style={[styles.trimesterText, trimester === i && styles.trimesterTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Carte moyenne générale */}
        <View style={styles.avgCard}>
          <View style={styles.avgLeft}>
            <Text style={styles.avgLabel}>Moyenne générale</Text>
            <Text style={[styles.avgValue, { color: gradeColor(overallAvg) }]}>
              {overallAvg.toFixed(2)}
              <Text style={styles.avgMax}>/20</Text>
            </Text>
            <Text style={[styles.avgBadge, { color: gradeColor(overallAvg) }]}>
              {gradeLabel(overallAvg)}
            </Text>
          </View>
          <View style={styles.avgRight}>
            <View style={[styles.avgCircle, { borderColor: gradeColor(overallAvg) }]}>
              <Text style={[styles.avgCircleText, { color: gradeColor(overallAvg) }]}>
                {overallAvg.toFixed(1)}
              </Text>
            </View>
            <Text style={styles.avgRank}>Rang: 8/32</Text>
          </View>
        </View>

        {/* Liste des matières */}
        <View style={styles.list}>
          {SUBJECTS.map((subject) => {
            const isOpen = expanded === subject.name
            return (
              <View key={subject.name} style={styles.subjectCard}>
                <TouchableOpacity
                  style={styles.subjectHeader}
                  onPress={() => setExpanded(isOpen ? null : subject.name)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.subjectCoef}>Coef. {subject.coef}</Text>
                  </View>
                  <View style={styles.subjectAvg}>
                    <Text style={[styles.subjectAvgValue, { color: gradeColor(subject.average) }]}>
                      {subject.average.toFixed(1)}
                    </Text>
                    <Text style={styles.subjectAvgMax}>/20</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.gray[400]}
                    style={{ marginLeft: spacing.sm }}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.gradesDetail}>
                    {subject.grades.map((g, i) => (
                      <View key={i} style={styles.gradeRow}>
                        <View style={styles.gradeLeft}>
                          <Text style={styles.gradeDate}>{g.date}</Text>
                          <Text style={styles.gradeLabel}>{g.label}</Text>
                          {g.comment && (
                            <Text style={styles.gradeComment}>💬 {g.comment}</Text>
                          )}
                        </View>
                        <View style={styles.gradeRight}>
                          <Text style={[styles.gradeValue, { color: gradeColor(g.grade) }]}>
                            {g.grade}
                          </Text>
                          <Text style={styles.gradeMax}>/{g.max}</Text>
                          <Text style={styles.gradeCoef}>×{g.coef}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </View>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900], marginBottom: spacing.sm },

  trimesterScroll: { marginBottom: spacing.sm },
  trimesterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.full,
    marginRight:       spacing.sm,
    backgroundColor:   colors.gray[100],
  },
  trimesterBtnActive:  { backgroundColor: colors.primary },
  trimesterText:       { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[600] },
  trimesterTextActive: { color: colors.white },

  avgCard: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    margin:          spacing.lg,
    backgroundColor: colors.white,
    borderRadius:    radius.xl,
    padding:         spacing.lg,
    ...shadow.md,
  },
  avgLeft:    { flex: 1 },
  avgLabel:   { fontSize: fontSize.sm, color: colors.gray[500], marginBottom: spacing.xs },
  avgValue:   { fontSize: fontSize['3xl'], fontWeight: fontWeight.extrabold },
  avgMax:     { fontSize: fontSize.lg, fontWeight: fontWeight.normal, color: colors.gray[400] },
  avgBadge:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: spacing.xs },
  avgRight:   { alignItems: 'center', gap: spacing.sm },
  avgCircle: {
    width:           72,
    height:          72,
    borderRadius:    36,
    borderWidth:     3,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.gray[50],
  },
  avgCircleText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  avgRank:       { fontSize: fontSize.xs, color: colors.gray[500] },

  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },

  subjectCard: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    ...shadow.sm,
  },
  subjectHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        spacing.md,
  },
  subjectDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
    marginRight:  spacing.sm,
  },
  subjectInfo:     { flex: 1 },
  subjectName:     { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  subjectCoef:     { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 1 },
  subjectAvg:      { flexDirection: 'row', alignItems: 'baseline' },
  subjectAvgValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  subjectAvgMax:   { fontSize: fontSize.sm, color: colors.gray[400] },

  gradesDetail: {
    borderTopWidth:  1,
    borderTopColor:  colors.gray[100],
    paddingVertical: spacing.xs,
  },
  gradeRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  gradeLeft:    { flex: 1 },
  gradeDate:    { fontSize: fontSize.xs, color: colors.gray[400] },
  gradeLabel:   { fontSize: fontSize.sm, color: colors.gray[700], fontWeight: fontWeight.medium, marginTop: 2 },
  gradeComment: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2, fontStyle: 'italic' },
  gradeRight:   { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  gradeValue:   { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  gradeMax:     { fontSize: fontSize.sm, color: colors.gray[400] },
  gradeCoef:    { fontSize: fontSize.xs, color: colors.gray[400], marginLeft: spacing.xs },
})
