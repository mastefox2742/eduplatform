/**
 * Paiement Scolarité — écran parent.
 * Repris de la maquette `design/maquettes/parent---paiement-scolarite.html`.
 *
 * Cahier des charges §14.2, §16.3, §22, §26.
 *
 * La règle qui structure cet écran : **il n'annonce jamais un paiement
 * réussi de sa propre initiative**. Après l'initiation, il affiche une
 * attente honnête ; seul le webhook, ayant re-confirmé auprès de
 * l'opérateur, fait passer l'écran en « paiement confirmé ».
 *
 * C'est le critère §26 : « une transaction ne devient payée qu'après
 * confirmation vérifiée du fournisseur ».
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Linking, Switch, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { colors, spacing, radius, fontSize, fontWeight, fontFamily, shadow } from '@/theme'
import {
  useInvoicePayment, formatAmount, formatDate, type PaymentMethod,
} from '@/hooks/useInvoicePayment'
import { EmptyState } from '@/components/ui/DesignSystem'

// ── Moyens de paiement ────────────────────────────────────────────────────────

interface MethodCard {
  id: PaymentMethod
  name: string
  detail: string
  badge: string
  badgeBg: string
  badgeFg: string
  /** Un paiement en espèces ne passe pas par l'application. */
  online: boolean
}

const METHODS: MethodCard[] = [
  { id: 'mtn',      name: 'MTN MoMo',       detail: 'Congo (*105#)',        badge: 'MTN',    badgeBg: '#FFCC00', badgeFg: '#14213D', online: true },
  { id: 'airtel',   name: 'Airtel Money',   detail: 'Congo (*128#)',        badge: 'airtel', badgeBg: '#E30613', badgeFg: '#FFFFFF', online: true },
  { id: 'cinetpay', name: 'CinetPay / Visa', detail: 'Cartes & agrégateur', badge: 'CP',     badgeBg: '#145DA0', badgeFg: '#FFFFFF', online: true },
  { id: 'cash',     name: 'Caisse École',   detail: 'Reçu au secrétariat',  badge: '₣',      badgeBg: '#E8EEF5', badgeFg: '#14213D', online: false },
]

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function ParentPaymentScreen() {
  const { installmentId } = useLocalSearchParams<{ installmentId?: string }>()
  const {
    installment, isLoading, error, phase, paymentUrl, failureReason,
    initiate, reset, reload,
  } = useInvoicePayment(installmentId ?? null)

  const [method, setMethod] = useState<PaymentMethod>('mtn')
  const [phone, setPhone] = useState('')
  const [wantsReceipt, setWantsReceipt] = useState(true)

  const selected = METHODS.find((m) => m.id === method)!

  async function handlePay() {
    if (!installment) return

    if (!selected.online) {
      Alert.alert(
        'Paiement en espèces',
        'Présentez-vous au secrétariat avec le numéro de facture. Un reçu numéroté vous sera remis et le solde mis à jour immédiatement.',
      )
      return
    }

    const clean = phone.replace(/\s/g, '')
    if (clean.length < 9) {
      Alert.alert('Numéro incomplet', 'Saisissez le numéro qui recevra la demande de paiement.')
      return
    }

    const res = await initiate(`+242${clean}`, method)
    if (res.ok && res.paymentUrl) {
      // L'opérateur prend la main : le parent valide son code PIN
      // sur son portail, jamais dans notre application (§21.1).
      await Linking.openURL(res.paymentUrl)
    }
  }

  // ── États explicites (§23) ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.centerText}>Chargement de la facture…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !installment) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <Header title="Paiement Scolarité" subtitle="" />
        <EmptyState
          icon="alert-circle-outline"
          title="Facture indisponible"
          detail={error ?? "Cette échéance n'existe pas, ou ne concerne pas votre enfant."}
        />
      </SafeAreaView>
    )
  }

  // ── Confirmation reçue du serveur ──────────────────────────────────────────

  if (phase === 'confirmed') {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <Header title="Paiement confirmé" subtitle={installment.studentName} />
        <View style={s.center}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={44} color={colors.secondary} />
          </View>
          <Text style={s.successTitle}>Paiement reçu</Text>
          <Text style={s.successAmount}>
            {formatAmount(installment.remaining, installment.currency)}
          </Text>
          <Text style={s.successDetail}>
            Facture {installment.invoiceNum} · confirmé par l’opérateur
          </Text>
          <TouchableOpacity style={s.successBtn} onPress={() => router.replace('/(parent)/payments')}>
            <Ionicons name="document-text-outline" size={16} color={colors.white} />
            <Text style={s.successBtnText}>Voir mon reçu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Attente de la confirmation ─────────────────────────────────────────────

  if (phase === 'awaiting') {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <Header title="Paiement en cours" subtitle={installment.studentName} />
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={s.waitTitle}>En attente de votre validation</Text>
          <Text style={s.waitDetail}>
            Un message {selected.name} est parti sur votre téléphone. Saisissez votre
            code PIN pour valider.
          </Text>
          <View style={s.waitNote}>
            <Ionicons name="information-circle-outline" size={15} color={colors.mutedText} />
            <Text style={s.waitNoteText}>
              Le paiement ne sera marqué comme réglé qu’après confirmation
              de l’opérateur. Vous pouvez fermer cet écran sans risque.
            </Text>
          </View>

          {failureReason && (
            <View style={s.warnBox}>
              <Ionicons name="time-outline" size={15} color="#A96A0C" />
              <Text style={s.warnText}>{failureReason}</Text>
            </View>
          )}

          <View style={s.waitActions}>
            {paymentUrl && (
              <TouchableOpacity style={s.secondaryBtn} onPress={() => void Linking.openURL(paymentUrl)}>
                <Text style={s.secondaryBtnText}>Rouvrir le paiement</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.ghostBtn} onPress={() => { reset(); void reload() }}>
              <Text style={s.ghostBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── Écran principal ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header
        title="Paiement Scolarité"
        subtitle={`${installment.studentName}${installment.className ? ` · ${installment.className}` : ''}`}
        secure
      />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ── Facture ────────────────────────────────────────────── */}
        <View style={s.invoiceCard}>
          <View style={s.invoiceHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.invoiceRef}>FACTURE {installment.invoiceNum}</Text>
              <Text style={s.invoiceTitle}>
                {installment.label ?? 'Frais de scolarité'}
              </Text>
              <Text style={s.invoiceDue}>
                Échéance : {formatDate(installment.dueDate)}
              </Text>
            </View>
            <View style={[s.statusTag, installment.isOverdue ? s.statusOverdue : s.statusDue]}>
              <Text style={[s.statusTagText, installment.isOverdue && { color: colors.danger }]}>
                {installment.isOverdue ? 'En retard' : 'À payer'}
              </Text>
            </View>
          </View>

          {/* Détail des lignes : le parent doit voir ce qu'il paie. */}
          <View style={s.invoiceLines}>
            {installment.lines.length === 0 ? (
              <View style={s.lineRow}>
                <Text style={s.lineLabel}>{installment.label ?? 'Frais de scolarité'}</Text>
                <Text style={s.lineAmount}>
                  {formatAmount(installment.amount, installment.currency)}
                </Text>
              </View>
            ) : (
              installment.lines.map((line) => (
                <View key={line.id} style={s.lineRow}>
                  <Text style={s.lineLabel} numberOfLines={2}>{line.label}</Text>
                  <Text style={s.lineAmount}>
                    {formatAmount(line.amount, installment.currency)}
                  </Text>
                </View>
              ))
            )}

            {installment.discountTotal > 0 && (
              <View style={s.lineRow}>
                <Text style={[s.lineLabel, { color: colors.secondary }]}>Remise appliquée</Text>
                <Text style={[s.lineAmount, { color: colors.secondary }]}>
                  − {formatAmount(installment.discountTotal, installment.currency)}
                </Text>
              </View>
            )}

            {installment.paidAmount > 0 && (
              <View style={s.lineRow}>
                <Text style={[s.lineLabel, { color: colors.secondary }]}>Déjà réglé</Text>
                <Text style={[s.lineAmount, { color: colors.secondary }]}>
                  − {formatAmount(installment.paidAmount, installment.currency)}
                </Text>
              </View>
            )}
          </View>

          <View style={s.invoiceTotal}>
            <Text style={s.totalLabel}>Montant total net</Text>
            <Text style={s.totalAmount}>
              {formatAmount(installment.remaining, installment.currency)}
            </Text>
          </View>
        </View>

        {/* ── Moyens de paiement ─────────────────────────────────── */}
        <View>
          <Text style={s.sectionTitle}>Choisissez votre mode de paiement</Text>
          <View style={s.methodGrid}>
            {METHODS.map((m) => {
              const active = m.id === method
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.85}
                  onPress={() => setMethod(m.id)}
                  style={[s.methodCard, active && s.methodCardActive]}
                >
                  <View style={s.methodTop}>
                    <View style={[s.methodBadge, { backgroundColor: m.badgeBg }]}>
                      <Text style={[s.methodBadgeText, { color: m.badgeFg }]}>{m.badge}</Text>
                    </View>
                    {active && (
                      <View style={s.methodCheck}>
                        <Ionicons name="checkmark" size={11} color={colors.white} />
                      </View>
                    )}
                  </View>
                  <Text style={s.methodName}>{m.name}</Text>
                  <Text style={s.methodDetail}>{m.detail}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* ── Numéro et options ──────────────────────────────────── */}
        {selected.online ? (
          <View style={s.formCard}>
            <View>
              <Text style={s.fieldLabel}>Numéro de téléphone {selected.name}</Text>
              <View style={s.phoneRow}>
                <Text style={s.phonePrefix}>+242</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="06 XXX XX XX"
                  placeholderTextColor={colors.gray[400]}
                  style={s.phoneInput}
                />
              </View>
              <View style={s.hintRow}>
                <Ionicons name="information-circle-outline" size={13} color={colors.mutedText} />
                <Text style={s.hintText}>
                  Une demande apparaîtra sur votre téléphone pour valider votre code PIN.
                </Text>
              </View>
            </View>

            <View style={s.receiptRow}>
              <View style={s.receiptLabel}>
                <Ionicons name="logo-whatsapp" size={17} color={colors.secondary} />
                <Text style={s.receiptText}>Recevoir le reçu officiel sur WhatsApp</Text>
              </View>
              <Switch
                value={wantsReceipt}
                onValueChange={setWantsReceipt}
                trackColor={{ false: colors.gray[300], true: 'rgba(20,93,160,0.45)' }}
                thumbColor={wantsReceipt ? colors.primary : colors.gray[100]}
              />
            </View>
          </View>
        ) : (
          <View style={s.cashCard}>
            <Ionicons name="business-outline" size={18} color={colors.primary} />
            <Text style={s.cashText}>
              Présentez le numéro <Text style={s.bold}>{installment.invoiceNum}</Text> au
              secrétariat. Le caissier enregistre le règlement et vous remet un reçu
              numéroté ; votre solde se met à jour aussitôt.
            </Text>
          </View>
        )}

        {/* ── Échec ──────────────────────────────────────────────── */}
        {phase === 'failed' && failureReason && (
          <View style={s.errorBox}>
            <Ionicons name="close-circle" size={17} color={colors.danger} />
            <Text style={s.errorText}>{failureReason}</Text>
          </View>
        )}

        {/* ── Action ─────────────────────────────────────────────── */}
        <View>
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={phase === 'initiating'}
            onPress={handlePay}
            style={[s.payBtn, phase === 'initiating' && { opacity: 0.6 }]}
          >
            {phase === 'initiating' ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="lock-closed" size={17} color={colors.white} />
            )}
            <Text style={s.payBtnText}>
              {selected.online
                ? `Payer ${formatAmount(installment.remaining, installment.currency)} avec ${selected.name}`
                : 'Voir les instructions'}
            </Text>
          </TouchableOpacity>
          <Text style={s.payNote}>
            Transaction sécurisée · Reçu horodaté avec QR code de vérification
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ── En-tête ───────────────────────────────────────────────────────────────────

function Header({
  title, subtitle, secure,
}: {
  title: string
  subtitle: string
  secure?: boolean
}) {
  return (
    <View style={s.header}>
      <View style={s.headerLeft}>
        <TouchableOpacity
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={19} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      {secure && (
        <View style={s.secureTag}>
          <Ionicons name="shield-checkmark" size={13} color={colors.secondary} />
          <Text style={s.secureText}>Sécurisé</Text>
        </View>
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingHorizontal: spacing.lg,
  },
  centerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.mutedText },
  bold: { fontFamily: fontFamily.bodySemi, fontWeight: fontWeight.bold, color: colors.text },

  // En-tête
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm, paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, flex: 1 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.lg,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  headerSub: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText },
  secureTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(15,118,110,0.10)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
  },
  secureText: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.bold, color: colors.secondary,
  },

  content: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Facture
  invoiceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.md,
    ...shadow.sm,
  },
  invoiceHead: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingBottom: spacing.sm + 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  invoiceRef: {
    fontFamily: fontFamily.bodySemi, fontSize: 10,
    fontWeight: fontWeight.bold, color: colors.mutedText,
    letterSpacing: 0.6,
  },
  invoiceTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text, marginTop: 2,
  },
  invoiceDue: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  statusDue: { backgroundColor: 'rgba(244,166,42,0.18)' },
  statusOverdue: { backgroundColor: 'rgba(194,65,59,0.12)' },
  statusTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: '#A96A0C',
  },

  invoiceLines: {
    paddingVertical: spacing.sm + 4, gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  lineLabel: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText },
  lineAmount: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.text,
  },
  invoiceTotal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.sm + 4,
  },
  totalLabel: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  totalAmount: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold, color: colors.primary,
  },

  // Moyens
  sectionTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
    marginBottom: spacing.sm + 2,
  },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  methodCard: {
    width: '47.5%', flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.sm + 6,
  },
  methodCardActive: { borderWidth: 2, borderColor: colors.primary },
  methodTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  methodBadge: {
    width: 32, height: 32, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  methodBadgeText: {
    fontFamily: fontFamily.heading, fontSize: 10, fontWeight: fontWeight.extrabold,
  },
  methodCheck: {
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  methodName: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.sm + 2,
  },
  methodDetail: { fontFamily: fontFamily.body, fontSize: 10, color: colors.mutedText, marginTop: 1 },

  // Formulaire
  formCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.md,
    gap: spacing.sm + 4,
  },
  fieldLabel: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.text, marginBottom: 6,
  },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 4,
  },
  phonePrefix: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.mutedText,
    borderRightWidth: 1, borderRightColor: colors.border,
    paddingRight: spacing.sm,
  },
  phoneInput: {
    flex: 1, paddingVertical: spacing.sm + 3, paddingLeft: spacing.sm + 2,
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.base,
    fontWeight: fontWeight.semibold, color: colors.text,
  },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6 },
  hintText: { flex: 1, fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, lineHeight: 15 },

  receiptRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: spacing.sm,
  },
  receiptLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  receiptText: {
    flex: 1, fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.xs, color: colors.text,
  },

  cashCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2,
    backgroundColor: 'rgba(20,93,160,0.05)',
    borderWidth: 1, borderColor: 'rgba(20,93,160,0.20)',
    borderRadius: radius.xl, padding: spacing.md,
  },
  cashText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, lineHeight: 18 },

  // Messages
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: 'rgba(194,65,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(194,65,59,0.25)',
    borderRadius: radius.lg, padding: spacing.sm + 4,
  },
  errorText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },
  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: 'rgba(244,166,42,0.10)',
    borderWidth: 1, borderColor: 'rgba(244,166,42,0.30)',
    borderRadius: radius.lg, padding: spacing.sm + 4,
    marginTop: spacing.md,
  },
  warnText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: '#A96A0C' },

  // Action
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius['2xl'],
    ...shadow.md,
  },
  payBtnText: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  payNote: {
    fontFamily: fontFamily.body, fontSize: 10,
    color: colors.mutedText, textAlign: 'center', marginTop: spacing.sm,
  },

  // Attente
  waitTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md,
  },
  waitDetail: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm,
    color: colors.mutedText, textAlign: 'center', lineHeight: 20,
  },
  waitNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: radius.lg, padding: spacing.sm + 4,
    marginTop: spacing.md,
  },
  waitNoteText: { flex: 1, fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, lineHeight: 16 },
  waitActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4,
    borderRadius: radius.lg,
  },
  secondaryBtnText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  ghostBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4,
    borderRadius: radius.lg, backgroundColor: colors.muted,
  },
  ghostBtnText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.text,
  },

  // Succès
  successIcon: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(15,118,110,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.lg,
    fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md,
  },
  successAmount: {
    fontFamily: fontFamily.heading, fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extrabold, color: colors.secondary,
  },
  successDetail: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText, textAlign: 'center', marginTop: 4,
  },
  successBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 4,
    borderRadius: radius.lg, marginTop: spacing.lg,
  },
  successBtnText: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.white,
  },
})
