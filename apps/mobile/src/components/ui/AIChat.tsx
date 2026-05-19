/**
 * AIChat — Composant de chat IA réutilisable
 * Connecté à Google Gemini 1.5 Flash via l'API REST
 */
import { useState, useRef, useMemo } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { spacing, radius, fontSize, fontWeight, shadow, useTheme } from '@/theme'
import { askGemini, PEDAGOGY_SYSTEM_INSTRUCTION, type GeminiContent } from '@/services/gemini'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role:    'user' | 'ai'
  content: string
  time:    string
}

interface AIChatProps {
  context?: string   // Titre du cours / exercice
  subject?: string   // Matière (Mathématiques, Français…)
  onClose?: () => void
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
}

/** Convertit l'historique UI → format attendu par Gemini */
function toGeminiHistory(messages: Message[]): GeminiContent[] {
  return messages
    .filter(m => m.role !== 'ai' || messages.indexOf(m) > 0) // Sauter le message d'accueil
    .map(m => ({
      role:  m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))
}

// ── Composant ─────────────────────────────────────────────────────────────────

// Rate limiting côté client : min 2s entre chaque message (anti-spam/abus)
const MIN_REQUEST_INTERVAL_MS = 2000

// Patterns d'injection de prompt détectés côté client (première ligne de défense)
// Pas de flag `g` → les regex ne sont pas stateful, safe avec le moteur Hermes (Android)
const CLIENT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /oublie\s+(toutes?\s+)?tes\s+instructions?/i,
  /you\s+are\s+now/i,
  /act\s+as\s+if/i,
  /forget\s+everything/i,
]

export function AIChat({ context, subject, onClose }: AIChatProps) {
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark])

  const greeting = `Bonjour ! Je suis EduBot${subject ? `, ton assistant en **${subject}**` : ''} 🤖\n\nJe suis là pour t'aider à comprendre ${context ? `"${context}"` : 'tes cours'}, résoudre des exercices et réviser efficacement.\n\nComment puis-je t'aider ?`

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: greeting, time: now() },
  ])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [lastSentAt, setLastSentAt] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  const scrollToEnd = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    // Rate limiting côté client
    const now_ms = Date.now()
    if (now_ms - lastSentAt < MIN_REQUEST_INTERVAL_MS) return
    setLastSentAt(now_ms)

    // Détection basique d'injection de prompt côté client
    const hasInjection = CLIENT_INJECTION_PATTERNS.some(p => p.test(text))
    if (hasInjection) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '⚠️ Message non autorisé. Je suis un assistant pédagogique et ne peux pas traiter ce type de demande.',
        time: now(),
      }])
      setInput('')
      return
    }

    const userMsg: Message = { role: 'user', content: text, time: now() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    scrollToEnd()

    // Instruction système enrichie avec la matière / le cours
    const systemInstruction = [
      PEDAGOGY_SYSTEM_INSTRUCTION,
      subject ? `La matière actuelle est : ${subject}.` : '',
      context ? `Le cours ou exercice en cours : "${context}".` : '',
    ].filter(Boolean).join('\n')

    try {
      const responseText = await askGemini({
        prompt:            text,
        history:           toGeminiHistory(messages),
        systemInstruction,
        temperature:       0.7,
        maxTokens:         512,
      })

      setMessages(prev => [
        ...prev,
        { role: 'ai', content: responseText, time: now() },
      ])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      // Erreur spéciale : clé API manquante
      const isKeyMissing = message.includes('Clé API Gemini manquante')
      setMessages(prev => [
        ...prev,
        {
          role:    'ai',
          content: isKeyMissing
            ? '⚠️ **Clé API Gemini non configurée.**\n\nAjoutez votre clé dans le fichier `.env.local` :\n`EXPO_PUBLIC_GEMINI_API_KEY=AIza...`\n\nObtenez une clé gratuite sur [aistudio.google.com](https://aistudio.google.com/app/apikey)'
            : `❌ Une erreur est survenue :\n${message}\n\nVérifie ta connexion internet et réessaie.`,
          time: now(),
        },
      ])
    } finally {
      setLoading(false)
      scrollToEnd()
    }
  }

  const QUICK_PROMPTS = [
    'Explique-moi ce concept',
    'Aide-moi avec un exercice',
    'Donne-moi des astuces de révision',
    'Fais un résumé du cours',
  ]

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* ── En-tête ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>🤖</Text>
          </View>
          <View>
            <Text style={styles.aiName}>EduBot — Assistant IA</Text>
            <Text style={styles.aiStatus}>● Gemini 2.5 Flash</Text>
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.gray[500]} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, i) => (
          <View key={i} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
            {msg.role === 'ai' && (
              <View style={styles.msgAvatarSmall}>
                <Text style={{ fontSize: 12 }}>🤖</Text>
              </View>
            )}
            <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
              <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                {msg.content}
              </Text>
              <Text style={[styles.bubbleTime, msg.role === 'user' && styles.bubbleTimeUser]}>
                {msg.time}
              </Text>
            </View>
          </View>
        ))}

        {/* Indicateur de frappe */}
        {loading && (
          <View style={styles.msgRow}>
            <View style={styles.msgAvatarSmall}>
              <Text style={{ fontSize: 12 }}>🤖</Text>
            </View>
            <View style={[styles.bubbleAI, styles.typingBubble]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.typingText}>EduBot écrit…</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Suggestions rapides (premier message seulement) ── */}
      {messages.length === 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
          <View style={styles.quickRow}>
            {QUICK_PROMPTS.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.quickBtn}
                onPress={() => setInput(p)}
              >
                <Text style={styles.quickBtnText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Saisie ── */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Pose ta question…"
          placeholderTextColor={colors.gray[400]}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    backgroundColor:   colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  aiAvatarText: { fontSize: 18 },
  aiName:       { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  aiStatus:     { fontSize: 10, color: colors.success, fontWeight: fontWeight.medium },
  closeBtn:     { padding: spacing.xs },

  messages: { flex: 1 },

  msgRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  msgRowUser: { flexDirection: 'row-reverse' },

  msgAvatarSmall: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },

  bubble: {
    maxWidth:    '80%',
    borderRadius: radius.lg,
    padding:      spacing.sm,
  },
  bubbleAI: {
    backgroundColor:        colors.surface,
    borderBottomLeftRadius: 4,
    ...shadow.sm,
    minWidth:               48,
    minHeight:              36,
  },
  bubbleUser: {
    backgroundColor:         colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText:     { fontSize: fontSize.sm, color: colors.gray[800], lineHeight: 20 },
  bubbleTextUser: { color: colors.white },
  bubbleTime:     { fontSize: 10, color: colors.gray[400], marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.6)' },

  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm },
  typingText:   { fontSize: fontSize.xs, color: colors.gray[500], fontStyle: 'italic' },

  quickScroll: { maxHeight: 44 },
  quickRow: {
    flexDirection:    'row',
    paddingHorizontal: spacing.md,
    paddingVertical:  spacing.xs,
    gap:              spacing.xs,
  },
  quickBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical:   6,
    borderRadius:      radius.full,
    backgroundColor:   colors.primary + '12',
    borderWidth:       1,
    borderColor:       colors.primary + '30',
  },
  quickBtnText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },

  inputRow: {
    flexDirection:    'row',
    alignItems:       'flex-end',
    padding:          spacing.sm,
    backgroundColor:  colors.surface,
    borderTopWidth:   1,
    borderTopColor:   colors.border,
    gap:              spacing.sm,
  },
  input: {
    flex:              1,
    backgroundColor:   isDark ? colors.gray[800] : colors.gray[50],
    borderRadius:      radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    fontSize:          fontSize.sm,
    color:             colors.gray[900],
    maxHeight:         100,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  sendBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
})
