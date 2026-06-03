/**
 * ChildSwitcher — Sélecteur d'enfant ultra-fluide pour les parents
 *
 * Affiché dans le header de l'espace parent.
 * Si 1 seul enfant → affiche juste son nom.
 * Si 2+ enfants    → ouvre un bottom-sheet avec la liste.
 *
 * Couleur de fond personnalisée par enfant pour identifier
 * instantanément duquel on parle.
 */
import { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  FlatList, Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, fontSize, fontWeight, spacing } from '@/theme'
import type { ChildRef } from '@school/shared-types'

// Couleurs d'avatar générées depuis le nom (déterministe)
const AVATAR_COLORS = [
  '#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626',
  '#0891B2', '#BE185D', '#65A30D',
]

function colorFromName(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xFFFFFF
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

interface Props {
  children:    ChildRef[]
  activeChild: ChildRef | null
  onSelect:    (studentId: string) => void
}

export function ChildSwitcher({ children, activeChild, onSelect }: Props) {
  const [open, setOpen] = useState(false)

  const handleSelect = useCallback((studentId: string) => {
    onSelect(studentId)
    setOpen(false)
  }, [onSelect])

  if (!activeChild) return null

  const avatarColor = colorFromName(activeChild.name)
  const hasMultiple = children.length > 1

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        style={[styles.trigger, !hasMultiple && styles.triggerSingle]}
        onPress={() => hasMultiple && setOpen(true)}
        activeOpacity={hasMultiple ? 0.7 : 1}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials(activeChild.name)}</Text>
        </View>

        {/* Infos */}
        <View style={{ flex: 1 }}>
          <Text style={styles.childName} numberOfLines={1}>{activeChild.name}</Text>
          <Text style={styles.childClass} numberOfLines={1}>
            {activeChild.className}{activeChild.levelName ? ` · ${activeChild.levelName}` : ''}
          </Text>
        </View>

        {/* Flèche si multiple */}
        {hasMultiple && (
          <Ionicons name="chevron-down" size={16} color={colors.gray[400]} />
        )}
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            <Text style={styles.sheetTitle}>Choisir un enfant</Text>
            <Text style={styles.sheetSub}>{children.length} enfant{children.length > 1 ? 's' : ''} associé{children.length > 1 ? 's' : ''} à ce compte</Text>

            <FlatList
              data={children}
              keyExtractor={c => c.studentId}
              style={{ marginTop: spacing.sm }}
              renderItem={({ item }) => {
                const isActive = item.studentId === activeChild.studentId
                const color    = colorFromName(item.name)
                return (
                  <TouchableOpacity
                    style={[styles.childRow, isActive && styles.childRowActive]}
                    onPress={() => handleSelect(item.studentId)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.childAvatar, { backgroundColor: color }]}>
                      <Text style={styles.childAvatarText}>{initials(item.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.childRowName}>{item.name}</Text>
                      <Text style={styles.childRowClass}>
                        {item.className}{item.levelName ? ` · ${item.levelName}` : ''}
                      </Text>
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger:         { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 4 },
  triggerSingle:   {},
  avatar:          { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  avatarText:      { color: '#fff', fontSize: 12, fontWeight: '800' },
  childName:       { fontSize: fontSize.sm, fontWeight: '700', color: colors.gray[900] },
  childClass:      { fontSize: fontSize.xs, color: colors.gray[400] },

  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: 40, maxHeight: '70%' },
  handle:          { width: 40, height: 4, backgroundColor: colors.gray[200], borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:      { fontSize: fontSize.lg, fontWeight: '800', color: colors.gray[900] },
  sheetSub:        { fontSize: fontSize.sm, color: colors.gray[400], marginTop: 2 },

  childRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.sm, borderRadius: radius.lg, marginBottom: 4 },
  childRowActive:  { backgroundColor: colors.primary + '10' },
  childAvatar:     { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  childAvatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  childRowName:    { fontSize: fontSize.md, fontWeight: '700', color: colors.gray[900] },
  childRowClass:   { fontSize: fontSize.sm, color: colors.gray[400], marginTop: 1 },
})
