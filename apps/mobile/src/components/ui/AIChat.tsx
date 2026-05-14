/**
 * AIChat — Composant de chat IA réutilisable
 * Utilisé dans les cours et exercices pour assistance intelligente
 */
import { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

interface Message {
  role:    'user' | 'ai'
  content: string
  time:    string
}

interface AIChatProps {
  context?: string   // Contexte du cours/exercice pour l'IA
  subject?: string   // Matière
  onClose?: () => void
}

// Réponses IA simulées intelligentes selon le contexte
function generateAIResponse(userMsg: string, context?: string, subject?: string): string {
  const msg = userMsg.toLowerCase()
  const sub = subject?.toLowerCase() ?? ''

  if (msg.includes('explication') || msg.includes('explique') || msg.includes('comprends pas')) {
    return `Bien sûr ! En ${subject ?? 'cette matière'}, ce concept est fondamental. ${context ? `Dans ce cours sur "${context}", ` : ''}voici comment je l'explique simplement :\n\n📌 **Principe de base** : Commence par mémoriser la définition principale.\n\n📌 **Exemple concret** : Applique-le à une situation que tu connais dans ta vie quotidienne.\n\n📌 **Astuce mémo** : Crée un moyen mnémotechnique pour t'en souvenir facilement.\n\nTu veux que j'approfondisse un point précis ?`
  }

  if (msg.includes('exercice') || msg.includes('problème') || msg.includes('résoudre')) {
    return `Super que tu travailles les exercices ! Voici ma méthode en 3 étapes :\n\n**1️⃣ Lis l'énoncé 2 fois** — identifie ce qu'on te demande.\n**2️⃣ Identifie la formule/règle** applicable à ce type de problème.\n**3️⃣ Pose ton calcul** proprement avant de résoudre.\n\nMontre-moi l'exercice et je t'aide étape par étape ! 💪`
  }

  if (msg.includes('vidéo') || msg.includes('video') || msg.includes('youtube')) {
    return `📺 Pour ${subject ?? 'cette matière'}, je te recommande de rechercher sur YouTube :\n\n• "**${subject} cours complet débutant**"\n• "**${context ?? subject} explication simple**"\n• "**${subject} bac**" pour les révisions\n\nClique sur le bouton YouTube dans la section du cours pour accéder directement aux meilleures vidéos ! 🎬`
  }

  if (msg.includes('formule') || msg.includes('règle') || msg.includes('définition')) {
    return `📖 **Définition clé en ${subject ?? 'cette matière'}** :\n\nLes formules et règles importantes sont celles que tu utiliseras le plus souvent. Je te conseille de :\n\n✅ Les écrire sur une fiche de révision\n✅ Les appliquer sur 5 exercices différents\n✅ Les réviser 15 minutes chaque soir\n\nQuelle formule précise tu cherches ? Je te l'explique en détail.`
  }

  if (msg.includes('note') || msg.includes('moyen') || msg.includes('améliorer')) {
    return `🎯 Pour améliorer ta moyenne en ${subject ?? 'cette matière'} :\n\n**Plan de travail efficace :**\n1. 📅 Révise 20 min par jour (régularité > intensité)\n2. 📝 Refais tous les anciens exercices\n3. ❓ Pose des questions dès que tu bloques\n4. 🎬 Regarde les vidéos YouTube du cours\n5. 🤝 Travaille en groupe une fois par semaine\n\nTu es capable de progresser ! Quel est ton point faible actuellement ?`
  }

  // Réponse générale
  return `Je suis ton assistant IA pour ${subject ?? 'tes cours'} ! 🤖\n\nJe peux t'aider à :\n• 📖 Expliquer les concepts du cours\n• ✏️ Résoudre des exercices étape par étape\n• 🎬 Trouver des vidéos explicatives\n• 📋 Créer des fiches de révision\n• 💡 Donner des astuces de mémorisation\n\nQu'est-ce que tu veux travailler aujourd'hui ?`
}

export function AIChat({ context, subject, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role:    'ai',
      content: `Bonjour ! Je suis ton assistant IA${subject ? ` pour **${subject}**` : ''} 🤖\n\nJe suis là pour t'aider à comprendre ${context ? `le cours sur "${context}"` : 'tes cours'}, résoudre des exercices et réviser efficacement.\n\nComment puis-je t'aider ?`,
      time:    new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      role:    'user',
      content: text,
      time:    new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 100)

    // Simule un délai réseau réaliste
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))

    const aiResponse: Message = {
      role:    'ai',
      content: generateAIResponse(text, context, subject),
      time:    new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, aiResponse])
    setLoading(false)

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const QUICK_PROMPTS = [
    'Explique-moi ce concept',
    'Aide-moi avec un exercice',
    'Trouve-moi une vidéo',
    'Donne-moi des astuces',
  ]

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>🤖</Text>
          </View>
          <View>
            <Text style={styles.aiName}>Assistant IA</Text>
            <Text style={styles.aiStatus}>● En ligne</Text>
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.gray[500]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
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

        {loading && (
          <View style={styles.msgRow}>
            <View style={styles.msgAvatarSmall}>
              <Text style={{ fontSize: 12 }}>🤖</Text>
            </View>
            <View style={styles.bubbleAI}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Suggestions rapides */}
      {messages.length === 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
          <View style={styles.quickRow}>
            {QUICK_PROMPTS.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.quickBtn}
                onPress={() => { setInput(p); }}
              >
                <Text style={styles.quickBtnText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Pose ta question..."
          placeholderTextColor={colors.gray[400]}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    backgroundColor:  colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical:  spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  aiAvatarText: { fontSize: 18 },
  aiName:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  aiStatus: { fontSize: 10, color: colors.success, fontWeight: fontWeight.medium },
  closeBtn: { padding: spacing.xs },

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
    maxWidth: '80%',
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  bubbleAI: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
    ...shadow.sm,
    minWidth: 48, minHeight: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText:     { fontSize: fontSize.sm, color: colors.gray[800], lineHeight: 20 },
  bubbleTextUser: { color: colors.white },
  bubbleTime:     { fontSize: 10, color: colors.gray[400], marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.6)' },

  quickScroll: { maxHeight: 44 },
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
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
    backgroundColor:  colors.white,
    borderTopWidth:   1,
    borderTopColor:   colors.gray[100],
    gap:              spacing.sm,
  },
  input: {
    flex:             1,
    backgroundColor:  colors.gray[50],
    borderRadius:     radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical:  spacing.sm,
    fontSize:         fontSize.sm,
    color:            colors.gray[900],
    maxHeight:        100,
    borderWidth:      1,
    borderColor:      colors.gray[200],
  },
  sendBtn: {
    width:            40,
    height:           40,
    borderRadius:     20,
    backgroundColor:  colors.primary,
    alignItems:       'center',
    justifyContent:   'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
})
