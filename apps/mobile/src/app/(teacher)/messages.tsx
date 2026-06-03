/**
 * Messagerie — Interface Professeur
 * Communication directe avec les parents, regroupée par élève/classe.
 */
import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { sendMsg, markThreadRead } from '@/hooks/useMessages'

// ─── Types ───────────────────────────────────────────────────────────────────

type MessageFrom = 'me' | 'parent'
type ConvTag     = 'absence' | 'note' | 'comportement' | 'general'

interface Message {
  id:    string
  from:  MessageFrom
  text:  string
  time:  string
  read:  boolean
}

interface Conversation {
  id:        string
  student:   string
  class:     string
  parent:    string
  avatar:    string
  lastMsg:   string
  lastTime:  string
  unread:    number
  online:    boolean
  tag:       ConvTag
  urgent:    boolean
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const CONVERSATIONS: Conversation[] = [
  {
    id: 'cv1', student: 'BONGO Jean', class: '3ème B', parent: 'M. BONGO Emmanuel',
    avatar: 'BE', lastMsg: "Merci professeur, nous allons y veiller à la maison.", lastTime: '10:42',
    unread: 0, online: true, tag: 'note', urgent: false,
  },
  {
    id: 'cv2', student: 'FOUDA Christelle', class: '3ème B', parent: 'Mme FOUDA Angèle',
    avatar: 'FA', lastMsg: "Christelle était malade depuis lundi, voici le certificat.", lastTime: '09:15',
    unread: 2, online: false, tag: 'absence', urgent: true,
  },
  {
    id: 'cv3', student: 'DIBAS Lucie', class: '3ème B', parent: 'M. DIBAS Richard',
    avatar: 'DR', lastMsg: "Pouvez-vous me donner plus de détails sur ses difficultés ?", lastTime: 'Hier',
    unread: 1, online: false, tag: 'note', urgent: false,
  },
  {
    id: 'cv4', student: 'EBANG Paul', class: '4ème A', parent: 'Mme EBANG Sandrine',
    avatar: 'ES', lastMsg: "Bonjour professeur, quand sont les prochains examens ?", lastTime: 'Lun',
    unread: 0, online: false, tag: 'general', urgent: false,
  },
  {
    id: 'cv5', student: 'GABIN Théo', class: '3ème B', parent: 'M. GABIN Hervé',
    avatar: 'GH', lastMsg: "Théo sera absent vendredi pour une compétition sportive.", lastTime: 'Lun',
    unread: 0, online: true, tag: 'absence', urgent: false,
  },
  {
    id: 'cv6', student: 'ABENA Marie', class: '3ème B', parent: 'Mme ABENA Cécile',
    avatar: 'AC', lastMsg: "D'accord, nous en parlons ce soir.", lastTime: 'Jeu',
    unread: 0, online: false, tag: 'comportement', urgent: false,
  },
]

const MESSAGES_BY_CONV: Record<string, Message[]> = {
  cv1: [
    { id: 'm1', from: 'me',     text: "Bonjour M. BONGO, je voulais vous informer que Jean a eu 18/20 à l'examen de vendredi. Un excellent résultat !", time: '08:30', read: true },
    { id: 'm2', from: 'parent', text: "Bonjour professeur, c'est une très bonne nouvelle ! Jean travaille beaucoup en ce moment.", time: '09:45', read: true },
    { id: 'm3', from: 'me',     text: "Cela se voit vraiment. S'il maintient ce rythme, il peut viser une mention Très Bien au bulletin.", time: '10:00', read: true },
    { id: 'm4', from: 'parent', text: "Merci professeur, nous allons y veiller à la maison.", time: '10:42', read: true },
  ],
  cv2: [
    { id: 'm1', from: 'me',     text: "Bonjour Mme FOUDA, Christelle est absente depuis lundi. Pouvez-vous nous fournir un justificatif ?", time: 'Hier 14:00', read: true },
    { id: 'm2', from: 'parent', text: "Bonjour professeur, oui elle est malade depuis lundi. Elle a une angine.", time: 'Hier 16:00', read: true },
    { id: 'm3', from: 'parent', text: "Christelle était malade depuis lundi, voici le certificat.", time: '09:10', read: false },
    { id: 'm4', from: 'parent', text: "Elle reprendra les cours lundi prochain.", time: '09:15', read: false },
  ],
  cv3: [
    { id: 'm1', from: 'me',     text: "Bonjour M. DIBAS, je souhaitais vous parler des résultats de Lucie. Elle a des difficultés en algèbre ce trimestre.", time: 'Hier 10:00', read: true },
    { id: 'm2', from: 'parent', text: "Pouvez-vous me donner plus de détails sur ses difficultés ?", time: 'Hier 18:30', read: false },
  ],
  cv4: [
    { id: 'm1', from: 'parent', text: "Bonjour professeur, quand sont les prochains examens ?", time: 'Lun 09:00', read: true },
    { id: 'm2', from: 'me',     text: "Bonjour Mme EBANG, les examens blancs sont prévus du 1er au 5 juin. Je transmettrai un planning détaillé prochainement.", time: 'Lun 11:30', read: true },
  ],
  cv5: [
    { id: 'm1', from: 'parent', text: "Théo sera absent vendredi pour une compétition sportive.", time: 'Lun 08:00', read: true },
    { id: 'm2', from: 'me',     text: "Bonjour M. GABIN, merci pour l'information. Je noterai son absence comme justifiée. Bon courage à Théo !", time: 'Lun 09:15', read: true },
  ],
  cv6: [
    { id: 'm1', from: 'me',     text: "Bonjour Mme ABENA, je voulais vous signaler que Marie a eu un comportement perturbateur lors du cours d'aujourd'hui.", time: 'Jeu 15:00', read: true },
    { id: 'm2', from: 'parent', text: "Je suis désolée professeur. Qu'est-ce qui s'est passé exactement ?", time: 'Jeu 17:00', read: true },
    { id: 'm3', from: 'me',     text: "Elle a été inattentive et a perturbé ses camarades. Un entretien serait utile si cela persiste.", time: 'Jeu 17:30', read: true },
    { id: 'm4', from: 'parent', text: "D'accord, nous en parlons ce soir.", time: 'Jeu 18:00', read: true },
  ],
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TAG_CFG: Record<ConvTag, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  absence:      { label: 'Absence',      color: colors.warning, bg: '#fef3c7', icon: 'calendar-outline'   },
  note:         { label: 'Notes',        color: colors.primary, bg: '#dbeafe', icon: 'stats-chart-outline' },
  comportement: { label: 'Comportement', color: colors.danger,  bg: '#fee2e2', icon: 'warning-outline'    },
  general:      { label: 'Général',      color: colors.gray[500], bg: colors.gray[100], icon: 'chatbubble-outline' },
}

const QUICK_MESSAGES = [
  "Votre enfant était absent(e) aujourd'hui. Merci de fournir un justificatif.",
  "Les résultats de l'examen sont disponibles. Votre enfant peut mieux faire.",
  "Félicitations ! Votre enfant a obtenu d'excellents résultats ce trimestre.",
  "Un entretien avec les parents serait souhaitable. Merci de nous contacter.",
  "Le prochain devoir surveillé est prévu la semaine prochaine.",
]

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TeacherMessagesScreen() {
  // ── Firebase ──────────────────────────────────────────────────────────────
  const { user, profile } = useAuth()
  const schoolId  = profile?.schoolId ?? 'demo'
  const teacherId = user?.uid ?? ''
  const teacherName = profile?.displayName ?? 'Professeur'

  const [activeConv, setActiveConv]   = useState<Conversation | null>(null)
  const [messages, setMessages]       = useState(MESSAGES_BY_CONV)
  const [text, setText]               = useState('')
  const [filterTag, setFilterTag]     = useState<ConvTag | 'all'>('all')
  const [showQuick, setShowQuick]     = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const totalUnread = CONVERSATIONS.reduce((s, c) => s + c.unread, 0)

  const filtered = CONVERSATIONS.filter(c =>
    filterTag === 'all' || c.tag === filterTag
  ).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))

  function openConv(conv: Conversation) {
    setMessages(prev => ({
      ...prev,
      [conv.id]: (prev[conv.id] ?? []).map(m => ({ ...m, read: true })),
    }))
    setActiveConv(conv)
    // Marque le thread comme lu en Firebase (fire-and-forget)
    markThreadRead(schoolId, conv.id, teacherId)
  }

  async function sendMessage(msgText?: string) {
    const content = (msgText ?? text).trim()
    if (!activeConv || !content) return

    // 1. Mise à jour locale instantanée
    const newMsg: Message = {
      id:   'new-' + Date.now(),
      from: 'me',
      text: content,
      time: "À l'instant",
      read: true,
    }
    setMessages(prev => ({
      ...prev,
      [activeConv.id]: [...(prev[activeConv.id] ?? []), newMsg],
    }))
    setText('')
    setShowQuick(false)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)

    // 2. Persistance Firebase en arrière-plan
    await sendMsg(schoolId, activeConv.id, teacherId, teacherName, 'teacher', content)
  }

  // ── Chat view ────────────────────────────────────────────────────
  if (activeConv) {
    const msgs = messages[activeConv.id] ?? []
    const tag  = TAG_CFG[activeConv.tag]

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setActiveConv(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.gray[700]} />
          </TouchableOpacity>
          <View style={styles.chatHeaderAvatar}>
            <Text style={styles.chatHeaderAvatarText}>{activeConv.avatar}</Text>
            {activeConv.online && <View style={styles.onlineDot} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatHeaderName}>{activeConv.parent}</Text>
            <Text style={styles.chatHeaderSub}>
              Parent de {activeConv.student} · {activeConv.class}
            </Text>
          </View>
          <View style={[styles.tagBadge, { backgroundColor: tag.bg }]}>
            <Ionicons name={tag.icon} size={12} color={tag.color} />
            <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.msgList}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
          >
            {/* Context info banner */}
            <View style={styles.contextBanner}>
              <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
              <Text style={styles.contextText}>
                Conversation avec le parent de <Text style={{ fontWeight: fontWeight.bold }}>{activeConv.student}</Text>
                {activeConv.urgent ? ' · ⚠️ Signalée urgente' : ''}
              </Text>
            </View>

            {msgs.map(msg => (
              <View
                key={msg.id}
                style={[styles.bubble, msg.from === 'me' ? styles.bubbleMe : styles.bubbleThem]}
              >
                {msg.from === 'parent' && (
                  <Text style={styles.bubbleSender}>{activeConv.parent}</Text>
                )}
                <Text style={[
                  styles.bubbleText,
                  msg.from === 'me' ? styles.bubbleTextMe : styles.bubbleTextThem,
                ]}>
                  {msg.text}
                </Text>
                <View style={styles.bubbleMeta}>
                  <Text style={[
                    styles.bubbleTime,
                    { color: msg.from === 'me' ? 'rgba(255,255,255,0.6)' : colors.gray[400] },
                  ]}>
                    {msg.time}
                  </Text>
                  {msg.from === 'me' && (
                    <Ionicons
                      name={msg.read ? 'checkmark-done' : 'checkmark'}
                      size={13}
                      color="rgba(255,255,255,0.6)"
                    />
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Quick messages */}
          {showQuick && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRow}
              style={styles.quickContainer}
            >
              {QUICK_MESSAGES.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickChip}
                  onPress={() => sendMessage(q)}
                >
                  <Text style={styles.quickChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={[styles.quickToggleBtn, showQuick && { backgroundColor: '#dbeafe' }]}
              onPress={() => setShowQuick(v => !v)}
            >
              <Ionicons name="flash-outline" size={18} color={showQuick ? colors.primary : colors.gray[400]} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message au parent…"
              placeholderTextColor={colors.gray[400]}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              onPress={() => sendMessage()}
              disabled={!text.trim()}
            >
              <Ionicons name="send" size={18} color={text.trim() ? colors.white : colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // ── List view ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={styles.headerSub}>
              {totalUnread} message{totalUnread > 1 ? 's' : ''} non lu{totalUnread > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.newBtn}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tag filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterStrip}
      >
        {(['all', 'absence', 'note', 'comportement', 'general'] as const).map(f => {
          const cfg = f !== 'all' ? TAG_CFG[f] : null
          const active = filterTag === f
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterPill,
                active && (cfg ? { backgroundColor: cfg.bg, borderColor: cfg.color } : styles.filterPillActive),
              ]}
              onPress={() => setFilterTag(f)}
            >
              {cfg && <Ionicons name={cfg.icon} size={12} color={active ? cfg.color : colors.gray[400]} />}
              <Text style={[
                styles.filterText,
                active && { color: cfg ? cfg.color : colors.white, fontWeight: fontWeight.bold },
              ]}>
                {f === 'all' ? 'Tous' : cfg!.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Conversations */}
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item: conv }) => {
          const tag = TAG_CFG[conv.tag]
          return (
            <TouchableOpacity
              style={[styles.convRow, conv.urgent && styles.convRowUrgent]}
              onPress={() => openConv(conv)}
              activeOpacity={0.7}
            >
              {/* Avatar */}
              <View style={styles.convAvatarWrap}>
                <View style={[styles.convAvatar, conv.urgent && { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.convAvatarText, conv.urgent && { color: colors.danger }]}>
                    {conv.avatar}
                  </Text>
                </View>
                {conv.online && <View style={styles.onlineDotSmall} />}
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <View style={styles.convTop}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={[styles.convParent, conv.unread > 0 && { fontWeight: fontWeight.bold }]} numberOfLines={1}>
                      {conv.parent}
                    </Text>
                    {conv.urgent && (
                      <Ionicons name="alert-circle" size={13} color={colors.danger} />
                    )}
                  </View>
                  <Text style={[styles.convTime, conv.unread > 0 && { color: colors.primary }]}>
                    {conv.lastTime}
                  </Text>
                </View>

                <View style={styles.convStudentRow}>
                  <Text style={styles.convStudent}>👤 {conv.student}</Text>
                  <Text style={styles.convClass}>{conv.class}</Text>
                  <View style={[styles.tagBadge, { backgroundColor: tag.bg }]}>
                    <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
                  </View>
                </View>

                <Text
                  style={[styles.convLastMsg, conv.unread > 0 && { color: colors.gray[700], fontWeight: fontWeight.medium }]}
                  numberOfLines={1}
                >
                  {conv.lastMsg}
                </Text>
              </View>

              {/* Unread */}
              {conv.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{conv.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        }}
      />
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
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.sm, color: colors.primary, marginTop: 1 },
  newBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },

  filterStrip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText:       { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.gray[600] },

  separator: { height: 1, backgroundColor: colors.gray[50], marginLeft: 76 },

  convRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  convRowUrgent:    { backgroundColor: '#fff8f8' },
  convAvatarWrap:   { position: 'relative' },
  convAvatar: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  convAvatarText:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  onlineDotSmall: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface,
  },
  convTop:        { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  convParent:     { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  convTime:       { fontSize: fontSize.xs, color: colors.gray[400] },
  convStudentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  convStudent:    { fontSize: fontSize.xs, color: colors.gray[500] },
  convClass:      { fontSize: fontSize.xs, color: colors.gray[400] },
  tagBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full,
  },
  tagText:      { fontSize: 9, fontWeight: fontWeight.bold },
  convLastMsg:  { fontSize: fontSize.sm, color: colors.gray[500] },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  unreadText: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.white },

  // Chat
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.xs, paddingVertical: 8,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    ...shadow.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  chatHeaderAvatar: {
    width: 38, height: 38, borderRadius: radius.full,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  chatHeaderAvatarText: { fontSize: 12, fontWeight: fontWeight.bold, color: colors.primary },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface,
  },
  chatHeaderName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  chatHeaderSub:  { fontSize: fontSize.xs, color: colors.gray[500] },

  contextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: '#eff6ff', borderRadius: radius.md, padding: spacing.sm,
    marginBottom: spacing.md, borderWidth: 1, borderColor: '#bfdbfe',
  },
  contextText: { fontSize: fontSize.xs, color: colors.primary, flex: 1, lineHeight: 16 },

  msgList: { flex: 1, backgroundColor: colors.background },
  bubble: {
    maxWidth: '78%', marginBottom: spacing.xs,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
  },
  bubbleMe:   { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 4, ...shadow.sm },
  bubbleSender: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.gray[500], marginBottom: 3 },
  bubbleText:     { fontSize: fontSize.sm, lineHeight: 20 },
  bubbleTextMe:   { color: colors.white },
  bubbleTextThem: { color: colors.gray[800] },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, justifyContent: 'flex-end' },
  bubbleTime: { fontSize: 10 },

  quickContainer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, maxHeight: 80 },
  quickRow:       { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: spacing.xs, alignItems: 'center' },
  quickChip: {
    maxWidth: 200, backgroundColor: '#eff6ff', borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 7,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  quickChipText: { fontSize: fontSize.xs, color: colors.primary, lineHeight: 16 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  quickToggleBtn: {
    width: 38, height: 38, borderRadius: radius.full,
    backgroundColor: colors.gray[100], alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: colors.gray[100], borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    fontSize: fontSize.sm, color: colors.gray[900],
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.gray[200] },
})
