/**
 * Guichet d'Encaissement — Direction
 * Enregistrement rapide des paiements espèces / chèques au secrétariat
 * Génération reçu PDF + envoi WhatsApp optionnel au parent
 */
import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight } from '@/theme'

type Method = 'especes' | 'cheque' | 'virement' | 'autre'

const METHODS: { id: Method; label: string; icon: string }[] = [
  { id: 'especes',  label: 'Espèces',  icon: '💵' },
  { id: 'cheque',   label: 'Chèque',   icon: '🏦' },
  { id: 'virement', label: 'Virement', icon: '📤' },
  { id: 'autre',    label: 'Autre',    icon: '📌' },
]

const recordCashCF = httpsCallable(functions, 'recordCashPayment')

export default function CaisseScreen() {
  const { profile } = useAuth()
  const schoolId    = profile?.schoolId ?? 'demo'

  const [form, setForm] = useState({
    studentName:  '',
    studentId:    '',
    parentName:   '',
    parentPhone:  '',
    feeLabel:     '',
    amount:       '',
    currency:     'XOF',
    method:       'especes' as Method,
    chequeNum:    '',
    bankName:     '',
    notes:        '',
    sendWhatsApp: false,
  })
  const [saving, setSaving] = useState(false)

  // Derniers reçus émis (demo)
  const [recent, setRecent] = useState([
    { receiptNum: 'ESP-2026-00012', studentName: 'Marie Dubois',   amount: 45000, method: 'especes', currency: 'XOF' },
    { receiptNum: 'ESP-2026-00011', studentName: 'Kwamé Asante',  amount: 45000, method: 'cheque',  currency: 'XOF' },
    { receiptNum: 'ESP-2026-00010', studentName: 'Fatou Sow',      amount: 22500, method: 'especes', currency: 'XOF' },
  ])

  const handleSubmit = useCallback(async () => {
    if (!form.studentName || !form.parentName || !form.feeLabel || !form.amount) {
      Alert.alert('Champs manquants', 'Remplissez au minimum : élève, parent, objet et montant.')
      return
    }

    setSaving(true)
    try {
      if (schoolId === 'demo') {
        await new Promise(r => setTimeout(r, 800))
        const demoNum = `ESP-2026-${String(recent.length + 1).padStart(5, '0')}`
        setRecent(prev => [{ receiptNum: demoNum, studentName: form.studentName, amount: parseInt(form.amount), method: form.method, currency: form.currency }, ...prev])
        Alert.alert('✅ Reçu généré', `N° ${demoNum}\n${form.amount} ${form.currency} reçu.\nReçu PDF disponible 24h.`)
        setForm(f => ({ ...f, studentName: '', studentId: '', parentName: '', parentPhone: '', feeLabel: '', amount: '', chequeNum: '', bankName: '', notes: '' }))
        return
      }

      const res = await recordCashCF({
        schoolId,
        studentId:    form.studentId || 'manual',
        studentName:  form.studentName,
        parentName:   form.parentName,
        parentPhone:  form.parentPhone || undefined,
        feeLabel:     form.feeLabel,
        amount:       parseInt(form.amount),
        currency:     form.currency,
        method:       form.method,
        chequeNum:    form.chequeNum || undefined,
        bankName:     form.bankName  || undefined,
        notes:        form.notes     || undefined,
        sendWhatsApp: form.sendWhatsApp && !!form.parentPhone,
      }) as any

      Alert.alert(
        '✅ Paiement enregistré',
        `N° ${res.data.receiptNum}\n${form.amount} ${form.currency} reçu.` +
        (form.sendWhatsApp && form.parentPhone ? '\nReçu envoyé par WhatsApp.' : ''),
        [{ text: 'OK' }]
      )
      setForm(f => ({ ...f, studentName: '', studentId: '', parentName: '', parentPhone: '', feeLabel: '', amount: '', chequeNum: '', bankName: '', notes: '' }))
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'enregistrer le paiement.')
    } finally {
      setSaving(false)
    }
  }, [form, schoolId, recent])

  const setField = useCallback(<K extends keyof typeof form>(key: K, val: typeof form[K]) => {
    setForm(f => ({ ...f, [key]: val }))
  }, [])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="cash-outline" size={22} color={colors.white} />
            <View>
              <Text style={styles.headerTitle}>Guichet d'encaissement</Text>
              <Text style={styles.headerSub}>Paiements espèces, chèques et virements</Text>
            </View>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>

            {/* Méthode de paiement */}
            <Text style={styles.sectionLabel}>Mode de paiement</Text>
            <View style={styles.methodRow}>
              {METHODS.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.methodChip, form.method === m.id && styles.methodChipActive]}
                  onPress={() => setField('method', m.id)}
                >
                  <Text style={{ fontSize: 18 }}>{m.icon}</Text>
                  <Text style={[styles.methodLabel, form.method === m.id && { color: colors.primary, fontWeight: '700' }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Élève */}
            <Text style={styles.sectionLabel}>Élève & Parent</Text>
            <TextInput style={styles.input} placeholder="Nom complet de l'élève *" value={form.studentName} onChangeText={v => setField('studentName', v)} />
            <TextInput style={styles.input} placeholder="Nom du parent / tuteur *" value={form.parentName} onChangeText={v => setField('parentName', v)} />
            <TextInput style={styles.input} placeholder="Téléphone parent (pour WhatsApp)" value={form.parentPhone} onChangeText={v => setField('parentPhone', v)} keyboardType="phone-pad" />

            {/* Objet + Montant */}
            <Text style={styles.sectionLabel}>Paiement</Text>
            <TextInput style={styles.input} placeholder="Objet du paiement * (ex: Scolarité T2)" value={form.feeLabel} onChangeText={v => setField('feeLabel', v)} />
            <View style={styles.amountRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Montant *"
                value={form.amount}
                onChangeText={v => setField('amount', v)}
                keyboardType="number-pad"
              />
              <View style={styles.currencyPicker}>
                {['XOF', 'XAF', 'GNF'].map(c => (
                  <TouchableOpacity key={c} onPress={() => setField('currency', c)}
                    style={[styles.currencyBtn, form.currency === c && styles.currencyBtnActive]}>
                    <Text style={[styles.currencyText, form.currency === c && { color: colors.white }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Chèque */}
            {form.method === 'cheque' && (
              <>
                <TextInput style={styles.input} placeholder="N° de chèque" value={form.chequeNum} onChangeText={v => setField('chequeNum', v)} />
                <TextInput style={styles.input} placeholder="Banque émettrice" value={form.bankName} onChangeText={v => setField('bankName', v)} />
              </>
            )}

            {/* Notes */}
            <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} placeholder="Notes (optionnel)" value={form.notes} onChangeText={v => setField('notes', v)} multiline />

            {/* WhatsApp toggle */}
            <View style={styles.whatsappRow}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={styles.whatsappLabel}>Envoyer le reçu par WhatsApp</Text>
              <Switch
                value={form.sendWhatsApp}
                onValueChange={v => setField('sendWhatsApp', v)}
                trackColor={{ true: '#25D366' }}
                disabled={!form.parentPhone}
              />
            </View>
            {!form.parentPhone && form.sendWhatsApp && (
              <Text style={styles.whatsappHint}>⚠️ Entrez le numéro du parent pour activer l'envoi WhatsApp</Text>
            )}

            {/* Bouton */}
            <TouchableOpacity
              style={[styles.submitBtn, saving && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={colors.white} />
                : <><Ionicons name="receipt-outline" size={18} color={colors.white} />
                   <Text style={styles.submitBtnText}>Enregistrer et générer le reçu</Text></>
              }
            </TouchableOpacity>
          </View>

          {/* Derniers reçus */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionLabel}>Reçus récents</Text>
            {recent.map((r, i) => (
              <View key={i} style={styles.recentRow}>
                <View style={styles.recentIcon}>
                  <Text style={{ fontSize: 14 }}>{r.method === 'especes' ? '💵' : r.method === 'cheque' ? '🏦' : '📤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>{r.studentName}</Text>
                  <Text style={styles.recentNum}>{r.receiptNum}</Text>
                </View>
                <Text style={styles.recentAmount}>{r.amount.toLocaleString('fr-FR')} {r.currency}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.gray[50] },
  header:           { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#059669', padding: spacing.lg },
  headerTitle:      { fontSize: fontSize.lg, fontWeight: '800', color: colors.white },
  headerSub:        { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  form:             { padding: spacing.md, gap: spacing.sm },
  sectionLabel:     { fontSize: fontSize.xs, fontWeight: '700', color: colors.gray[500], textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: 2 },
  methodRow:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  methodChip:       { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.gray[200] },
  methodChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  methodLabel:      { fontSize: fontSize.sm, color: colors.gray[600] },
  input:            { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray[200], borderRadius: radius.md, padding: 12, fontSize: fontSize.sm, color: colors.gray[900] },
  amountRow:        { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  currencyPicker:   { flexDirection: 'row', gap: 4 },
  currencyBtn:      { paddingHorizontal: 8, paddingVertical: 10, borderRadius: radius.sm, backgroundColor: colors.gray[100] },
  currencyBtnActive:{ backgroundColor: colors.primary },
  currencyText:     { fontSize: fontSize.xs, fontWeight: '700', color: colors.gray[600] },
  whatsappRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: '#D1FAE5' },
  whatsappLabel:    { flex: 1, fontSize: fontSize.sm, color: colors.gray[700], fontWeight: '600' },
  whatsappHint:     { fontSize: fontSize.xs, color: colors.warning, marginTop: -4 },
  submitBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', borderRadius: radius.lg, padding: 15, marginTop: 6 },
  submitBtnText:    { color: colors.white, fontSize: fontSize.md, fontWeight: '800' },
  recentSection:    { padding: spacing.md, paddingTop: 0 },
  recentRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.sm, marginBottom: 6, borderWidth: 1, borderColor: colors.gray[100] },
  recentIcon:       { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray[50], justifyContent: 'center', alignItems: 'center' },
  recentName:       { fontSize: fontSize.sm, fontWeight: '600', color: colors.gray[800] },
  recentNum:        { fontSize: fontSize.xs, color: colors.gray[400] },
  recentAmount:     { fontSize: fontSize.sm, fontWeight: '700', color: '#059669' },
})
