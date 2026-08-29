/**
 * Validations en attente — écran direction.
 * Repris de la maquette `design/maquettes/direction---validation.html`.
 *
 * Cahier des charges §3.3, §8.3, §13.3, §20.1, §21.4.
 *
 * C'est l'écran où le directeur engage l'établissement. Signer un
 * bulletin le rend opposable ; signer un certificat produit une pièce
 * qui servira à obtenir un visa. L'écran est donc conçu pour qu'on
 * puisse aller vite **sans signer à l'aveugle** :
 *
 *  - Les anomalies sont calculées et affichées sur la carte : moyenne
 *    manquante, décision de conseil vide, absences nombreuses.
 *  - « Valider tout » ne porte que sur les bulletins sans anomalie ;
 *    les autres restent dans la file et l'écran dit combien.
 *  - Un rejet exige un motif : renvoyer un bulletin sans dire pourquoi
 *    fait perdre une journée à l'enseignant.
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors, spacing, radius, fontSize, fontWeight, fontFamily, shadow } from '@/theme'
import {
  useValidationQueue, averageTone, documentKindLabel,
  type QueueTab, type BulletinItem, type DocumentItem,
} from '@/hooks/useValidationQueue'
import { EmptyState } from '@/components/ui/DesignSystem'

// ── Tons ──────────────────────────────────────────────────────────────────────

const TONE_BG = {
  secondary: 'rgba(15,118,110,0.12)',
  accent:    'rgba(244,166,42,0.18)',
  danger:    'rgba(194,65,59,0.12)',
  muted:     colors.muted,
} as const

const TONE_FG = {
  secondary: colors.secondary,
  accent:    '#A96A0C',
  danger:    colors.danger,
  muted:     colors.mutedText,
} as const

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function DirectionValidationScreen() {
  const {
    bulletins, documents, thresholds, counts, isLoading, error, processingId,
    reload, signBulletin, rejectBulletin, signDocument, refuseDocument, signAllClean,
  } = useValidationQueue()

  const [tab, setTab] = useState<QueueTab>('bulletins')
  const [refreshing, setRefreshing] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<
    { id: string; name: string; kind: 'bulletin' | 'document' } | null
  >(null)
  const [rejectReason, setRejectReason] = useState('')

  async function handleSignAll() {
    if (counts.clean === 0) {
      Alert.alert(
        'Aucun bulletin signable en lot',
        'Tous les bulletins en attente présentent une anomalie à vérifier avant signature.',
      )
      return
    }

    Alert.alert(
      'Signer en lot',
      counts.clean === counts.bulletins
        ? `Signer les ${counts.clean} bulletins en attente ?`
        : `Signer ${counts.clean} bulletins sans anomalie ?\n${counts.bulletins - counts.clean} bulletin(s) resteront à examiner.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Signer',
          onPress: async () => {
            const { signed, skipped } = await signAllClean()
            Alert.alert(
              'Signature terminée',
              `${signed} bulletin(s) signé(s).${skipped > 0 ? `\n${skipped} laissé(s) en attente pour vérification.` : ''}`,
            )
          },
        },
      ],
    )
  }

  async function confirmReject() {
    if (!rejectTarget) return
    if (rejectReason.trim().length < 5) {
      Alert.alert('Motif requis', "Indiquez ce qui doit être corrigé : l'enseignant ne verra que ce message.")
      return
    }

    const res = rejectTarget.kind === 'bulletin'
      ? await rejectBulletin(rejectTarget.id, rejectReason.trim())
      : await refuseDocument(rejectTarget.id, rejectReason.trim())

    setRejectTarget(null)
    setRejectReason('')
    if (!res.ok) Alert.alert('Échec', res.error ?? 'Action impossible')
  }

  async function handleSignBulletin(item: BulletinItem) {
    if (item.warnings.length > 0) {
      Alert.alert(
        'Vérifier avant de signer',
        `${item.studentName} :\n\n${item.warnings.map((w) => `• ${w}`).join('\n')}\n\nSigner malgré tout ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Signer', onPress: () => void signBulletin(item.id) },
        ],
      )
      return
    }
    const res = await signBulletin(item.id)
    if (!res.ok) Alert.alert('Échec', res.error ?? 'Signature impossible')
  }

  // ── Chargement ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.centerText}>Chargement de la file…</Text>
        </View>
      </SafeAreaView>
    )
  }

  const items = tab === 'bulletins' ? bulletins : documents

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <TouchableOpacity
              accessibilityLabel="Retour"
              onPress={() => router.back()}
              style={s.backBtn}
            >
              <Ionicons name="arrow-back" size={19} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Validations en attente</Text>
          </View>
          <View style={s.countTag}>
            <Text style={s.countTagText}>{counts.total} items</Text>
          </View>
        </View>

        {/* Onglets : bulletins et documents ne se signent pas pareil. */}
        <View style={s.tabs}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTab('bulletins')}
            style={[s.tab, tab === 'bulletins' && s.tabActive]}
          >
            <Text style={[s.tabText, tab === 'bulletins' && s.tabTextActive]}>
              Bulletins ({counts.bulletins})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTab('documents')}
            style={[s.tab, tab === 'documents' && s.tabActive]}
          >
            <Text style={[s.tabText, tab === 'documents' && s.tabTextActive]}>
              Documents ({counts.documents})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await reload()
              setRefreshing(false)
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Bandeau signature ───────────────────────────────────── */}
        {tab === 'bulletins' && bulletins.length > 0 && (
          <View style={s.signBanner}>
            <View style={s.signBannerLeft}>
              <Ionicons name="shield-checkmark-outline" size={19} color={colors.secondary} />
              <Text style={s.signBannerText}>Mode signature électronique actif</Text>
            </View>
            <TouchableOpacity onPress={handleSignAll}>
              <Text style={s.signBannerAction}>Valider tout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Nombre d'items à examiner : dit franchement ce que le lot ignore. */}
        {tab === 'bulletins' && counts.bulletins > counts.clean && (
          <View style={s.warnBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#A96A0C" />
            <Text style={s.warnBannerText}>
              {counts.bulletins - counts.clean} bulletin(s) à examiner : anomalie détectée.
              Ils ne sont pas inclus dans « Valider tout ».
            </Text>
          </View>
        )}

        {error && (
          <View style={s.errorBanner}>
            <Ionicons name="close-circle" size={16} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Liste ───────────────────────────────────────────────── */}
        {items.length === 0 ? (
          <EmptyState
            icon="checkmark-done-circle-outline"
            title={tab === 'bulletins' ? 'Aucun bulletin en attente' : 'Aucun document à signer'}
            detail={
              tab === 'bulletins'
                ? 'Les bulletins apparaîtront ici dès que le Directeur des Études les aura contrôlés.'
                : 'Les demandes de certificats et attestations préparées par le secrétariat arrivent ici.'
            }
          />
        ) : tab === 'bulletins' ? (
          <View style={{ gap: spacing.sm + 4 }}>
            {bulletins.map((item) => (
              <BulletinCard
                key={item.id}
                item={item}
                thresholds={thresholds}
                busy={processingId === item.id}
                onSign={() => void handleSignBulletin(item)}
                onReject={() =>
                  setRejectTarget({ id: item.id, name: item.studentName, kind: 'bulletin' })
                }
              />
            ))}
          </View>
        ) : (
          <View style={{ gap: spacing.sm + 4 }}>
            {documents.map((item) => (
              <DocumentCard
                key={item.id}
                item={item}
                busy={processingId === item.id}
                onSign={async () => {
                  const res = await signDocument(item.id)
                  if (!res.ok) Alert.alert('Échec', res.error ?? 'Signature impossible')
                }}
                onRefuse={() =>
                  setRejectTarget({ id: item.id, name: item.title, kind: 'document' })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Motif de rejet ──────────────────────────────────────── */}
      <Modal
        visible={rejectTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectTarget(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {rejectTarget?.kind === 'bulletin' ? 'Renvoyer le bulletin' : 'Refuser la demande'}
            </Text>
            <Text style={s.modalSub}>{rejectTarget?.name}</Text>

            <Text style={s.modalLabel}>
              {rejectTarget?.kind === 'bulletin'
                ? 'Ce que l’enseignant doit corriger'
                : 'Motif du refus, communiqué au demandeur'}
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ex. : moyenne de mathématiques manquante"
              placeholderTextColor={colors.gray[400]}
              multiline
              numberOfLines={4}
              style={s.modalInput}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => { setRejectTarget(null); setRejectReason('') }}
              >
                <Text style={s.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={confirmReject}>
                <Text style={s.modalConfirmText}>Envoyer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ── Carte bulletin ────────────────────────────────────────────────────────────

function BulletinCard({
  item, thresholds, busy, onSign, onReject,
}: {
  item: BulletinItem
  thresholds: { honor: number; excellence: number; pass: number }
  busy: boolean
  onSign: () => void
  onReject: () => void
}) {
  const tone = averageTone(item.average, thresholds)

  return (
    <View style={[s.card, busy && { opacity: 0.5 }]}>
      <View style={s.cardHead}>
        <View style={s.cardHeadLeft}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarInitials}>{initials(item.studentName)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.studentName}</Text>
            <Text style={s.cardSub} numberOfLines={1}>
              {item.className ? `Classe de ${item.className}` : 'Classe non renseignée'}
              {item.periodLabel ? ` · ${item.periodLabel}` : ''}
            </Text>
          </View>
        </View>

        <View style={[s.avgTag, { backgroundColor: TONE_BG[tone] }]}>
          <Text style={[s.avgTagText, { color: TONE_FG[tone] }]}>
            {item.average != null ? `${item.average.toFixed(1)}/20` : '—'}
          </Text>
        </View>
      </View>

      {/* Contexte de décision : rang, moyenne de classe, absences. */}
      {(item.rank || item.classAverage != null || item.absences > 0) && (
        <View style={s.metaRow}>
          {item.rank && item.classSize && (
            <Text style={s.metaItem}>Rang {item.rank}/{item.classSize}</Text>
          )}
          {item.classAverage != null && (
            <Text style={s.metaItem}>Moy. classe {item.classAverage.toFixed(1)}</Text>
          )}
          {item.absences > 0 && (
            <Text style={s.metaItem}>{item.absences} absence{item.absences > 1 ? 's' : ''}</Text>
          )}
        </View>
      )}

      {/* Avis du conseil : c'est ce que le directeur contresigne. */}
      <View style={s.councilBox}>
        <Text style={s.councilLabel}>Avis conseil : </Text>
        <Text style={s.councilText}>
          {item.councilDecision ?? item.honor ?? 'Non renseigné'}
        </Text>
      </View>

      {/* Anomalies : signaler avant, pas après. */}
      {item.warnings.length > 0 && (
        <View style={s.warnBox}>
          {item.warnings.map((w) => (
            <View key={w} style={s.warnLine}>
              <Ionicons name="alert-circle" size={13} color="#A96A0C" />
              <Text style={s.warnLineText}>{w}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.cardActions}>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy}
          onPress={onReject}
          style={s.rejectBtn}
        >
          <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
          <Text style={s.rejectBtnText}>Rejeter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy}
          onPress={onSign}
          style={s.signBtn}
        >
          {busy
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Ionicons name="checkmark-done-outline" size={16} color={colors.white} />}
          <Text style={s.signBtnText}>Signer & Valider</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Carte document ────────────────────────────────────────────────────────────

function DocumentCard({
  item, busy, onSign, onRefuse,
}: {
  item: DocumentItem
  busy: boolean
  onSign: () => void
  onRefuse: () => void
}) {
  return (
    <View style={[s.card, busy && { opacity: 0.5 }]}>
      <View style={s.cardHead}>
        <View style={s.cardHeadLeft}>
          <View style={s.docIcon}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {documentKindLabel(item.kind)}
            </Text>
            <Text style={s.cardSub} numberOfLines={1}>
              {item.studentName ?? '—'}
              {item.className ? ` · ${item.className}` : ''}
            </Text>
          </View>
        </View>

        <View style={[s.deptTag, item.isUrgent && { backgroundColor: 'rgba(194,65,59,0.12)' }]}>
          <Text style={[s.deptTagText, item.isUrgent && { color: colors.danger }]}>
            {item.isUrgent ? 'Urgent' : 'Secrétariat'}
          </Text>
        </View>
      </View>

      {/* Qui demande et pourquoi : le motif engage la responsabilité. */}
      <Text style={s.docMeta}>
        Demandé par {item.requesterName ?? 'un tiers'} le {formatDate(item.createdAt)}
        {item.purpose ? ` · Motif : ${item.purpose}` : ''}
      </Text>

      {(item.copies > 1 || (item.feeAmount != null && item.feeAmount > 0)) && (
        <View style={s.metaRow}>
          {item.copies > 1 && <Text style={s.metaItem}>{item.copies} exemplaires</Text>}
          {item.feeAmount != null && item.feeAmount > 0 && (
            <Text style={[s.metaItem, !item.feePaid && { color: colors.danger }]}>
              {item.feePaid ? 'Frais réglés' : 'Frais non réglés'}
            </Text>
          )}
        </View>
      )}

      <View style={s.cardActions}>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy}
          onPress={onRefuse}
          style={s.rejectBtn}
        >
          <Text style={s.rejectBtnText}>Refuser</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy}
          onPress={onSign}
          style={[s.signBtn, { backgroundColor: colors.secondary }]}
        >
          {busy
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Ionicons name="create-outline" size={16} color={colors.white} />}
          <Text style={s.signBtnText}>Signer électroniquement</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  centerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.mutedText },

  // En-tête
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, flex: 1 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamily.heading, fontSize: fontSize.xl,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  countTag: {
    backgroundColor: 'rgba(20,93,160,0.10)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
  },
  countTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.primary,
  },

  tabs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  tab: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, backgroundColor: colors.muted,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: {
    fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs,
    fontWeight: fontWeight.medium, color: colors.mutedText,
  },
  tabTextActive: { color: colors.white, fontWeight: fontWeight.semibold },

  content: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
    gap: spacing.md,
  },

  // Bandeaux
  signBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(15,118,110,0.08)',
    borderWidth: 1, borderColor: 'rgba(15,118,110,0.25)',
    borderRadius: radius.lg, padding: spacing.sm + 4, gap: spacing.sm,
  },
  signBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  signBannerText: {
    flex: 1, fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.xs, color: colors.secondary,
  },
  signBannerAction: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.secondary,
    textDecorationLine: 'underline',
  },
  warnBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: 'rgba(244,166,42,0.10)',
    borderWidth: 1, borderColor: 'rgba(244,166,42,0.30)',
    borderRadius: radius.lg, padding: spacing.sm + 4,
  },
  warnBannerText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: '#A96A0C', lineHeight: 17 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(194,65,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(194,65,59,0.25)',
    borderRadius: radius.lg, padding: spacing.sm + 4,
  },
  errorText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },

  // Carte
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.md,
    ...shadow.sm,
  },
  cardHead: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: spacing.sm,
  },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.primary,
  },
  docIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(20,93,160,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold, color: colors.text,
  },
  cardSub: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 1 },

  avgTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  avgTagText: { fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  deptTag: {
    backgroundColor: 'rgba(20,93,160,0.08)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm,
  },
  deptTagText: {
    fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs,
    fontWeight: fontWeight.medium, color: colors.primary,
  },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  metaItem: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText },

  councilBox: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: colors.background,
    borderRadius: radius.md, padding: spacing.sm + 2,
    marginTop: spacing.sm + 4,
  },
  councilLabel: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.text,
  },
  councilText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText },

  warnBox: {
    marginTop: spacing.sm, gap: 4,
    backgroundColor: 'rgba(244,166,42,0.08)',
    borderRadius: radius.md, padding: spacing.sm,
  },
  warnLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  warnLineText: { flex: 1, fontFamily: fontFamily.body, fontSize: 11, color: '#A96A0C' },

  docMeta: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText, marginTop: spacing.sm, lineHeight: 17,
  },

  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: colors.muted,
    paddingVertical: spacing.sm + 2, borderRadius: radius.lg,
  },
  rejectBtnText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.danger,
  },
  signBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2, borderRadius: radius.lg,
  },
  signBtnText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.white,
  },

  // Modale de rejet
  modalBackdrop: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,33,61,0.45)',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'],
    padding: spacing.lg, paddingBottom: spacing.xl,
  },
  modalTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.lg,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  modalSub: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.mutedText, marginTop: 2 },
  modalLabel: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.text,
    marginTop: spacing.md, marginBottom: 6,
  },
  modalInput: {
    backgroundColor: colors.gray[100],
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.sm + 4,
    fontFamily: fontFamily.body, fontSize: fontSize.sm,
    color: colors.text, minHeight: 92, textAlignVertical: 'top',
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
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm + 4, borderRadius: radius.lg,
  },
  modalConfirmText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.white,
  },
})
