/**
 * SyncBadge — Indicateur de file offline visible dans le header prof
 *
 * Affiche :
 *  🟡 "3 en attente"  → opérations dans la file offline
 *  🔄 "Sync…"         → synchronisation en cours
 *  🔴 "Hors-ligne"    → pas de réseau (aucune op en attente)
 *  rien               → tout est synchronisé et réseau OK
 */
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radius, spacing } from '@/theme'

interface SyncBadgeProps {
  pendingCount: number
  isSyncing:    boolean
  isOnline:     boolean
  onPress:      () => void
}

export function SyncBadge({ pendingCount, isSyncing, isOnline, onPress }: SyncBadgeProps) {
  if (isSyncing) {
    return (
      <View style={[styles.badge, styles.syncing]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.label, { color: colors.primary }]}>Sync…</Text>
      </View>
    )
  }

  if (pendingCount > 0) {
    return (
      <TouchableOpacity style={[styles.badge, styles.pending]} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name="cloud-upload-outline" size={14} color="#B45309" />
        <Text style={[styles.label, styles.pendingText]}>
          {pendingCount} en attente
        </Text>
      </TouchableOpacity>
    )
  }

  if (!isOnline) {
    return (
      <View style={[styles.badge, styles.offline]}>
        <Ionicons name="cloud-offline-outline" size={14} color={colors.error} />
        <Text style={[styles.label, { color: colors.error }]}>Hors-ligne</Text>
      </View>
    )
  }

  // Tout synchro — rien à afficher
  return null
}

const styles = StyleSheet.create({
  badge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
    borderRadius:   radius.full,
  },
  label: {
    fontSize:   fontSize.xs,
    fontWeight: '600',
  },
  syncing: {
    backgroundColor: '#EFF6FF',
  },
  pending: {
    backgroundColor: '#FFFBEB',
    borderWidth:     1,
    borderColor:     '#FCD34D',
  },
  pendingText: {
    color: '#B45309',
  },
  offline: {
    backgroundColor: '#FEF2F2',
  },
})
