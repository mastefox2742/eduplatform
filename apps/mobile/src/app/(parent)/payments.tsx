import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Alert, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// ── Cloud Function reçu PDF ──────────────────────────────────────────────────
const generateReceiptCF = httpsCallable<
  { paymentId: string; schoolId: string },
  { success: boolean; signedUrl: string; receiptNum: string }
>(functions, 'generatePaymentReceipt')

// ─── Types ───────────────────────────────────────────────────────────────────

type FeeStatus = 'paid' | 'pending' | 'overdue' | 'upcoming'
type Network   = 'MTN' | 'AIRTEL'

interface Fee {
  id:      string
  label:   string
  month:   string
  amount:  number
  status:  FeeStatus
  paidAt?: string
  txRef?:  string
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const FEES: Fee[] = [
  { id: 'f1', label: 'Mensualité Juin 2026',    month: 'juin 2026',    amount: 50000, status: 'upcoming' },
  { id: 'f2', label: 'Mensualité Mai 2026',     month: 'mai 2026',     amount: 50000, status: 'overdue'  },
  { id: 'f3', label: 'Mensualité Avril 2026',   month: 'avril 2026',   amount: 50000, status: 'paid',  paidAt: '2 avr. 2026',  txRef: 'TXN-2604A' },
  { id: 'f4', label: 'Mensualité Mars 2026',    month: 'mars 2026',    amount: 50000, status: 'paid',  paidAt: '3 mar. 2026',  txRef: 'TXN-2603B' },
  { id: 'f5', label: 'Mensualité Février 2026', month: 'fév. 2026',    amount: 50000, status: 'paid',  paidAt: '1 fév. 2026',  txRef: 'TXN-2602C' },
  { id: 'f6', label: 'Mensualité Janvier 2026', month: 'janv. 2026',   amount: 50000, status: 'paid',  paidAt: '4 jan. 2026',  txRef: 'TXN-2601D' },
  { id: 'f7', label: 'Frais d\'inscription',    month: 'sept. 2025',   amount: 120000,status: 'paid',  paidAt: '5 sep. 2025',  txRef: 'TXN-2509E' },
]

const STATUS_CFG: Record<FeeStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  paid:     { label: 'Payé',        color: colors.success,      bg: '#dcfce7', icon: 'checkmark-circle' },
  pending:  { label: 'En cours',    color: colors.warning,      bg: '#fef3c7', icon: 'time' },
  overdue:  { label: 'En retard',   color: colors.danger,       bg: '#fee2e2', icon: 'alert-circle' },
  upcoming: { label: 'À venir',     color: colors.gray[500],    bg: colors.gray[100], icon: 'calendar-outline' },
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ParentPaymentsScreen() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? 'demo'

  const [payFee, setPayFee] = useState<Fee | null>(null)
  const [network, setNetwork] = useState<Network>('MTN')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [fees, setFees] = useState<Fee[]>(FEES)
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null)

  const handleReceipt = useCallback(async (fee: Fee) => {
    if (schoolId === 'demo' || !fee.txRef) {
      Alert.alert('Démo', 'Les reçus PDF sont disponibles en production.')
      return
    }
    setReceiptLoading(fee.id)
    try {
      const { data } = await generateReceiptCF({ paymentId: fee.txRef, schoolId })
      await Linking.openURL(data.signedUrl)
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de générer le reçu.')
    } finally {
      setReceiptLoading(null)
    }
  }, [schoolId])

  const paid    = fees.filter(f => f.status === 'paid').length
  const overdue = fees.filter(f => f.status === 'overdue').length
  const totalPaid = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const totalDue  = fees.filter(f => f.status === 'overdue').reduce((s, f) => s + f.amount, 0)

  async function handlePayment() {
    if (!payFee) return
    if (phone.length < 9) {
      Alert.alert('Erreur', 'Numéro invalide.')
      return
    }
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(r => setTimeout(r, 1800))
      setFees(prev => prev.map(f =>
        f.id === payFee.id
          ? { ...f, status: 'paid', paidAt: "Aujourd'hui", txRef: 'TXN-NEW' + Date.now() }
          : f
      ))
      setPayFee(null)
      setPhone('')
      Alert.alert('✅ Paiement confirmé', `${fmt(payFee.amount)} envoyé sur ${phone}.\nVeuillez confirmer sur votre téléphone.`)
    } catch {
      Alert.alert('Erreur', 'Paiement échoué, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scolarité & Paiements</Text>
        <Text style={styles.headerSub}>Année scolaire 2025 – 2026</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Balance Cards ── */}
        <View style={styles.balanceRow}>
          <View style={[styles.balanceCard, { borderTopColor: colors.success }]}>
            <Text style={styles.balanceLabel}>Total payé</Text>
            <Text style={[styles.balanceValue, { color: colors.success }]}>{fmt(totalPaid)}</Text>
            <Text style={styles.balanceCount}>{paid} versements</Text>
          </View>
          <View style={[styles.balanceCard, { borderTopColor: colors.danger }]}>
            <Text style={styles.balanceLabel}>En attente</Text>
            <Text style={[styles.balanceValue, { color: overdue > 0 ? colors.danger : colors.gray[400] }]}>
              {overdue > 0 ? fmt(totalDue) : '—'}
            </Text>
            <Text style={styles.balanceCount}>{overdue} impayé{overdue !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* ── Alert if overdue ── */}
        {overdue > 0 && (
          <TouchableOpacity
            style={styles.alertBanner}
            activeOpacity={0.8}
            onPress={() => {
              const f = fees.find(f => f.status === 'overdue')
              if (f) setPayFee(f)
            }}
          >
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Paiement(s) en retard</Text>
              <Text style={styles.alertSub}>Régularisez dès maintenant pour éviter les pénalités</Text>
            </View>
            <Text style={styles.alertCta}>PAYER →</Text>
          </TouchableOpacity>
        )}

        {/* ── Fee List ── */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Historique des paiements</Text>

          {fees.map(fee => {
            const cfg = STATUS_CFG[fee.status]
            const canPay = fee.status === 'overdue' || fee.status === 'pending'

            return (
              <View key={fee.id} style={styles.feeRow}>
                {/* Icon */}
                <View style={[styles.feeIcon, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.feeLabel}>{fee.label}</Text>
                  {fee.paidAt && (
                    <Text style={styles.feeMeta}>Payé le {fee.paidAt} · {fee.txRef}</Text>
                  )}
                  {fee.status === 'paid' && (
                    <TouchableOpacity
                      style={styles.receiptBtn}
                      onPress={() => handleReceipt(fee)}
                      disabled={receiptLoading === fee.id}
                      activeOpacity={0.7}
                    >
                      {receiptLoading === fee.id
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <><Ionicons name="receipt-outline" size={11} color={colors.primary} />
                            <Text style={styles.receiptBtnText}>Reçu PDF</Text></>
                      }
                    </TouchableOpacity>
                  )}
                  {!fee.paidAt && (
                    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  )}
                </View>

                {/* Amount + Pay */}
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.feeAmount, { color: canPay ? colors.danger : colors.gray[700] }]}>
                    {fmt(fee.amount)}
                  </Text>
                  {canPay && (
                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() => setPayFee(fee)}
                    >
                      <Text style={styles.payBtnText}>Payer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })}
        </View>

        {/* ── Receipt Note ── */}
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={14} color={colors.gray[400]} />
          <Text style={styles.noteText}>
            Les reçus de paiement sont envoyés par SMS après confirmation de l'opérateur.
          </Text>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Payment Modal ── */}
      <Modal
        visible={!!payFee}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setPayFee(null)}
      >
        <View style={styles.modal}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPayFee(null)} disabled={loading}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Mobile Money</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.md }}>
            {/* Amount */}
            {payFee && (
              <View style={styles.modalAmountCard}>
                <Text style={styles.modalAmountLabel}>{payFee.label}</Text>
                <Text style={styles.modalAmount}>{fmt(payFee.amount)}</Text>
              </View>
            )}

            {/* Network */}
            <Text style={styles.modalLabel}>Réseau</Text>
            <View style={styles.networkRow}>
              {(['MTN', 'AIRTEL'] as Network[]).map(n => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.networkBtn,
                    network === n && styles.networkBtnActive,
                    { borderColor: n === 'MTN' ? '#fbbf24' : '#ef4444' },
                    network === n && { backgroundColor: n === 'MTN' ? '#fef3c7' : '#fee2e2' },
                  ]}
                  onPress={() => setNetwork(n)}
                >
                  <Text style={[
                    styles.networkText,
                    { color: network === n ? (n === 'MTN' ? '#d97706' : '#dc2626') : colors.gray[500] },
                  ]}>
                    {n === 'MTN' ? '📱 MTN MoMo' : '📱 Airtel Money'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Phone */}
            <Text style={styles.modalLabel}>Numéro de téléphone</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="Ex: 06 123 45 67"
              placeholderTextColor={colors.gray[400]}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={15}
              editable={!loading}
            />

            {/* Confirm */}
            <TouchableOpacity
              style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
              onPress={handlePayment}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <>
                    <Ionicons name="shield-checkmark" size={18} color={colors.white} />
                    <Text style={styles.confirmBtnText}>Confirmer le paiement</Text>
                  </>
              }
            </TouchableOpacity>

            <Text style={styles.secureNote}>
              🔒 Paiement sécurisé · Un message USSD sera envoyé sur votre téléphone
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },

  balanceRow: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.md,
  },
  balanceCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderTopWidth: 3, ...shadow.sm,
  },
  balanceLabel: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium, marginBottom: 4 },
  balanceValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  balanceCount: { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 2 },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    backgroundColor: '#fee2e2', borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: '#fecaca',
  },
  alertTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.danger },
  alertSub:   { fontSize: fontSize.xs, color: '#dc2626', marginTop: 1 },
  alertCta:   { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.danger },

  listContainer: {
    marginHorizontal: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, ...shadow.sm, overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  listTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[500],
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.gray[50], borderBottomWidth: 1, borderBottomColor: colors.border,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  feeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.gray[50],
  },
  feeIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  feeLabel:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800] },
  feeMeta:   { fontSize: 10, color: colors.gray[400], marginTop: 1 },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary + '40', backgroundColor: colors.primary + '08' },
  receiptBtnText: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  statusPill: {
    alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.full, marginTop: 3,
  },
  statusPillText: { fontSize: 10, fontWeight: fontWeight.bold },
  feeAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  payBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full,
  },
  payBtnText: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.white },

  note: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xs,
  },
  noteText: { fontSize: fontSize.xs, color: colors.gray[400], flex: 1, lineHeight: 16 },

  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle:      { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  modalCancelText: { fontSize: fontSize.base, color: colors.gray[500] },
  modalAmountCard: {
    backgroundColor: '#eff6ff', borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', marginBottom: spacing.md,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  modalAmountLabel: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  modalAmount:      { fontSize: 32, fontWeight: fontWeight.bold, color: colors.primary, marginTop: 4 },
  modalLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    color: colors.gray[700], marginBottom: spacing.xs,
  },
  networkRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  networkBtn: {
    flex: 1, padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.gray[200], alignItems: 'center',
  },
  networkBtnActive: {},
  networkText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  phoneInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.md,
    fontSize: fontSize.lg, color: colors.gray[900], marginBottom: spacing.md,
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 16, marginBottom: spacing.sm,
  },
  confirmBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.white },
  secureNote: {
    textAlign: 'center', fontSize: fontSize.xs, color: colors.gray[400], lineHeight: 18,
  },
})
