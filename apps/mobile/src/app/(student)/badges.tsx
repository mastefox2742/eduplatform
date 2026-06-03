/**
 * Badges & Classement — Élève
 * Points XP, niveau, badges débloqués, classement classe anonymisé
 */
import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight } from '@/theme'

// ── Config badges ─────────────────────────────────────────────────────────────

const ALL_BADGES = [
  { id: 'presence_perfect', icon: '🟢', label: 'Présence parfaite',   desc: '100% de présence ce mois',             xp: 50  },
  { id: 'presence_good',    icon: '✅', label: 'Assidu',               desc: '≥ 90% de présence',                    xp: 30  },
  { id: 'scholar_first',    icon: '🥇', label: '1er de la classe',      desc: 'Première place du classement',         xp: 100 },
  { id: 'scholar_top3',     icon: '🏅', label: 'Top 3',                 desc: 'Dans les 3 premiers',                  xp: 60  },
  { id: 'maths_champion',   icon: '🏆', label: 'Champion des maths',    desc: '3 exercices parfaits d\'affilée',      xp: 50  },
  { id: 'reader',           icon: '📚', label: 'Lecteur assidu',        desc: '5 cours lus complètement',             xp: 25  },
  { id: 'speed_learner',    icon: '⚡', label: 'Apprenant rapide',      desc: 'Exercice complété en < 5 min',         xp: 20  },
  { id: 'consistent',       icon: '🔥', label: 'Régularité',            desc: '7 jours de connexion consécutifs',     xp: 30  },
  { id: 'team_player',      icon: '⭐', label: 'Élève sérieux',          desc: '10 devoirs rendus à l\'heure',         xp: 40  },
  { id: 'honor_roll',       icon: '🎖️', label: 'Tableau d\'honneur',    desc: 'Reconnu par la direction',             xp: 80  },
]

const LEVELS = [
  { level: 1, label: 'Débutant',     minXP: 0    },
  { level: 2, label: 'Apprenti',     minXP: 100  },
  { level: 3, label: 'Élève',        minXP: 250  },
  { level: 4, label: 'Studieux',     minXP: 500  },
  { level: 5, label: 'Brillant',     minXP: 850  },
  { level: 6, label: 'Expert',       minXP: 1300 },
  { level: 7, label: 'Champion',     minXP: 2000 },
  { level: 8, label: 'Maestro',      minXP: 3000 },
  { level: 9, label: 'Légende',      minXP: 5000 },
  { level: 10,label: 'EduScholar',   minXP: 8000 },
]

function getLevelInfo(xp: number) {
  const current = [...LEVELS].reverse().find(l => xp >= l.minXP) ?? LEVELS[0]
  const nextIdx  = LEVELS.findIndex(l => l.level === current.level) + 1
  const next     = LEVELS[nextIdx]
  const progress = next ? ((xp - current.minXP) / (next.minXP - current.minXP)) * 100 : 100
  return { current, next, progress: Math.min(100, Math.round(progress)) }
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function BadgesScreen() {
  const { user, profile } = useAuth()
  const schoolId  = profile?.schoolId ?? 'demo'
  const studentId = user?.uid ?? ''
  const classId   = (profile as any)?.classId ?? ''

  const [xpData,    setXpData]    = useState({ totalXP: 0, badges: [] as string[], streak: 0 })
  const [ranking,   setRanking]   = useState<{ rank: number; name: string; xp: number; isMe: boolean }[]>([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<'badges' | 'classement'>('badges')

  // XP de l'élève
  useEffect(() => {
    if (schoolId === 'demo' || !studentId) {
      setXpData({ totalXP: 340, badges: ['presence_good', 'consistent', 'reader'], streak: 5 })
      setRanking(DEMO_RANKING)
      setLoading(false)
      return
    }

    const unsub = onSnapshot(
      doc(db, 'schools', schoolId, 'studentXP', studentId),
      snap => {
        if (snap.exists()) {
          setXpData({
            totalXP: snap.data().totalXP ?? 0,
            badges:  snap.data().badges  ?? [],
            streak:  snap.data().streak  ?? 0,
          })
        }
        setLoading(false)
      }
    )
    return unsub
  }, [schoolId, studentId])

  // Classement classe (top 10 anonymisé sauf soi-même)
  useEffect(() => {
    if (schoolId === 'demo' || !classId) return

    const q = query(
      collection(db, 'schools', schoolId, 'studentXP'),
      orderBy('totalXP', 'desc'),
      limit(10),
    )
    return onSnapshot(q, snap => {
      setRanking(snap.docs.map((d, i) => ({
        rank: i + 1,
        name: d.id === studentId ? 'Moi' : `Élève ${i + 1}`,
        xp:   d.data().totalXP ?? 0,
        isMe: d.id === studentId,
      })))
    })
  }, [schoolId, classId, studentId])

  const { current: lvl, next, progress } = getLevelInfo(xpData.totalXP)
  const unlockedBadges = ALL_BADGES.filter(b => xpData.badges.includes(b.id))
  const lockedBadges   = ALL_BADGES.filter(b => !xpData.badges.includes(b.id))

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* XP Card */}
        <View style={styles.xpCard}>
          <View style={styles.xpHeader}>
            <View>
              <Text style={styles.xpLevel}>Niveau {lvl.level} — {lvl.label}</Text>
              <Text style={styles.xpTotal}>{xpData.totalXP.toLocaleString('fr-FR')} XP</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={{ fontSize: 20 }}>🔥</Text>
              <Text style={styles.streakText}>{xpData.streak}j</Text>
            </View>
          </View>

          {/* Barre de progression */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFg, { width: `${progress}%` }]} />
          </View>
          {next && (
            <Text style={styles.xpNext}>
              {(next.minXP - xpData.totalXP).toLocaleString('fr-FR')} XP pour atteindre Niveau {next.level} ({next.label})
            </Text>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['badges', 'classement'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'badges' ? `🏅 Badges (${unlockedBadges.length}/${ALL_BADGES.length})` : '📊 Classement'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> :

        activeTab === 'badges' ? (
          <View style={{ padding: spacing.md }}>
            {unlockedBadges.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Débloqués 🎉</Text>
                <View style={styles.badgeGrid}>
                  {unlockedBadges.map(b => <BadgeCard key={b.id} badge={b} unlocked />)}
                </View>
              </>
            )}
            <Text style={[styles.sectionTitle, { marginTop: spacing.md, color: colors.gray[400] }]}>À débloquer</Text>
            <View style={styles.badgeGrid}>
              {lockedBadges.map(b => <BadgeCard key={b.id} badge={b} unlocked={false} />)}
            </View>
          </View>
        ) : (
          <View style={{ padding: spacing.md }}>
            <Text style={styles.sectionTitle}>Top 10 de la classe</Text>
            {ranking.map(r => (
              <View key={r.rank} style={[styles.rankRow, r.isMe && styles.rankRowMe]}>
                <Text style={styles.rankNum}>#{r.rank}</Text>
                <Text style={[styles.rankName, r.isMe && { color: colors.primary, fontWeight: '800' }]}>{r.name}</Text>
                <View style={styles.xpChip}>
                  <Text style={styles.xpChipText}>{r.xp.toLocaleString('fr-FR')} XP</Text>
                </View>
              </View>
            ))}
            <Text style={styles.rankNote}>🔒 Les noms des autres élèves sont masqués pour protéger leur vie privée</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function BadgeCard({ badge, unlocked }: { badge: typeof ALL_BADGES[0]; unlocked: boolean }) {
  return (
    <View style={[styles.badgeCard, !unlocked && styles.badgeCardLocked]}>
      <Text style={[styles.badgeIcon, !unlocked && { opacity: 0.3 }]}>{badge.icon}</Text>
      <Text style={[styles.badgeLabel, !unlocked && { color: colors.gray[400] }]}>{badge.label}</Text>
      <Text style={styles.badgeDesc} numberOfLines={2}>{badge.desc}</Text>
      <Text style={[styles.badgeXp, !unlocked && { color: colors.gray[300] }]}>+{badge.xp} XP</Text>
    </View>
  )
}

const DEMO_RANKING = [
  { rank: 1, name: 'Élève 1', xp: 820, isMe: false },
  { rank: 2, name: 'Moi',     xp: 340, isMe: true  },
  { rank: 3, name: 'Élève 3', xp: 295, isMe: false },
  { rank: 4, name: 'Élève 4', xp: 210, isMe: false },
  { rank: 5, name: 'Élève 5', xp: 180, isMe: false },
]

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.gray[50] },
  xpCard:         { backgroundColor: colors.primary, padding: spacing.lg, margin: spacing.md, borderRadius: radius.xl },
  xpHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  xpLevel:        { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.sm, fontWeight: '600' },
  xpTotal:        { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 2 },
  streakBadge:    { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: radius.lg },
  streakText:     { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  progressBg:     { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  progressFg:     { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  xpNext:         { color: 'rgba(255,255,255,0.6)', fontSize: fontSize.xs, marginTop: 6 },
  tabs:           { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  tab:            { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText:        { fontSize: fontSize.sm, color: colors.gray[400], fontWeight: '600' },
  tabTextActive:  { color: colors.primary },
  sectionTitle:   { fontSize: fontSize.sm, fontWeight: '700', color: colors.gray[700], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  badgeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard:      { width: '47%', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.gray[100] },
  badgeCardLocked:{ backgroundColor: colors.gray[50], borderStyle: 'dashed' },
  badgeIcon:      { fontSize: 32 },
  badgeLabel:     { fontSize: fontSize.xs, fontWeight: '700', color: colors.gray[800], textAlign: 'center' },
  badgeDesc:      { fontSize: 10, color: colors.gray[400], textAlign: 'center', lineHeight: 14 },
  badgeXp:        { fontSize: 10, fontWeight: '700', color: colors.primary },
  rankRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.sm, marginBottom: 6, gap: spacing.sm },
  rankRowMe:      { borderWidth: 2, borderColor: colors.primary },
  rankNum:        { fontSize: fontSize.md, fontWeight: '900', color: colors.gray[400], width: 30 },
  rankName:       { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: colors.gray[800] },
  xpChip:         { backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  xpChipText:     { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  rankNote:       { fontSize: fontSize.xs, color: colors.gray[400], textAlign: 'center', marginTop: spacing.md, fontStyle: 'italic' },
})
