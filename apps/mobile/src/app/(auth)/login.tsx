import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// Comptes de démo uniquement visibles en mode développement (jamais en production)
const DEMO_ACCOUNTS = __DEV__ ? [
  { label: '👔 Direction', email: 'direction@demo.fr', password: 'demo1234' },
  { label: '📚 Professeur', email: 'prof@demo.fr',     password: 'demo1234' },
  { label: '🎓 Élève',     email: 'eleve@demo.fr',    password: 'demo1234' },
] : []

export default function LoginScreen() {
  const { login } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Champs requis', 'Veuillez saisir votre email et mot de passe.')
      return
    }

    setLoading(true)
    try {
      await login(email.trim().toLowerCase(), password)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      const msg = code === 'auth/invalid-credential' || code === 'auth/wrong-password'
        ? 'Email ou mot de passe incorrect.'
        : code === 'auth/too-many-requests'
        ? 'Trop de tentatives. Réessayez dans quelques minutes.'
        : 'Une erreur est survenue. Réessayez.'
      Alert.alert('Connexion impossible', msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email: string, password: string) => {
    setEmail(email)
    setPassword(password)
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Ionicons name="school" size={36} color={colors.white} />
            </View>
            <Text style={styles.appName}>EduPlatform</Text>
            <Text style={styles.tagline}>Gestion scolaire assistée par IA</Text>
          </View>

          {/* Carte login */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bienvenue</Text>
            <Text style={styles.cardSubtitle}>Connectez-vous à votre espace</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse email</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color={colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="prenom.nom@ecole.fr"
                  placeholderTextColor={colors.gray[400]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.gray[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPwd}
                  autoComplete="current-password"
                />
                <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.gray[400]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Mot de passe oublié */}
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Bouton connexion */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.loginBtnText}>Se connecter</Text>
              }
            </TouchableOpacity>

            {/* Comptes démo */}
            <View style={styles.demoSection}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Comptes de démonstration</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.demoGrid}>
                {DEMO_ACCOUNTS.map((demo) => (
                  <TouchableOpacity
                    key={demo.email}
                    style={styles.demoBtn}
                    onPress={() => fillDemo(demo.email, demo.password)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.demoBtnText}>{demo.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.footer}>© 2025 EduPlatform · Tous droits réservés</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.lg,
  },
  appName: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: spacing.xl,
    ...shadow.lg,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.gray[50],
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.gray[900],
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: spacing.xs,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  demoSection: {
    marginTop: spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[200],
  },
  dividerText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  demoBtn: {
    flex: 1,
    minWidth: '28%',
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  demoBtnText: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: fontSize.xs,
    marginTop: spacing.xl,
  },
})
