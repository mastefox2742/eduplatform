import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { sendMsg, markThreadRead } from '@/hooks/useMessages'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Conversation {
  id:         string
  teacher:    string
  subject:    string
  role:       string
  avatar:     string
  lastMsg:    string
  lastTime:   string
  unread:     number
  online:     boolean
}

interface Message {
  id:     string
  from:   'me' | 'them'
  text:   string
  time:   string
  read:   boolean
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', teacher: 'M. NGUEMA Pierre', subject: 'Mathématiques', role: 'Prof principal',
    avatar: 'NP', lastMsg: "Kevin a fait des progrès remarquables ce trimestre 👏", lastTime: '10:24',
    unread: 2, online: true,
  },
  {
    id: 'c2', teacher: 'Mme ONDO Claire', subject: 'Français', role: 'Prof de Français',
    avatar: 'OC', lastMsg: "Merci pour votre retour. Nous allons surveiller cela.", lastTime: 'Hier',
    unread: 0, online: false,
  },
  {
    id: 'c3', teacher: 'M. ABENA Paul', subject: 'Anglais', role: 'Prof d\'Anglais',
    avatar: 'AP', lastMsg: "Kevin can join the extra english class on Saturdays.", lastTime: 'Lun',
    unread: 1, online: true,
  },
  {
    id: 'c4', teacher: 'Direction', subject: 'Administration', role: 'Secrétariat',
    avatar: 'ADM', lastMsg: "Votre demande de certificat de scolarité est prête.", lastTime: '15 mai',
    unread: 0, online: false,
  },
]

const MESSAGES_BY_CONV: Record<string, Message[]> = {
  c1: [
    { id: 'm1', from: 'them', text: "Bonjour, je voulais vous informer que Kevin a eu 18/20 au contrôle de vendredi. Félicitations !", time: '08:45', read: true },
    { id: 'm2', from: 'me',   text: "Bonjour M. NGUEMA ! Merci beaucoup pour cette bonne nouvelle. Nous sommes très contents.", time: '09:12', read: true },
    { id: 'm3', from: 'them', text: "C'est lui qui travaille bien. Continuez à l'encourager à la maison.", time: '09:15', read: true },
    { id: 'm4', from: 'me',   text: "Nous le faisons. Est-ce qu'il peut participer aux cours de soutien du samedi ?", time: '09:30', read: true },
    { id: 'm5', from: 'them', text: "Absolument ! Le groupe commence à 08h00. C'est gratuit pour les élèves du top 10.", time: '10:10', read: true },
    { id: 'm6', from: 'them', text: "Kevin a fait des progrès remarquables ce trimestre 👏", time: '10:24', read: false },
  ],
  c2: [
    { id: 'm1', from: 'me',   text: "Bonjour Mme ONDO, Kevin a des difficultés en rédaction. Avez-vous des conseils ?", time: 'Hier 14:00', read: true },
    { id: 'm2', from: 'them', text: "Bonjour ! Oui, en effet. Je lui conseille de lire 20 minutes par jour. C'est fondamental.", time: 'Hier 15:30', read: true },
    { id: 'm3', from: 'them', text: "Merci pour votre retour. Nous allons surveiller cela.", time: 'Hier 15:32', read: true },
  ],
  c3: [
    { id: 'm1', from: 'them', text: "Hello! Kevin is doing great in oral comprehension. His written work needs improvement.", time: 'Lun 11:00', read: true },
    { id: 'm2', from: 'me',   text: "Thank you for the update. We will work on that.", time: 'Lun 12:15', read: true },
    { id: 'm3', from: 'them', text: "Kevin can join the extra english class on Saturdays.", time: 'Lun 13:00', read: false },
  ],
  c4: [
    { id: 'm1', from: 'me',   text: "Bonjour, nous avons besoin d'un certificat de scolarité pour l'ambassade.", time: '15 mai 09:00', read: true },
    { id: 'm2', from: 'them', text: "Bonjour ! Votre demande est enregistrée. Le document sera prêt sous 48h.", time: '15 mai 10:30', read: true },
    { id: 'm3', from: 'them', text: "Votre demande de certificat de scolarité est prête.", time: '15 mai 14:00', read: true },
  ],
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ParentMessagesScreen() {
  // ── Firebase ──────────────────────────────────────────────────────────────
  const { user, profile } = useAuth()
  const schoolId  = profile?.schoolId ?? 'demo'
  const parentId  = user?.uid ?? ''
  const parentName = profile?.displayName ?? 'Parent'

  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState(MESSAGES_BY_CONV)
  const [text, setText] = useState('')
  const scrollRef = useRef<ScrollView>(null)

  function openConv(conv: Conversation) {
    setMessages(prev => ({
      ...prev,
      [conv.id]: prev[conv.id].map(m => ({ ...m, read: true })),
    }))
    setActiveConv(conv)
    // Marque le thread comme lu en Firebase (fire-and-forget)
    markThreadRead(schoolId, conv.id, parentId)
  }

  async function sendMessage() {
    if (!activeConv || !text.trim()) return
    const content = text.trim()

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
      [activeConv.id]: [...prev[activeConv.id], newMsg],
    }))
    setText('')
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)

    // 2. Persistance Firebase en arrière-plan
    await sendMsg(schoolId, activeConv.id, parentId, parentName, 'parent', content)
  }

  // ── Conversation Detail ──────────────────────────────────────────
  if (activeConv) {
    const msgs = messages[activeConv.id] ?? []
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
            <Text style={styles.chatHeaderName}>{activeConv.teacher}</Text>
            <Text style={styles.chatHeaderSub}>
              {activeConv.online ? '🟢 En ligne' : activeConv.subject}
            </Text>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
          >
            {msgs.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.bubble,
                  msg.from === 'me' ? styles.bubbleMe : styles.bubbleThem,
                ]}
              >
                <Text style={[
                  styles.bubbleText,
                  msg.from === 'me' ? styles.bubbleTextMe : styles.bubbleTextThem,
                ]}>
                  {msg.text}
                </Text>
                <View style={styles.bubbleMeta}>
                  <Text style={[
                    styles.bubbleTime,
                    { color: msg.from === 'me' ? 'rgba(255,255,255,0.65)' : colors.gray[400] },
                  ]}>
                    {msg.time}
                  </Text>
                  {msg.from === 'me' && (
                    <Ionicons
                      name={msg.read ? 'checkmark-done' : 'checkmark'}
                      size={13}
                      color="rgba(255,255,255,0.65)"
                    />
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Écrire un message…"
              placeholderTextColor={colors.gray[400]}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && { backgroundColor: colors.gray[200] }]}
              onPress={sendMessage}
              disabled={!text.trim()}
            >
              <Ionicons name="send" size={18} color={text.trim() ? colors.white : colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // ── Conversation List ────────────────────────────────────────────
  const totalUnread = CONVERSATIONS.reduce((s, c) => s + c.unread, 0)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={styles.headerSub}>{totalUnread} message{totalUnread > 1 ? 's' : ''} non lu{totalUnread > 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.newBtn}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={CONVERSATIONS}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingVertical: spacing.xs }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item: conv }) => (
          <TouchableOpacity style={styles.convRow} onPress={() => openConv(conv)} activeOpacity={0.7}>
            {/* Avatar */}
            <View style={styles.convAvatar}>
              <Text style={styles.convAvatarText}>{conv.avatar}</Text>
              {conv.online && <View style={styles.onlineDotSmall} />}
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <View style={styles.convTop}>
                <Text style={[styles.convName, conv.unread > 0 && { fontWeight: fontWeight.bold }]}>
                  {conv.teacher}
                </Text>
                <Text style={[styles.convTime, conv.unread > 0 && { color: colors.primary }]}>
                  {conv.lastTime}
                </Text>
              </View>
              <Text style={styles.convRole}>{conv.role} · {conv.subject}</Text>
              <Text
                style={[styles.convLastMsg, conv.unread > 0 && { color: colors.gray[700], fontWeight: fontWeight.medium }]}
                numberOfLines={1}
              >
                {conv.lastMsg}
              </Text>
            </View>

            {/* Unread Badge */}
            {conv.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{conv.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // List Header
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

  // Conversation Row
  separator: { height: 1, backgroundColor: colors.gray[50], marginLeft: 76 },
  convRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  convAvatar: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  convAvatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  onlineDotSmall: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface,
  },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  convTime:    { fontSize: fontSize.xs, color: colors.gray[400] },
  convRole:    { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 1 },
  convLastMsg: { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.white },

  // Chat Header
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 8,
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
  callBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },

  // Messages
  messageList: { flex: 1, backgroundColor: colors.background },
  bubble: {
    maxWidth: '78%', marginBottom: spacing.xs,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    ...shadow.sm,
  },
  bubbleText: { fontSize: fontSize.sm, lineHeight: 20 },
  bubbleTextMe:   { color: colors.white },
  bubbleTextThem: { color: colors.gray[800] },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, justifyContent: 'flex-end' },
  bubbleTime: { fontSize: 10 },

  // Input Bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: colors.gray[100], borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    fontSize: fontSize.sm, color: colors.gray[900],
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
})
