/**
 * Finances — Frais scolaires (tableau) + Statut de carrière + Fournitures
 * Inspiré du portail universitaire : factures numérotées avec statut coloré
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { BurgerMenu } from '@/components/ui/BurgerMenu'

// ── Types ─────────────────────────────────────────────────────────────────────

type PayStatus = 'paid' | 'confirmed' | 'pending' | 'unpaid'

interface Invoice {
  id:          string   // Numéro de facture
  label:       string
  amount:      number
  date:        string
  status:      PayStatus
  notif?:      string   // Message de la direction
}

interface Supply {
  id:       string
  name:     string
  subject:  string
  quantity: number
  unit:     string
  acquired: boolean
  price?:   number
}

// ── Données démo ──────────────────────────────────────────────────────────────

const STUDENT_INFO = {
  name:          'Aminata Bah',
  class:         '3ème B',
  program:       'Enseignement Général',
  school:        'Collège Demo de Conakry',
  year:          '2025/2026',
  enrollDate:    '01/09/2025',
  status:        'Actif',
  statusColor:   colors.success,
  examsCount:    12,
  examsPassed:   10,
  average:       14.2,
  rank:          '5ème / 32',
  absences:      2,
  conduct:       'Très bien',
}

const INVOICES: Invoice[] = [
  {
    id: 'FAC-2025-001',
    label: 'Frais d\'inscription',
    amount: 150000,
    date: '01/09/2025',
    status: 'confirmed',
    notif: '✅ Inscription confirmée. Bienvenue Aminata pour l\'année 2025-2026.',
  },
  {
    id: 'FAC-2025-002',
    label: 'Mensualité Octobre',
    amount: 45000,
    date: '05/10/2025',
    status: 'confirmed',
  },
  {
    id: 'FAC-2025-003',
    label: 'Mensualité Novembre',
    amount: 45000,
    date: '05/11/2025',
    status: 'paid',
  },
  {
    id: 'FAC-2025-004',
    label: 'Transport — T1',
    amount: 60000,
    date: '01/10/2025',
    status: 'confirmed',
  },
  {
    id: 'FAC-2025-005',
    label: 'Cantine — Novembre',
    amount: 30000,
    date: '05/11/2025',
    status: 'paid',
  },
  {
    id: 'FAC-2025-006',
    label: 'Mensualité Décembre',
    amount: 45000,
    date: '05/12/2025',
    status: 'pending',
    notif: '⚠️ Paiement partiel reçu (20 000 GNF). Reste 25 000 GNF à régler avant le 20/12.',
  },
  {
    id: 'FAC-2026-001',
    label: 'Mensualité Janvier',
    amount: 45000,
    date: '05/01/2026',
    status: 'unpaid',
    notif: '🔴 Mensualité de janvier impayée. Merci de régulariser rapidement.',
  },
  {
    id: 'FAC-2026-002',
    label: 'Transport — T2',
    amount: 60000,
    date: '10/01/2026',
    status: 'unpaid',
    notif: '📌 Transport 2ème trimestre à régler avant le 10 janvier.',
  },
  {
    id: 'FAC-2026-003',
    label: 'Sortie pédagogique',
    amount: 15000,
    date: '15/02/2026',
    status: 'pending',
    notif: '🎒 Sortie au musée national le 20 février. Participation : 15 000 GNF.',
  },
]

const SUPPLIES: Supply[] = [
  { id: 's1',  name: 'Cahier grand format 200p', subject: 'Général',       quantity: 5, unit: 'cahiers', acquired: true,  price: 12000 },
  { id: 's2',  name: 'Stylos bille bleu',        subject: 'Général',       quantity: 10, unit: 'stylos', acquired: true,  price: 5000  },
  { id: 's3',  name: 'Stylos bille rouge',       subject: 'Général',       quantity: 3,  unit: 'stylos', acquired: false, price: 1500  },
  { id: 's4',  name: 'Crayon à papier HB',       subject: 'Général',       quantity: 4,  unit: 'pièces', acquired: true,  price: 2000  },
  { id: 's5',  name: 'Règle 30 cm',              subject: 'Général',       quantity: 1,  unit: 'pièce',  acquired: true,  price: 2500  },
  { id: 's6',  name: 'Gomme + Taille-crayon',    subject: 'Général',       quantity: 1,  unit: 'set',    acquired: false, price: 2500  },
  { id: 's7',  name: 'Classeur A4',              subject: 'Général',       quantity: 2,  unit: 'pièces', acquired: false, price: 8000  },
  { id: 's8',  name: 'Compas + Rapporteur',      subject: 'Mathématiques', quantity: 1,  unit: 'set',    acquired: true,  price: 6000  },
  { id: 's9',  name: 'Calculatrice scientifique',subject: 'Mathématiques', quantity: 1,  unit: 'pièce',  acquired: true,  price: 45000 },
  { id: 's10', name: 'Blouse de laboratoire',    subject: 'Sciences',      quantity: 1,  unit: 'pièce',  acquired: false, price: 25000 },
  { id: 's11', name: 'Cahier de labo quadrillé', subject: 'Sciences',      quantity: 2,  unit: 'cahiers',acquired: false, price: 6000  },
  { id: 's12', name: 'Dictionnaire français',    subject: 'Français',      quantity: 1,  unit: 'pièce',  acquired: true,  price: 35000 },
  { id: 's13', name: 'Roman au programme',       subject: 'Français',      quantity: 1,  unit: 'pièce',  acquired: false, price: 12000 },
  { id: 's14', name: 'Dictionnaire anglais-fr',  subject: 'Anglais',       quantity: 1,  unit: 'pièce',  acquired: false, price: 28000 },
]

// ── Config statuts ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<PayStatus, { dot: string; label: string; labelColor: string }> = {
  confirmed: { dot: '#16a34a', label: 'Payé confirmé', labelColor: '#16a34a' },
  paid:      { dot: '#16a34a', label: 'Payé',          labelColor: '#16a34a' },
  pending:   { dot: '#eab308', label: 'En attente',    labelColor: '#854d0e' },
  unpaid:    { dot: '#dc2626', label: 'Non payé',      labelColor: '#dc2626' },
}

function fmt(n: number) { return n.toLocaleString('fr') + ' GNF' }

// ── Modal détail facture ──────────────────────────────────────────────────────

function InvoiceModal({ inv, onClose }: { inv: Invoice | null; onClose: () => void }) {
  if (!inv) return null
  const cfg = STATUS_CFG[inv.status]
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.mHead}>
          <TouchableOpacity onPress={onClose} style={styles.mClose}>
            <Ionicons name="close" size={22} color={colors.gray[600]} />
          </TouchableOpacity>
          <Text style={styles.mTitle}>Détail de la facture</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
          {/* Hero */}
          <View style={[styles.mHero, { backgroundColor: cfg.dot + '12' }]}>
            <View style={[styles.mDotBig, { backgroundColor: cfg.dot }]} />
            <Text style={[styles.mHeroStatus, { color: cfg.dot }]}>{cfg.label}</Text>
            <Text style={styles.mHeroLabel}>{inv.label}</Text>
            <Text style={styles.mHeroId}>N° {inv.id}</Text>
          </View>
          {/* Details */}
          <View style={styles.mCard}>
            <Row k="Numéro de facture"  v={inv.id} />
            <Row k="Libellé"            v={inv.label} />
            <Row k="Montant"            v={fmt(inv.amount)} bold />
            <Row k="Date d'échéance"    v={inv.date} />
            <Row k="Statut"             v={cfg.label} color={cfg.dot} />
          </View>
          {/* Direction message */}
          {inv.notif && (
            <View style={styles.mNotif}>
              <View style={styles.mNotifHead}>
                <Ionicons name="megaphone" size={15} color={colors.primary} />
                <Text style={styles.mNotifTitle}>Message de la direction</Text>
              </View>
              <Text style={styles.mNotifBody}>{inv.notif}</Text>
            </View>
          )}
          {/* Payment info */}
          {(inv.status === 'unpaid' || inv.status === 'pending') && (
            <View style={styles.mPayInfo}>
              <Text style={styles.mPayTitle}>💳 Comment régler ?</Text>
              <Text style={styles.mPayBody}>
                Présentez-vous au secrétariat de l'école avec le montant exact en espèces.{'\n'}
                Un reçu officiel vous sera remis.{'\n\n'}
                📍 Secrétariat : Lun–Ven, 8h–15h{'\n'}
                📞 +224 600 000 000
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function Row({ k, v, bold, color }: { k: string; v: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.rowLine}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={[styles.rowVal, bold && { fontWeight: fontWeight.bold }, color ? { color } : {}]}>{v}</Text>
    </View>
  )
}

// ── Légende statuts ────────────────────────────────────────────────────────────

function Legend() {
  return (
    <View style={styles.legend}>
      <Text style={styles.legendTitle}>Légende :</Text>
      <View style={styles.legendSep} />
      {[
        { dot: '#dc2626', label: 'Non payé' },
        { dot: '#eab308', label: 'Paiement en attente' },
        { dot: '#16a34a', label: 'Payé / Payé confirmé' },
      ].map(item => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.dot }]} />
          <Text style={styles.legendLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

// ── Écran principal ────────────────────────────────────────────────────────────

export default function FinancesScreen() {
  const [tab,         setTab]         = useState<'fees' | 'career' | 'supplies'>('fees')
  const [selInvoice,  setSelInvoice]  = useState<Invoice | null>(null)
  const [supplies,    setSupplies]    = useState<Supply[]>(SUPPLIES)
  const [sortStatus,  setSortStatus]  = useState(false)

  // Stats frais
  const totalDue   = INVOICES.reduce((s, i) => s + i.amount, 0)
  const totalPaid  = INVOICES.filter(i => i.status === 'paid' || i.status === 'confirmed').reduce((s, i) => s + i.amount, 0)
  const unpaidList = INVOICES.filter(i => i.status === 'unpaid')
  const notifList  = INVOICES.filter(i => i.notif && i.status !== 'confirmed')

  // Tri optionnel par statut
  const displayedInvoices = sortStatus
    ? [...INVOICES].sort((a, b) => {
        const order: Record<PayStatus, number> = { unpaid: 0, pending: 1, paid: 2, confirmed: 3 }
        return order[a.status] - order[b.status]
      })
    : INVOICES

  // Stats fournitures
  const totalS    = supplies.length
  const acqS      = supplies.filter(s => s.acquired).length
  const pctS      = totalS > 0 ? Math.round((acqS / totalS) * 100) : 0
  const subGroups = supplies.reduce<Record<string, Supply[]>>((acc, s) => {
    if (!acc[s.subject]) acc[s.subject] = []
    acc[s.subject].push(s)
    return acc
  }, {})

  const toggleSupply = (id: string) =>
    setSupplies(prev => prev.map(s => s.id === id ? { ...s, acquired: !s.acquired } : s))

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>💰 Finances</Text>
          <Text style={styles.headerSub}>Suivi scolaire · {STUDENT_INFO.year}</Text>
        </View>
        <BurgerMenu iconColor={colors.gray[700]} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'fees',     icon: 'receipt-outline',    label: 'Frais'       },
          { key: 'career',   icon: 'school-outline',     label: 'Carrière'    },
          { key: 'supplies', icon: 'bag-outline',        label: 'Fournitures' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key as any)}
          >
            <Ionicons name={t.icon as any} size={15} color={tab === t.key ? colors.primary : colors.gray[400]} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══ FRAIS SCOLAIRES ══ */}
      {tab === 'fees' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Bilan rapide */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceVal}>{fmt(totalPaid)}</Text>
                <Text style={styles.balanceKey}>Total payé</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <Text style={[styles.balanceVal, { color: colors.error }]}>{fmt(totalDue - totalPaid)}</Text>
                <Text style={styles.balanceKey}>Reste dû</Text>
              </View>
            </View>
            {/* Progress */}
            <View style={styles.balanceBar}>
              <View style={[styles.balanceFill, { width: `${Math.round(totalPaid / totalDue * 100)}%` as any }]} />
            </View>
            <Text style={styles.balancePct}>{Math.round(totalPaid / totalDue * 100)}% réglé sur {fmt(totalDue)}</Text>
          </View>

          {/* Alertes direction */}
          {notifList.length > 0 && (
            <View style={styles.alertBox}>
              <View style={styles.alertBoxHead}>
                <Ionicons name="megaphone" size={14} color={colors.primary} />
                <Text style={styles.alertBoxTitle}>Notifications de la direction ({notifList.length})</Text>
              </View>
              {notifList.map(inv => (
                <TouchableOpacity key={inv.id} style={styles.alertRow} onPress={() => setSelInvoice(inv)}>
                  <View style={[styles.alertDot, { backgroundColor: STATUS_CFG[inv.status].dot }]} />
                  <Text style={styles.alertText} numberOfLines={1}>{inv.notif}</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.gray[400]} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Tableau des addebiti */}
          <View style={styles.tableWrap}>
            <Text style={styles.tableHeading}>Addebiti fatturati</Text>

            {/* Header tableau */}
            <View style={styles.tableHead}>
              <Text style={[styles.thCell, { flex: 2 }]}>Facture</Text>
              <Text style={[styles.thCell, styles.thRight, { flex: 1.2 }]}>Importo</Text>
              <TouchableOpacity
                style={[styles.thCell, styles.thRight, { flex: 1.8, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }]}
                onPress={() => setSortStatus(s => !s)}
              >
                <Text style={styles.thCellText}>Stato Pag.</Text>
                <Ionicons name="swap-vertical" size={13} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            {/* Lignes */}
            {displayedInvoices.map((inv, idx) => {
              const cfg = STATUS_CFG[inv.status]
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                  onPress={() => setSelInvoice(inv)}
                  activeOpacity={0.7}
                >
                  {/* Facture N° */}
                  <View style={[{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    <Text style={styles.tdPlus}>+</Text>
                    <Text style={styles.tdId}>{inv.id.replace('FAC-', '')}</Text>
                  </View>
                  {/* Montant */}
                  <Text style={[styles.tdAmount, { flex: 1.2, textAlign: 'right' }]}>
                    {(inv.amount / 1000).toFixed(0)}k
                  </Text>
                  {/* Statut */}
                  <View style={[{ flex: 1.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }]}>
                    <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
                    <Text style={[styles.tdStatus, { color: cfg.labelColor }]} numberOfLines={1}>
                      {cfg.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Légende */}
          <Legend />

          {/* Barre de recherche décorative */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.gray[400]} />
            <Text style={styles.searchPlaceholder}>Rechercher une facture...</Text>
          </View>
        </ScrollView>
      )}

      {/* ══ CARRIÈRE / STATUS ÉLÈVE ══ */}
      {tab === 'career' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Dati personali */}
          <View style={styles.careerSection}>
            <TouchableOpacity style={styles.careerToggle}>
              <Text style={styles.careerToggleTitle}>Dati personnali</Text>
              <Text style={styles.careerToggleSub}>Voir les détails ▶</Text>
            </TouchableOpacity>
          </View>

          {/* Status élève */}
          <View style={styles.careerSection}>
            <View style={styles.careerToggle}>
              <Text style={styles.careerToggleTitle}>Status de l'élève</Text>
              <Text style={[styles.careerToggleSub, { color: colors.primary }]}>Masquer ▼</Text>
            </View>

            <View style={styles.careerBody}>
              <CareerRow k="Année académique"   v={STUDENT_INFO.year} bold />
              <CareerRow k="Classe"              v={STUDENT_INFO.class} bold />
              <CareerRow k="Date d'inscription" v={STUDENT_INFO.enrollDate} />

              {/* Status avec dot */}
              <View style={styles.careerLine}>
                <Text style={styles.careerKey}>Statut de carrière</Text>
                <View style={styles.careerStatusRow}>
                  <Text style={[styles.careerVal, { fontWeight: fontWeight.bold }]}>
                    {STUDENT_INFO.status} pour{' '}
                  </Text>
                  <Text style={[styles.careerVal, { fontWeight: fontWeight.bold }]}>
                    Scolarisation
                  </Text>
                  <View style={[styles.statusDot, { backgroundColor: STUDENT_INFO.statusColor, width: 12, height: 12, borderRadius: 6 }]} />
                </View>
              </View>

              {/* Filière */}
              <View style={styles.careerProgramBlock}>
                <Text style={styles.careerProgram}>{STUDENT_INFO.program}</Text>
                <Text style={styles.careerSchool}>{STUDENT_INFO.school}</Text>
              </View>

              {/* Lien emploi du temps */}
              <TouchableOpacity style={styles.careerLink}>
                <Text style={styles.careerLinkIcon}>📅</Text>
                <Text style={styles.careerLinkText}>Emploi du temps</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Riepilogo esami / Notes */}
          <View style={styles.careerSection}>
            <View style={styles.careerToggle}>
              <Text style={styles.careerToggleTitle}>Récapitulatif des notes</Text>
            </View>
            <View style={styles.careerBody}>
              <View style={styles.examTable}>
                <View style={styles.examTableHead}>
                  <Text style={[styles.examTh, { flex: 2 }]}>Élément</Text>
                  <Text style={[styles.examTh, { flex: 1, textAlign: 'right' }]}>Valeur</Text>
                </View>
                {[
                  { label: 'Évaluations enregistrées', val: String(STUDENT_INFO.examsCount) },
                  { label: 'Évaluations réussies',      val: String(STUDENT_INFO.examsPassed) },
                  { label: 'Moyenne générale',          val: String(STUDENT_INFO.average) + '/20' },
                  { label: 'Classement',                val: STUDENT_INFO.rank },
                  { label: 'Absences',                  val: STUDENT_INFO.absences + ' jour(s)' },
                  { label: 'Conduite',                  val: STUDENT_INFO.conduct },
                ].map((r, i) => (
                  <View key={i} style={[styles.examRow, i % 2 === 1 && styles.examRowAlt]}>
                    <Text style={[styles.examTd, { flex: 2 }]}>{r.label}</Text>
                    <Text style={[styles.examTd, { flex: 1, textAlign: 'right', fontWeight: fontWeight.bold, color: colors.gray[900] }]}>{r.val}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.librettoBtn}>
                <Ionicons name="document-text" size={16} color={colors.primary} />
                <Text style={styles.librettoText}>Voir mon bulletin de notes</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pannello di controllo */}
          <View style={styles.careerSection}>
            <View style={styles.careerToggle}>
              <Text style={styles.careerToggleTitle}>Panneau de contrôle</Text>
            </View>
            <View style={styles.controlGrid}>
              {[
                { icon: '📋', label: 'Dossier scolaire' },
                { icon: '📅', label: 'Emploi du temps'  },
                { icon: '📝', label: 'Bulletins'        },
                { icon: '💰', label: 'Mes paiements'    },
              ].map(item => (
                <TouchableOpacity key={item.label} style={styles.controlCard}>
                  <Text style={styles.controlIcon}>{item.icon}</Text>
                  <Text style={styles.controlLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ══ FOURNITURES ══ */}
      {tab === 'supplies' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Résumé */}
          <View style={styles.supSummary}>
            <View>
              <Text style={styles.supSummaryTitle}>Fournitures scolaires</Text>
              <Text style={styles.supSummaryYear}>{STUDENT_INFO.year} · {STUDENT_INFO.class}</Text>
            </View>
            <View style={styles.supPctBadge}>
              <Text style={styles.supPct}>{pctS}%</Text>
              <Text style={styles.supPctLabel}>acquis</Text>
            </View>
          </View>

          <View style={styles.balanceBar}>
            <View style={[styles.balanceFill, { width: `${pctS}%` as any, backgroundColor: colors.success }]} />
          </View>

          <View style={styles.supStats}>
            {[
              { val: acqS,        color: colors.success, label: 'Acquis'   },
              { val: totalS-acqS, color: colors.error,   label: 'Manquants'},
              { val: totalS,      color: colors.gray[700], label: 'Total'  },
            ].map(s => (
              <View key={s.label} style={styles.supStat}>
                <Text style={[styles.supStatVal, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.supStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.supTip}>
            <Ionicons name="information-circle-outline" size={13} color={colors.primary} />
            <Text style={styles.supTipText}>Touchez un article pour le marquer comme acquis ✓</Text>
          </View>

          {/* Groupes par matière */}
          {Object.entries(subGroups).map(([subject, items]) => {
            const done = items.filter(s => s.acquired).length
            return (
              <View key={subject} style={styles.subGroup}>
                <View style={styles.subGroupHead}>
                  <Text style={styles.subGroupName}>{subject}</Text>
                  <View style={[styles.subGroupBadge, done === items.length ? styles.subGroupBadgeDone : {}]}>
                    <Text style={[styles.subGroupBadgeText, done === items.length ? styles.subGroupBadgeTextDone : {}]}>
                      {done}/{items.length}
                    </Text>
                  </View>
                </View>
                {items.map(s => (
                  <TouchableOpacity key={s.id} style={styles.supplyRow} onPress={() => toggleSupply(s.id)}>
                    <View style={[styles.supCheck, s.acquired && styles.supCheckDone]}>
                      {s.acquired && <Ionicons name="checkmark" size={13} color={colors.white} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.supName, s.acquired && styles.supNameDone]}>{s.name}</Text>
                      <Text style={styles.supMeta}>{s.quantity} {s.unit}{s.price ? ` · ≈${(s.price/1000).toFixed(0)}k GNF` : ''}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* Modal détail facture */}
      <InvoiceModal inv={selInvoice} onClose={() => setSelInvoice(null)} />
    </SafeAreaView>
  )
}

function CareerRow({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <View style={styles.careerLine}>
      <Text style={styles.careerKey}>{k}</Text>
      <Text style={[styles.careerVal, bold && { fontWeight: fontWeight.bold, color: colors.gray[900] }]}>{v}</Text>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent:{ padding: spacing.md, gap: spacing.md, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.sm,
    backgroundColor:   colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },

  tabBar: {
    flexDirection:    'row',
    backgroundColor:  colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: colors.primary },
  tabLabel:      { fontSize: 11, color: colors.gray[500], fontWeight: fontWeight.medium },
  tabLabelActive:{ color: colors.primary, fontWeight: fontWeight.semibold },

  // Balance card
  balanceCard: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    ...shadow.sm,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  balanceStat:{ flex: 1, alignItems: 'center' },
  balanceVal: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.success },
  balanceKey: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  balanceDivider: { width: 1, height: 36, backgroundColor: colors.gray[200] },
  balanceBar: {
    height: 8, backgroundColor: colors.gray[100],
    borderRadius: radius.full, overflow: 'hidden', marginBottom: 4,
  },
  balanceFill:{ height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  balancePct: { fontSize: fontSize.xs, color: colors.gray[500], textAlign: 'center' },

  // Alerts
  alertBox: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    padding:         spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    ...shadow.sm,
  },
  alertBoxHead:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, paddingHorizontal: 4 },
  alertBoxTitle:{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  alertRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: colors.gray[100] },
  alertDot:    { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  alertText:   { flex: 1, fontSize: 11, color: colors.gray[700] },

  // Tableau
  tableWrap: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    ...shadow.sm,
  },
  tableHeading:{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.gray[800], padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray[200] },

  tableHead:   { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: 8, backgroundColor: colors.gray[50], borderBottomWidth: 1, borderBottomColor: colors.gray[200] },
  thCell:      { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[700] },
  thCellText:  { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[700] },
  thRight:     { textAlign: 'right' },

  tableRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  tableRowAlt: { backgroundColor: colors.gray[50] },

  tdPlus:   { fontSize: fontSize.sm, color: colors.gray[400], marginRight: 2 },
  tdId:     { fontSize: fontSize.sm, color: colors.primary, textDecorationLine: 'underline' },
  tdAmount: { fontSize: fontSize.sm, color: colors.gray[700], fontWeight: fontWeight.medium },
  tdStatus: { fontSize: 11, fontWeight: fontWeight.medium },

  statusDot:{ width: 10, height: 10, borderRadius: 5 },

  // Légende
  legend: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    gap:             spacing.sm,
    ...shadow.sm,
  },
  legendTitle:{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.gray[800] },
  legendSep:  { height: 1, backgroundColor: colors.primary, width: 40 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot:  { width: 16, height: 16, borderRadius: 8 },
  legendLabel:{ fontSize: fontSize.sm, color: colors.gray[700] },

  searchBar: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              spacing.sm,
    backgroundColor:  colors.white,
    borderRadius:     radius.sm,
    borderWidth:      1,
    borderColor:      colors.gray[300],
    paddingHorizontal: spacing.md,
    paddingVertical:  10,
    ...shadow.sm,
  },
  searchPlaceholder:{ fontSize: fontSize.sm, color: colors.gray[400], flex: 1 },

  // Carrière
  careerSection: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    ...shadow.sm,
  },
  careerToggle: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical:  spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  careerToggleTitle:{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.gray[800] },
  careerToggleSub:  { fontSize: fontSize.xs, color: colors.gray[500] },

  careerBody:{ padding: spacing.md, gap: spacing.xs },
  careerLine:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  careerKey: { fontSize: fontSize.sm, color: colors.gray[600], flex: 1 },
  careerVal: { fontSize: fontSize.sm, color: colors.gray[700], textAlign: 'right' },
  careerStatusRow:{ flexDirection: 'row', alignItems: 'center', gap: 4 },

  careerProgramBlock:{
    marginTop:       spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth:  1,
    borderTopColor:  colors.gray[100],
  },
  careerProgram:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  careerSchool: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },

  careerLink:{
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.xs,
    paddingTop:      spacing.xs,
  },
  careerLinkIcon:{ fontSize: 14 },
  careerLinkText:{ fontSize: fontSize.sm, color: colors.primary, textDecorationLine: 'underline' },

  // Exams table
  examTable:   { borderWidth: 1, borderColor: colors.gray[200], borderRadius: radius.sm, overflow: 'hidden', marginBottom: spacing.sm },
  examTableHead:{ flexDirection: 'row', backgroundColor: colors.gray[100], padding: spacing.sm },
  examTh:      { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[700] },
  examRow:     { flexDirection: 'row', padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.gray[100] },
  examRowAlt:  { backgroundColor: colors.gray[50] },
  examTd:      { fontSize: fontSize.sm, color: colors.gray[700] },

  librettoBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.xs,
    paddingVertical: spacing.xs,
  },
  librettoText:{ fontSize: fontSize.sm, color: colors.primary, textDecorationLine: 'underline' },

  controlGrid:{ flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: spacing.sm },
  controlCard:{
    flex:            1,
    minWidth:        '44%',
    alignItems:      'center',
    padding:         spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius:    radius.md,
    gap:             4,
  },
  controlIcon: { fontSize: 24 },
  controlLabel:{ fontSize: fontSize.xs, color: colors.gray[700], fontWeight: fontWeight.medium, textAlign: 'center' },

  // Fournitures
  supSummary:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  supSummaryTitle:{ fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  supSummaryYear: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  supPctBadge:{ alignItems: 'center' },
  supPct:     { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.success },
  supPctLabel:{ fontSize: 10, color: colors.gray[500] },

  supStats:{ flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  supStat: { flex: 1, alignItems: 'center' },
  supStatVal:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  supStatLabel:{ fontSize: 10, color: colors.gray[500] },

  supTip:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '10', borderRadius: radius.sm, padding: spacing.sm },
  supTipText:{ fontSize: fontSize.xs, color: colors.primary },

  subGroup:    { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  subGroupHead:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.gray[50], borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  subGroupName:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[800] },
  subGroupBadge:{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.gray[200] },
  subGroupBadgeDone:{ backgroundColor: colors.success + '20' },
  subGroupBadgeText:{ fontSize: 11, fontWeight: fontWeight.bold, color: colors.gray[600] },
  subGroupBadgeTextDone:{ color: colors.success },

  supplyRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray[50] },
  supCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.gray[300], alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  supCheckDone:{ backgroundColor: colors.success, borderColor: colors.success },
  supName:     { fontSize: fontSize.sm, color: colors.gray[800], fontWeight: fontWeight.medium },
  supNameDone: { textDecorationLine: 'line-through', color: colors.gray[400] },
  supMeta:     { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },

  // Modal
  mHead:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray[100], backgroundColor: colors.white },
  mClose:{ padding: spacing.xs },
  mTitle:{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.gray[900] },

  mHero:{ alignItems: 'center', borderRadius: radius.xl, padding: spacing.lg, gap: 6 },
  mDotBig:{ width: 40, height: 40, borderRadius: 20, marginBottom: 4 },
  mHeroStatus:{ fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  mHeroLabel: { fontSize: fontSize.sm, color: colors.gray[700], textAlign: 'center' },
  mHeroId:    { fontSize: fontSize.xs, color: colors.gray[500] },

  mCard:{ backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  rowLine:{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  rowKey: { fontSize: fontSize.sm, color: colors.gray[600] },
  rowVal: { fontSize: fontSize.sm, color: colors.gray[800] },

  mNotif:{ backgroundColor: colors.primary + '0A', borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.primary },
  mNotifHead:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  mNotifTitle:{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  mNotifBody: { fontSize: fontSize.sm, color: colors.gray[700], lineHeight: 20 },

  mPayInfo:{ backgroundColor: colors.gray[50], borderRadius: radius.lg, padding: spacing.md },
  mPayTitle:{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800], marginBottom: 6 },
  mPayBody: { fontSize: fontSize.xs, color: colors.gray[600], lineHeight: 18 },
})
