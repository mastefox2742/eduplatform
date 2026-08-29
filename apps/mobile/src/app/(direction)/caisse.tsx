/**
 * Guichet d'encaissement — direction / gestionnaire.
 *
 * Cahier des charges §14.2, §14.3, §21.4.
 *
 * Trois principes, tous appris de ce que l'écran précédent faisait mal :
 *
 *  - **Un encaissement se rattache à une échéance.** On ne tape plus le
 *    nom de l'élève à la main : on le cherche, on voit son solde, on
 *    choisit la tranche à régler. Sans ce lien, l'argent entrait en
 *    caisse mais la famille restait marquée « en retard ».
 *  - **La caisse s'ouvre et se ferme** (§14.3). Sans session ouverte,
 *    on n'encaisse pas ; à la fermeture, le caissier déclare ce qu'il a
 *    compté et l'écart est constaté, pas dissimulé.
 *  - **Le numéro de reçu vient de la base.** Un compteur côté client
 *    produirait des doublons dès que deux guichets encaissent ensemble.
 */
import { useCallback, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, fontFamily, shadow } from '@/theme'
import {
  useCashRegister, type CashMethod, type OpenInstallment, type StudentHit,
} from '@/hooks/useCashRegister'
import { formatAmount } from '@/hooks/useInvoicePayment'
import { EmptyState } from '@/components/ui/DesignSystem'

const METHODS: { id: CashMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'especes',  label: 'Espèces',  icon: 'cash-outline' },
  { id: 'cheque',   label: 'Chèque',   icon: 'document-text-outline' },
  { id: 'virement', label: 'Virement', icon: 'swap-horizontal-outline' },
  { id: 'autre',    label: 'Autre',    icon: 'ellipsis-horizontal-circle-outline' },
]

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function CaisseScreen() {
  const {
    session, results, selected, installments,
    isSearching, isLoading, isSaving, error,
    search, selectStudent, clearStudent, openSession, closeSession, record,
  } = useCashRegister()

  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<OpenInstallment | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<CashMethod>('especes')
  const [chequeNum, setChequeNum] = useState('')
  const [bankName, setBankName] = useState('')
  const [payerName, setPayerName] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [fundInput, setFundInput] = useState('')

  const onSearch = useCallback((text: string) => {
    setQuery(text)
    void search(text)
  }, [search])

  function resetForm() {
    setTarget(null)
    setAmount('')
    setChequeNum('')
    setBankName('')
    setPayerName('')
    setPayerPhone('')
  }

  async function handleRecord() {
    if (!target) return

    const value = parseFloat(amount.replace(/\s/g, '').replace(',', '.'))
    if (Number.isNaN(value)) {
      Alert.alert('Montant invalide', 'Saisissez le montant reçu.')
      return
    }
    if (!payerName.trim()) {
      Alert.alert('Payeur requis', 'Indiquez qui a remis l’argent : le reçu porte son nom.')
      return
    }

    const res = await record({
      installment: target,
      amount: value,
      method,
      chequeNum: chequeNum || undefined,
      bankName: bankName || undefined,
      payerName: payerName.trim(),
      payerPhone: payerPhone || undefined,
      notes: undefined,
    })

    if (!res.ok) {
      Alert.alert('Encaissement refusé', res.error)
      return
    }

    resetForm()
    Alert.alert(
      'Encaissement enregistré',
      `Reçu ${res.receiptNum}\n${formatAmount(value)} — le solde de la famille est mis à jour.`
    )
  }

  async function handleOpen() {
    const value = parseFloat(fundInput.replace(/\s/g, '').replace(',', '.')) || 0
    const res = await openSession(value)
    setOpenModal(false)
    setFundInput('')
    if (!res.ok) Alert.alert('Ouverture impossible', res.error)
  }

  async function handleClose() {
    const value = parseFloat(fundInput.replace(/\s/g, '').replace(',', '.'))
    if (Number.isNaN(value)) {
      Alert.alert('Comptage requis', 'Saisissez le montant réellement compté dans le tiroir.')
      return
    }
    const res = await closeSession(value)
    setCloseModal(false)
    setFundInput('')
    if (!res.ok) {
      Alert.alert('Fermeture impossible', res.error)
      return
    }
    Alert.alert(
      'Caisse fermée',
      res.variance === 0
        ? 'Comptage conforme au théorique.'
        : `Écart constaté : ${res.variance > 0 ? '+' : ''}${formatAmount(res.variance)}.\nIl est enregistré et consultable par la direction.`
    )
  }

  // ── États ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.centerText}>Chargement de la caisse…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Guichet d’encaissement</Text>
          <Text style={s.headerSub}>
            {session
              ? `Ouverte depuis ${new Date(session.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Caisse fermée'}
          </Text>
        </View>

        {session ? (
          <TouchableOpacity
            onPress={() => { setFundInput(''); setCloseModal(true) }}
            style={s.closeBtn}
          >
            <Ionicons name="lock-closed-outline" size={15} color={colors.danger} />
            <Text style={s.closeBtnText}>Fermer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => { setFundInput(''); setOpenModal(true) }}
            style={s.openBtn}
          >
            <Ionicons name="lock-open-outline" size={15} color={colors.white} />
            <Text style={s.openBtnText}>Ouvrir</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Caisse fermée : rien d'autre n'est possible ─────────── */}
      {!session ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Caisse fermée"
          detail="Ouvrez la caisse en déclarant le fond de tiroir. Tous les encaissements y seront rattachés, et l’écart sera constaté à la fermeture."
        />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            {/* ── Situation de la caisse ─────────────────────────── */}
            <View style={s.sessionCard}>
              <View style={s.sessionRow}>
                <View>
                  <Text style={s.sessionLabel}>Encaissé aujourd’hui</Text>
                  <Text style={s.sessionValue}>{formatAmount(session.collected)}</Text>
                </View>
                <View style={s.sessionRight}>
                  <Text style={s.sessionCount}>{session.count} opération{session.count > 1 ? 's' : ''}</Text>
                  <Text style={s.sessionFund}>
                    Fond : {formatAmount(session.openingBalance)}
                  </Text>
                </View>
              </View>
            </View>

            {error && (
              <View style={s.errorBanner}>
                <Ionicons name="close-circle" size={16} color={colors.danger} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Recherche d'élève ──────────────────────────────── */}
            {!selected ? (
              <View>
                <Text style={s.sectionTitle}>Rechercher l’élève</Text>
                <View style={s.searchBox}>
                  <Ionicons name="search" size={17} color={colors.mutedText} />
                  <TextInput
                    value={query}
                    onChangeText={onSearch}
                    placeholder="Nom ou matricule"
                    placeholderTextColor={colors.gray[400]}
                    style={s.searchInput}
                    autoCorrect={false}
                  />
                  {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
                </View>

                {query.length >= 2 && results.length === 0 && !isSearching && (
                  <Text style={s.noResult}>Aucun élève trouvé pour « {query} ».</Text>
                )}

                <View style={{ gap: spacing.sm, marginTop: spacing.sm + 2 }}>
                  {results.map((r) => (
                    <StudentResult key={r.id} hit={r} onPress={() => void selectStudent(r)} />
                  ))}
                </View>
              </View>
            ) : (
              <View>
                {/* ── Élève sélectionné ────────────────────────── */}
                <View style={s.selectedCard}>
                  <View style={s.selectedAvatar}>
                    <Text style={s.selectedInitials}>{initials(selected.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.selectedName} numberOfLines={1}>{selected.fullName}</Text>
                    <Text style={s.selectedMeta} numberOfLines={1}>
                      {selected.className ?? '—'}
                      {selected.studentNumber ? ` · N° ${selected.studentNumber}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => { clearStudent(); resetForm(); setQuery('') }}>
                    <Ionicons name="close-circle" size={22} color={colors.gray[400]} />
                  </TouchableOpacity>
                </View>

                {/* ── Échéances ouvertes ───────────────────────── */}
                <Text style={[s.sectionTitle, { marginTop: spacing.md }]}>
                  Échéance à régler
                </Text>

                {installments.length === 0 ? (
                  <View style={s.clearBox}>
                    <Ionicons name="checkmark-circle" size={19} color={colors.secondary} />
                    <Text style={s.clearText}>
                      Aucun impayé pour cet élève. Rien à encaisser.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: spacing.sm }}>
                    {installments.map((i) => {
                      const active = target?.id === i.id
                      return (
                        <TouchableOpacity
                          key={i.id}
                          activeOpacity={0.85}
                          onPress={() => {
                            setTarget(i)
                            // Pré-remplir avec le reste dû : c'est le cas
                            // le plus fréquent au guichet.
                            setAmount(String(Math.round(i.remaining)))
                          }}
                          style={[s.instCard, active && s.instCardActive]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={s.instLabel} numberOfLines={1}>
                              {i.label ?? 'Frais de scolarité'}
                            </Text>
                            <Text style={s.instMeta} numberOfLines={1}>
                              {i.invoiceNum} · échéance {shortDate(i.dueDate)}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[s.instAmount, i.isOverdue && { color: colors.danger }]}>
                              {formatAmount(i.remaining, i.currency)}
                            </Text>
                            {i.isOverdue && <Text style={s.instLate}>En retard</Text>}
                          </View>
                          {active && (
                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}

                {/* ── Formulaire d'encaissement ────────────────── */}
                {target && (
                  <View style={s.formCard}>
                    <Text style={s.formTitle}>Encaissement</Text>

                    <View>
                      <Text style={s.fieldLabel}>Montant reçu</Text>
                      <View style={s.amountRow}>
                        <TextInput
                          value={amount}
                          onChangeText={setAmount}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={colors.gray[400]}
                          style={s.amountInput}
                        />
                        <Text style={s.amountCurrency}>{target.currency === 'XOF' ? 'FCFA' : target.currency}</Text>
                      </View>
                      <Text style={s.fieldHint}>
                        Reste dû : {formatAmount(target.remaining, target.currency)} ·
                        un paiement partiel est accepté
                      </Text>
                    </View>

                    <View>
                      <Text style={s.fieldLabel}>Moyen de paiement</Text>
                      <View style={s.methodRow}>
                        {METHODS.map((m) => (
                          <TouchableOpacity
                            key={m.id}
                            activeOpacity={0.85}
                            onPress={() => setMethod(m.id)}
                            style={[s.methodBtn, method === m.id && s.methodBtnActive]}
                          >
                            <Ionicons
                              name={m.icon}
                              size={16}
                              color={method === m.id ? colors.white : colors.mutedText}
                            />
                            <Text
                              style={[s.methodText, method === m.id && { color: colors.white }]}
                            >
                              {m.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {method === 'cheque' && (
                      <View style={s.chequeRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.fieldLabel}>N° de chèque</Text>
                          <TextInput
                            value={chequeNum}
                            onChangeText={setChequeNum}
                            placeholder="0000000"
                            placeholderTextColor={colors.gray[400]}
                            style={s.input}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.fieldLabel}>Banque</Text>
                          <TextInput
                            value={bankName}
                            onChangeText={setBankName}
                            placeholder="Nom de la banque"
                            placeholderTextColor={colors.gray[400]}
                            style={s.input}
                          />
                        </View>
                      </View>
                    )}

                    <View>
                      <Text style={s.fieldLabel}>Personne qui règle</Text>
                      <TextInput
                        value={payerName}
                        onChangeText={setPayerName}
                        placeholder="Nom figurant sur le reçu"
                        placeholderTextColor={colors.gray[400]}
                        style={s.input}
                      />
                    </View>

                    <View>
                      <Text style={s.fieldLabel}>Téléphone (facultatif)</Text>
                      <TextInput
                        value={payerPhone}
                        onChangeText={setPayerPhone}
                        keyboardType="phone-pad"
                        placeholder="06 XXX XX XX"
                        placeholderTextColor={colors.gray[400]}
                        style={s.input}
                      />
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      disabled={isSaving}
                      onPress={handleRecord}
                      style={[s.recordBtn, isSaving && { opacity: 0.6 }]}
                    >
                      {isSaving
                        ? <ActivityIndicator color={colors.white} size="small" />
                        : <Ionicons name="receipt-outline" size={18} color={colors.white} />}
                      <Text style={s.recordBtnText}>Encaisser et éditer le reçu</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Ouverture / fermeture ────────────────────────────────── */}
      <FundModal
        visible={openModal}
        title="Ouvrir la caisse"
        detail="Déclarez le fond de tiroir présent avant le premier encaissement."
        label="Fond de caisse"
        value={fundInput}
        onChange={setFundInput}
        confirmLabel="Ouvrir"
        onConfirm={handleOpen}
        onCancel={() => setOpenModal(false)}
      />

      <FundModal
        visible={closeModal}
        title="Fermer la caisse"
        detail={
          session
            ? `Théorique : ${formatAmount(session.openingBalance + session.collected)}. Saisissez ce que vous avez réellement compté ; l’écart sera enregistré.`
            : ''
        }
        label="Montant compté"
        value={fundInput}
        onChange={setFundInput}
        confirmLabel="Fermer la caisse"
        danger
        onConfirm={handleClose}
        onCancel={() => setCloseModal(false)}
      />
    </SafeAreaView>
  )
}

// ── Résultat de recherche ─────────────────────────────────────────────────────

function StudentResult({ hit, onPress }: { hit: StudentHit; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={s.resultRow}>
      <View style={s.resultAvatar}>
        <Text style={s.resultInitials}>{initials(hit.fullName)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.resultName} numberOfLines={1}>{hit.fullName}</Text>
        <Text style={s.resultMeta} numberOfLines={1}>
          {hit.className ?? '—'}
          {hit.studentNumber ? ` · N° ${hit.studentNumber}` : ''}
        </Text>
      </View>
      {hit.balance > 0 ? (
        <View style={s.balanceTag}>
          <Text style={s.balanceText}>{formatAmount(hit.balance)}</Text>
        </View>
      ) : (
        <View style={s.clearTag}>
          <Text style={s.clearTagText}>À jour</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ── Modale de fond de caisse ──────────────────────────────────────────────────

function FundModal({
  visible, title, detail, label, value, onChange,
  confirmLabel, danger, onConfirm, onCancel,
}: {
  visible: boolean
  title: string
  detail: string
  label: string
  value: string
  onChange: (v: string) => void
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>{title}</Text>
          <Text style={s.modalDetail}>{detail}</Text>

          <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>{label}</Text>
          <View style={s.amountRow}>
            <TextInput
              value={value}
              onChangeText={onChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.gray[400]}
              style={s.amountInput}
              autoFocus
            />
            <Text style={s.amountCurrency}>FCFA</Text>
          </View>

          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalCancel} onPress={onCancel}>
              <Text style={s.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalConfirm, danger && { backgroundColor: colors.danger }]}
              onPress={onConfirm}
            >
              <Text style={s.modalConfirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  centerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.mutedText },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm, paddingBottom: spacing.sm + 4,
  },
  headerTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.lg,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  headerSub: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 1 },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  openBtnText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(194,65,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(194,65,59,0.25)',
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  closeBtnText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.danger,
  },

  content: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
    gap: spacing.md,
  },

  sessionCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl, padding: spacing.md,
    ...shadow.md,
  },
  sessionRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', gap: spacing.sm,
  },
  sessionLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.75)' },
  sessionValue: {
    fontFamily: fontFamily.heading, fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extrabold, color: colors.white, marginTop: 2,
  },
  sessionRight: { alignItems: 'flex-end' },
  sessionCount: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.white,
  },
  sessionFund: { fontFamily: fontFamily.body, fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 2 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(194,65,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(194,65,59,0.25)',
    borderRadius: radius.lg, padding: spacing.sm + 4,
  },
  errorText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },

  sectionTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm,
  },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm + 2,
  },
  searchInput: {
    flex: 1, fontFamily: fontFamily.body,
    fontSize: fontSize.base, color: colors.text, paddingVertical: 2,
  },
  noResult: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText, marginTop: spacing.sm, textAlign: 'center',
  },

  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.sm + 4,
  },
  resultAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  resultInitials: {
    fontFamily: fontFamily.heading, fontSize: 12,
    fontWeight: fontWeight.bold, color: colors.primary,
  },
  resultName: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  resultMeta: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, marginTop: 1 },
  balanceTag: {
    backgroundColor: 'rgba(194,65,59,0.10)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full,
  },
  balanceText: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.bold, color: colors.danger,
  },
  clearTag: {
    backgroundColor: 'rgba(15,118,110,0.10)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full,
  },
  clearTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.bold, color: colors.secondary,
  },

  selectedCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 2, borderColor: colors.primary,
    borderRadius: radius.xl, padding: spacing.sm + 4,
  },
  selectedAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedInitials: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  selectedName: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  selectedMeta: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 1 },

  clearBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(15,118,110,0.06)',
    borderWidth: 1, borderColor: 'rgba(15,118,110,0.22)',
    borderRadius: radius.lg, padding: spacing.md,
  },
  clearText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.secondary },

  instCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.sm + 4,
  },
  instCardActive: { borderWidth: 2, borderColor: colors.primary },
  instLabel: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  instMeta: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, marginTop: 1 },
  instAmount: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  instLate: {
    fontFamily: fontFamily.bodySemi, fontSize: 10,
    fontWeight: fontWeight.bold, color: colors.danger, marginTop: 1,
  },

  formCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.md,
    gap: spacing.md, marginTop: spacing.md,
    ...shadow.sm,
  },
  formTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  fieldLabel: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.text, marginBottom: 6,
  },
  fieldHint: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, marginTop: 6 },
  input: {
    backgroundColor: colors.gray[100],
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm + 2,
    fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.text,
  },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: spacing.sm + 4,
  },
  amountInput: {
    flex: 1, paddingVertical: spacing.sm + 4,
    fontFamily: fontFamily.heading, fontSize: fontSize.xl,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  amountCurrency: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold, color: colors.mutedText,
  },

  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  methodBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  methodBtnActive: { backgroundColor: colors.primary },
  methodText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.mutedText,
  },
  chequeRow: { flexDirection: 'row', gap: spacing.sm },

  recordBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md, borderRadius: radius.lg,
    ...shadow.sm,
  },
  recordBtnText: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.white,
  },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,33,61,0.45)' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'],
    padding: spacing.lg, paddingBottom: spacing.xl,
  },
  modalTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.lg,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  modalDetail: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText, marginTop: 4, lineHeight: 17,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalCancel: {
    flex: 1, alignItems: 'center',
    backgroundColor: colors.muted,
    paddingVertical: spacing.sm + 4, borderRadius: radius.lg,
  },
  modalCancelText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold, color: colors.text,
  },
  modalConfirm: {
    flex: 1, alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4, borderRadius: radius.lg,
  },
  modalConfirmText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.white,
  },
})
