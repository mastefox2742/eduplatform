import { useMemo, useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity, StatusBar, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { BurgerMenu } from '@/components/ui/BurgerMenu'
import { spacing, radius, fontSize, fontWeight, shadow, useTheme } from '@/theme'
import { getFunctions, httpsCallable } from 'firebase/functions'

export default function ParentHomeScreen() {
  const { profile } = useAuth()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark])

  const fullName  = profile?.displayName ?? 'Parent'
  const initials  = fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  // Payment State
  const [showPayModal, setShowPayModal] = useState(false)
  const [network, setNetwork] = useState<'MTN' | 'AIRTEL'>('MTN')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [feeStatus, setFeeStatus] = useState<'UNPAID' | 'PENDING' | 'PAID'>('UNPAID')

  const handlePayment = async () => {
    if (phone.length < 9) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide.')
      return
    }

    setLoading(true)
    try {
      const functions = getFunctions()
      const initPayment = httpsCallable(functions, 'initializePayment')
      
      const result = await initPayment({
        feeId: 'fee-123',
        amount: 50000,
        phoneNumber: phone,
        network: network,
        schoolId: 'demo-school'
      })

      const data = result.data as any
      if (data.success) {
        setFeeStatus('PENDING')
        setShowPayModal(false)
        Alert.alert(
          'Veuillez confirmer sur votre téléphone',
          data.message || 'Un menu USSD a été envoyé sur votre téléphone. Veuillez entrer votre code PIN pour valider le paiement.'
        )
        
        // Simuler le succès après 5 secondes (Normalement géré par le Webhook)
        setTimeout(() => {
          setFeeStatus('PAID')
          Alert.alert('✅ Paiement Reçu', 'Votre paiement de 50 000 FCFA a été validé avec succès par l\'opérateur !')
        }, 8000)
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'initialiser le paiement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      {/* ── Barre de navigation ──────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <View style={styles.schoolLogo}>
            <Ionicons name="school" size={20} color={colors.white} />
          </View>
          <View>
            <Text style={styles.schoolName}>EduPlatform</Text>
            <Text style={styles.schoolSub}>Espace Parent</Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.gray[700]} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <BurgerMenu iconColor={colors.gray[700]} />
        </View>
      </View>

      <View style={styles.divider} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Bienvenue ────────────────────────────────── */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.welcomeName}>{fullName}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        </View>

        {/* ── Enfant ─────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Votre enfant</Text>
          <View style={styles.childCard}>
            <View style={styles.childAvatar}>
              <Ionicons name="person" size={24} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.childName}>Élève Démo</Text>
              <Text style={styles.childClass}>Classe: 3ème B</Text>
            </View>
            <TouchableOpacity style={styles.childAction}>
              <Text style={styles.childActionText}>Voir Profil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Résumé ─────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Résumé Scolaire</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderTopColor: colors.primary }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>14.2/20</Text>
              <Text style={styles.statLabel}>Moyenne Générale</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: '#F59E0B' }]}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>2 Jours</Text>
              <Text style={styles.statLabel}>Absences</Text>
            </View>
          </View>
        </View>

        {/* ── Alerte Finances ─────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Frais de Scolarité</Text>
          {feeStatus === 'UNPAID' && (
            <TouchableOpacity style={styles.alertBanner} activeOpacity={0.8} onPress={() => setShowPayModal(true)}>
              <Text style={{ fontSize: 18 }}>💳</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Paiement en attente</Text>
                <Text style={styles.alertSub}>Mensualité janvier 2026 (50 000 FCFA)</Text>
              </View>
              <Text style={{ color: colors.error, fontWeight: 'bold', fontSize: 12 }}>PAYER</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.error} />
            </TouchableOpacity>
          )}

          {feeStatus === 'PENDING' && (
            <View style={[styles.alertBanner, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <ActivityIndicator color="#D97706" size="small" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: '#B45309' }]}>Paiement en cours...</Text>
                <Text style={[styles.alertSub, { color: '#D97706' }]}>Veuillez taper votre code PIN sur votre téléphone.</Text>
              </View>
            </View>
          )}

          {feeStatus === 'PAID' && (
            <View style={[styles.alertBanner, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: colors.success }]}>Scolarité à jour !</Text>
                <Text style={[styles.alertSub, { color: colors.success }]}>Mensualité de janvier payée avec succès.</Text>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── Modal de Paiement Mobile Money ─────────────────────────────── */}
      <Modal visible={showPayModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payer par Mobile Money</Text>
              <TouchableOpacity onPress={() => setShowPayModal(false)}>
                <Ionicons name="close" size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalAmount}>50 000 FCFA</Text>
            <Text style={styles.modalDesc}>Mensualité Janvier 2026 - Élève Démo</Text>

            <Text style={styles.label}>Choisissez votre réseau</Text>
            <View style={styles.networkRow}>
              <TouchableOpacity 
                style={[styles.networkBtn, network === 'MTN' && styles.networkBtnActive, { borderColor: '#FBBF24' }]}
                onPress={() => setNetwork('MTN')}
              >
                <Text style={[styles.networkText, network === 'MTN' && { color: '#D97706', fontWeight: 'bold' }]}>MTN MoMo</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.networkBtn, network === 'AIRTEL' && styles.networkBtnActive, { borderColor: '#EF4444' }]}
                onPress={() => setNetwork('AIRTEL')}
              >
                <Text style={[styles.networkText, network === 'AIRTEL' && { color: '#DC2626', fontWeight: 'bold' }]}>Airtel Money</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Numéro de téléphone</Text>
            <TextInput 
              style={styles.phoneInput}
              placeholder="Ex: 06 123 45 67"
              placeholderTextColor={colors.gray[400]}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={15}
            />

            <TouchableOpacity style={styles.payBtn} onPress={handlePayment} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.payBtnText}>Confirmer le paiement</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingBottom: 40 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  topLeft:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  schoolLogo: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  schoolName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: isDark ? colors.gray[100] : colors.gray[900] },
  schoolSub:  { fontSize: 10, color: colors.gray[500] },
  topRight:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  notifDot: {
    position: 'absolute', top: 8, right: 6, width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.error, borderWidth: 1.5, borderColor: colors.surface,
  },
  divider: { height: 1, backgroundColor: colors.border },

  welcomeSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    marginBottom: spacing.lg, borderBottomWidth: 3, borderBottomColor: colors.primary + '20',
  },
  welcomeLeft:   { flex: 1 },
  greetingText:  { fontSize: fontSize.sm, color: colors.gray[500] },
  welcomeName:   { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: isDark ? colors.gray[100] : colors.gray[900], marginVertical: 4 },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  avatarInitials: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.white },

  sectionWrap:  { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: isDark ? colors.gray[100] : colors.gray[900], marginBottom: spacing.md },
  
  childCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, ...shadow.sm,
  },
  childAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  childName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: isDark ? colors.gray[100] : colors.gray[900] },
  childClass: { fontSize: fontSize.sm, color: colors.gray[500] },
  childAction: { backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  childActionText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },

  statsGrid: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderTopWidth: 3, ...shadow.sm,
  },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: 4 },
  statLabel: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: isDark ? '#451a1a' : '#FEF2F2', borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: isDark ? '#7f1d1d' : '#FECACA',
  },
  alertTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.error },
  alertSub:   { fontSize: fontSize.xs, color: '#DC2626', marginTop: 1 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, ...shadow.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[900] },
  modalAmount: { fontSize: 32, fontWeight: fontWeight.bold, color: colors.primary, textAlign: 'center', marginTop: spacing.sm },
  modalDesc: { fontSize: fontSize.sm, color: colors.gray[500], textAlign: 'center', marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[700], marginBottom: spacing.sm },
  networkRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  networkBtn: { flex: 1, padding: spacing.md, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.gray[200], alignItems: 'center' },
  networkBtnActive: { backgroundColor: colors.gray[50] },
  networkText: { fontSize: fontSize.sm, color: colors.gray[600] },
  phoneInput: { backgroundColor: colors.gray[50], borderWidth: 1, borderColor: colors.gray[200], borderRadius: radius.lg, padding: spacing.md, fontSize: fontSize.lg, color: colors.gray[900], marginBottom: spacing.xl },
  payBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
  payBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: fontWeight.bold },
})
