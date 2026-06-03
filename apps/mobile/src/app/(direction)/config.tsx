import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Switch, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { useSchoolConfig } from '@/hooks/useSchoolConfig'

// ── Cloud Functions changement d'année ────────────────────────────────────────
const yearRolloverCF = httpsCallable<
  { schoolId: string; newYear: string; promotionMap: Record<string, string | null>; graduatingClassIds: string[] },
  { success: boolean; promoted: number; repeating: number; graduated: number; errors: string[] }
>(functions, 'yearRollover')

// ─── Types ────────────────────────────────────────────────────────────────────

type TrimestreStatus = 'termine' | 'en_cours' | 'a_venir'

interface Trimestre {
  id: 'T1' | 'T2' | 'T3'
  label: string
  periode: string
  dateDebut: string
  dateFin: string
  dateBulletins: string
  status: TrimestreStatus
}

interface Matiere {
  id: string
  nom: string
  coef: number
  editHighlight: boolean
}

interface MatieresByLevel {
  [level: string]: Matiere[]
}

interface ReglePassage {
  id: string
  label: string
  type: 'number' | 'switch'
  value: string | boolean
  description?: string
}

interface ClasseActive {
  id: string
  nom: string
  effectif: number
  profPrincipal: string
  editHighlight: boolean
}

interface AnneeConfig {
  nom: string
  dateRentree: string
  dateFin: string
  statut: string
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const INITIAL_ANNEE: AnneeConfig = {
  nom: '2025 – 2026',
  dateRentree: '15 septembre 2025',
  dateFin: '30 juin 2026',
  statut: 'En cours',
}

const INITIAL_TRIMESTRES: Trimestre[] = [
  {
    id: 'T1',
    label: 'Trimestre 1',
    periode: 'Oct 2025 – Déc 2025',
    dateDebut: '01/10/2025',
    dateFin: '19/12/2025',
    dateBulletins: '15/01/2026',
    status: 'termine',
  },
  {
    id: 'T2',
    label: 'Trimestre 2',
    periode: 'Jan 2026 – Mar 2026',
    dateDebut: '05/01/2026',
    dateFin: '27/03/2026',
    dateBulletins: '15/04/2026',
    status: 'en_cours',
  },
  {
    id: 'T3',
    label: 'Trimestre 3',
    periode: 'Avr 2026 – Juin 2026',
    dateDebut: '06/04/2026',
    dateFin: '26/06/2026',
    dateBulletins: '10/07/2026',
    status: 'a_venir',
  },
]

const MATIERES_BY_LEVEL: MatieresByLevel = {
  '6ème': [
    { id: 'm1', nom: 'Mathématiques',    coef: 4, editHighlight: false },
    { id: 'm2', nom: 'Français',         coef: 4, editHighlight: false },
    { id: 'm3', nom: 'Anglais',          coef: 3, editHighlight: false },
    { id: 'm4', nom: 'Sciences Physiques', coef: 2, editHighlight: false },
    { id: 'm5', nom: 'Histoire-Géo',     coef: 2, editHighlight: false },
    { id: 'm6', nom: 'SVT',              coef: 2, editHighlight: false },
    { id: 'm7', nom: 'EPS',              coef: 1, editHighlight: false },
    { id: 'm8', nom: 'Éducation civique',coef: 1, editHighlight: false },
  ],
  '5ème': [
    { id: 'm1', nom: 'Mathématiques',    coef: 4, editHighlight: false },
    { id: 'm2', nom: 'Français',         coef: 4, editHighlight: false },
    { id: 'm3', nom: 'Anglais',          coef: 3, editHighlight: false },
    { id: 'm4', nom: 'Sciences Physiques', coef: 3, editHighlight: false },
    { id: 'm5', nom: 'Histoire-Géo',     coef: 2, editHighlight: false },
    { id: 'm6', nom: 'SVT',              coef: 2, editHighlight: false },
    { id: 'm7', nom: 'Philosophie',      coef: 1, editHighlight: false },
    { id: 'm8', nom: 'EPS',              coef: 1, editHighlight: false },
  ],
  '4ème': [
    { id: 'm1', nom: 'Mathématiques',    coef: 4, editHighlight: false },
    { id: 'm2', nom: 'Français',         coef: 4, editHighlight: false },
    { id: 'm3', nom: 'Anglais',          coef: 3, editHighlight: false },
    { id: 'm4', nom: 'Sciences Physiques', coef: 3, editHighlight: false },
    { id: 'm5', nom: 'Histoire-Géo',     coef: 3, editHighlight: false },
    { id: 'm6', nom: 'SVT',              coef: 2, editHighlight: false },
    { id: 'm7', nom: 'Philosophie',      coef: 2, editHighlight: false },
    { id: 'm8', nom: 'EPS',              coef: 1, editHighlight: false },
    { id: 'm9', nom: 'Éducation civique',coef: 1, editHighlight: false },
  ],
  '3ème': [
    { id: 'm1', nom: 'Mathématiques',      coef: 4, editHighlight: false },
    { id: 'm2', nom: 'Français',           coef: 4, editHighlight: false },
    { id: 'm3', nom: 'Anglais',            coef: 3, editHighlight: false },
    { id: 'm4', nom: 'Sciences Physiques', coef: 3, editHighlight: false },
    { id: 'm5', nom: 'Histoire-Géo',       coef: 3, editHighlight: false },
    { id: 'm6', nom: 'SVT',               coef: 2, editHighlight: false },
    { id: 'm7', nom: 'Philosophie',        coef: 2, editHighlight: false },
    { id: 'm8', nom: 'EPS',               coef: 1, editHighlight: false },
    { id: 'm9', nom: 'Éducation civique',  coef: 1, editHighlight: false },
  ],
}

const INITIAL_REGLES: ReglePassage[] = [
  { id: 'r1', label: 'Seuil de passage',         type: 'number',  value: '10', description: '/20 — note minimale pour valider l\'année' },
  { id: 'r2', label: 'Mention Passable',          type: 'number',  value: '10', description: '/20 — à partir de cette note' },
  { id: 'r3', label: 'Mention Assez Bien',        type: 'number',  value: '12', description: '/20 — à partir de cette note' },
  { id: 'r4', label: 'Mention Bien',              type: 'number',  value: '14', description: '/20 — à partir de cette note' },
  { id: 'r5', label: 'Mention Très Bien',         type: 'number',  value: '16', description: '/20 — à partir de cette note' },
  { id: 'r6', label: 'Passage automatique si moy. ≥ seuil', type: 'switch', value: true },
  { id: 'r7', label: 'Redoublement si moyenne < 8/20',      type: 'switch', value: false },
]

const INITIAL_CLASSES: ClasseActive[] = [
  { id: 'c1', nom: '6ème A', effectif: 34, profPrincipal: 'Mme NGUEMA',  editHighlight: false },
  { id: 'c2', nom: '6ème B', effectif: 32, profPrincipal: 'M. OBAME',    editHighlight: false },
  { id: 'c3', nom: '5ème C', effectif: 30, profPrincipal: 'Mme MBOULA',  editHighlight: false },
  { id: 'c4', nom: '4ème A', effectif: 28, profPrincipal: 'M. NZOGHE',   editHighlight: false },
  { id: 'c5', nom: '3ème B', effectif: 32, profPrincipal: 'Mme ESSONE',  editHighlight: false },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusInfo(s: TrimestreStatus): { label: string; color: string; bg: string; icon: string } {
  if (s === 'termine')  return { label: 'Terminé',  color: colors.success, bg: '#dcfce7', icon: '✅' }
  if (s === 'en_cours') return { label: 'En cours', color: colors.primary, bg: '#dbeafe', icon: '🔵' }
  return                       { label: 'À venir',  color: colors.gray[500], bg: colors.gray[100], icon: '⏳' }
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={sh.row}>
      <View style={sh.iconWrap}>
        <Ionicons name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={sh.text}>{title.toUpperCase()}</Text>
      <View style={sh.line} />
    </View>
  )
}
const sh = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  iconWrap:{ width: 24, height: 24, borderRadius: radius.sm, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  text:    { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[500], letterSpacing: 1 },
  line:    { flex: 1, height: 1, backgroundColor: colors.border },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DirectionConfigScreen() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? 'demo'

  // ── Année scolaire
  const [annee, setAnnee] = useState<AnneeConfig>(INITIAL_ANNEE)
  const [anneeModalVisible, setAnneeModalVisible] = useState(false)
  const [anneeEdit, setAnneeEdit] = useState<AnneeConfig>(INITIAL_ANNEE)

  // ── Trimestres
  const [trimestres, setTrimestres] = useState<Trimestre[]>(INITIAL_TRIMESTRES)
  const [trimestreModal, setTrimestreModal] = useState<Trimestre | null>(null)
  const [trimestreEdit, setTrimestreEdit] = useState<Trimestre | null>(null)

  // ── Matières
  const [selectedLevel, setSelectedLevel] = useState<string>('3ème')
  const [matieresByLevel, setMatieresByLevel] = useState<MatieresByLevel>(INITIAL_MATIERES_BY_LEVEL())
  const [newMatiereModal, setNewMatiereModal] = useState(false)
  const [newMatiereName, setNewMatiereName] = useState('')

  // ── Règles
  const [regles, setRegles] = useState<ReglePassage[]>(INITIAL_REGLES)

  // ── Classes
  const [classes, setClasses] = useState<ClasseActive[]>(INITIAL_CLASSES)
  const [classeModal, setClasseModal] = useState<ClasseActive | null>(null)
  const [classeEdit, setClasseEdit] = useState<ClasseActive | null>(null)

  // ── Dirty state tracker
  const [isDirty, setIsDirty] = useState(false)

  // ── Firebase : chargement et sauvegarde ──────────────────────────────────
  const defaultCfg = {
    annee:          INITIAL_ANNEE,
    trimestres:     INITIAL_TRIMESTRES,
    matieresByLevel: INITIAL_MATIERES_BY_LEVEL(),
    regles:         INITIAL_REGLES,
    classes:        INITIAL_CLASSES,
  }

  const { config: savedCfg, loading: cfgLoading, saving: cfgSaving, saveConfig } =
    useSchoolConfig(schoolId, defaultCfg)

  // Hydratation : quand Firebase retourne des données, on met à jour l'état local
  useEffect(() => {
    if (cfgLoading || schoolId === 'demo') return
    if (savedCfg.annee)                        setAnnee(savedCfg.annee)
    if (savedCfg.trimestres?.length > 0)       setTrimestres(savedCfg.trimestres)
    if (savedCfg.matieresByLevel)              setMatieresByLevel(savedCfg.matieresByLevel)
    if (savedCfg.regles?.length > 0)           setRegles(savedCfg.regles)
    if (savedCfg.classes?.length > 0)          setClasses(savedCfg.classes)
  }, [savedCfg, cfgLoading, schoolId])

  // ── Computed
  const currentMatieres = matieresByLevel[selectedLevel] ?? []
  const totalCoef = currentMatieres.reduce((s, m) => s + m.coef, 0)

  // ─── Handlers — Année ─────────────────────────────────────────────────────

  function openAnneeModal() {
    setAnneeEdit({ ...annee })
    setAnneeModalVisible(true)
  }

  function saveAnnee() {
    setAnnee({ ...anneeEdit })
    setAnneeModalVisible(false)
    setIsDirty(true)
  }

  // ─── Handlers — Trimestres ────────────────────────────────────────────────

  function openTrimestreModal(t: Trimestre) {
    setTrimestreEdit({ ...t })
    setTrimestreModal(t)
  }

  function saveTrimestre() {
    if (!trimestreEdit) return
    setTrimestres(prev => prev.map(t => t.id === trimestreEdit.id ? { ...trimestreEdit } : t))
    setTrimestreModal(null)
    setTrimestreEdit(null)
    setIsDirty(true)
  }

  // ─── Handlers — Matières ──────────────────────────────────────────────────

  function changeCoef(matiereId: string, delta: number) {
    setMatieresByLevel(prev => ({
      ...prev,
      [selectedLevel]: prev[selectedLevel].map(m => {
        if (m.id !== matiereId) return { ...m, editHighlight: false }
        const next = Math.max(1, Math.min(6, m.coef + delta))
        return { ...m, coef: next, editHighlight: true }
      }),
    }))
    setIsDirty(true)
    setTimeout(() => {
      setMatieresByLevel(prev => ({
        ...prev,
        [selectedLevel]: prev[selectedLevel].map(m => ({ ...m, editHighlight: false })),
      }))
    }, 1200)
  }

  function addMatiere() {
    const name = newMatiereName.trim()
    if (!name) return
    const newId = 'new_' + Date.now().toString()
    setMatieresByLevel(prev => ({
      ...prev,
      [selectedLevel]: [
        ...prev[selectedLevel],
        { id: newId, nom: name, coef: 1, editHighlight: true },
      ],
    }))
    setNewMatiereName('')
    setNewMatiereModal(false)
    setIsDirty(true)
    setTimeout(() => {
      setMatieresByLevel(prev => ({
        ...prev,
        [selectedLevel]: prev[selectedLevel].map(m => ({ ...m, editHighlight: false })),
      }))
    }, 1200)
  }

  // ─── Handlers — Règles ────────────────────────────────────────────────────

  function updateRegleValue(id: string, value: string | boolean) {
    setRegles(prev => prev.map(r => r.id === id ? { ...r, value } : r))
    setIsDirty(true)
  }

  // ─── Handlers — Classes ───────────────────────────────────────────────────

  function openClasseModal(c: ClasseActive) {
    setClasseEdit({ ...c })
    setClasseModal(c)
  }

  function saveClasse() {
    if (!classeEdit) return
    setClasses(prev => prev.map(c => {
      if (c.id !== classeEdit.id) return { ...c, editHighlight: false }
      return { ...classeEdit, editHighlight: true }
    }))
    setClasseModal(null)
    setClasseEdit(null)
    setIsDirty(true)
    setTimeout(() => {
      setClasses(prev => prev.map(c => ({ ...c, editHighlight: false })))
    }, 1200)
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  function handleSave() {
    Alert.alert(
      'Enregistrer la configuration',
      'Voulez-vous enregistrer toutes les modifications apportées à la configuration académique ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Enregistrer',
          style: 'default',
          onPress: async () => {
            try {
              // Firebase : persiste la config complète
              await saveConfig({ annee, trimestres, matieresByLevel, regles, classes })
              setIsDirty(false)
              Alert.alert('✅ Succès', 'La configuration a bien été enregistrée.')
            } catch {
              Alert.alert('Erreur', 'La sauvegarde a échoué. Veuillez réessayer.')
            }
          },
        },
      ]
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Configuration</Text>
          <Text style={styles.headerSub}>Paramètres académiques de l'établissement</Text>
        </View>
        {isDirty && (
          <View style={styles.dirtyBadge}>
            <Ionicons name="ellipse" size={6} color={colors.warning} />
            <Text style={styles.dirtyText}>Non sauvegardé</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ══ SECTION 1 — Année scolaire ══════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHeader title="Année scolaire" icon="calendar-outline" />

          <View style={styles.anneeCard}>
            <View style={styles.anneeTopRow}>
              <View style={styles.anneeLeft}>
                <Text style={styles.anneeNom}>{annee.nom}</Text>
                <View style={styles.statutBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={styles.statutText}>{annee.statut}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modifyBtn} onPress={openAnneeModal}>
                <Ionicons name="create-outline" size={14} color={colors.primary} />
                <Text style={styles.modifyBtnText}>Modifier</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.anneeDateRow}>
              <View style={styles.anneeDateItem}>
                <Ionicons name="log-in-outline" size={14} color={colors.gray[400]} />
                <View>
                  <Text style={styles.anneeDateLabel}>Rentrée scolaire</Text>
                  <Text style={styles.anneeDateValue}>{annee.dateRentree}</Text>
                </View>
              </View>
              <View style={styles.anneeDivider} />
              <View style={styles.anneeDateItem}>
                <Ionicons name="log-out-outline" size={14} color={colors.gray[400]} />
                <View>
                  <Text style={styles.anneeDateLabel}>Fin d'année</Text>
                  <Text style={styles.anneeDateValue}>{annee.dateFin}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ══ SECTION 1b — Passage à la nouvelle année ═══════════════════ */}
        <View style={styles.section}>
          <SectionHeader title="Changement d'année scolaire" icon="refresh-outline" />
          <View style={[styles.anneeCard, { borderColor: '#FCD34D', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Ionicons name="warning-outline" size={18} color="#D97706" />
              <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#D97706' }}>
                Opération de fin d'année
              </Text>
            </View>
            <Text style={{ fontSize: fontSize.xs, color: colors.gray[600], lineHeight: 18, marginBottom: spacing.md }}>
              Lance la promotion automatique des élèves vers la classe suivante, archive les diplômés et enregistre l'historique académique de chaque élève.{'\n\n'}
              ⚠️ Action irréversible — à n'effectuer qu'une fois en fin d'année.
            </Text>
            <TouchableOpacity
              style={[styles.modifyBtn, { backgroundColor: '#FFFBEB', borderColor: '#FCD34D', borderWidth: 1, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.md }]}
              onPress={() => {
                if (schoolId === 'demo') {
                  Alert.alert('Démo', 'Cette fonctionnalité est disponible en production.')
                  return
                }
                Alert.alert(
                  '⚠️ Changement d\'année scolaire',
                  'Cette action va promouvoir tous les élèves actifs vers leur classe suivante selon la configuration de l\'école.\n\nElle est irréversible. Êtes-vous certain ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Lancer',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          // La promotion map est gérée par la direction — ici valeur démo
                          // En production, afficher un écran de configuration complet
                          const result = await yearRolloverCF({
                            schoolId,
                            newYear: annee.nom.replace(/(\d{4})-(\d{4})/, (_, a, b) => `${b}-${Number(b) + 1}`),
                            promotionMap: {}, // à configurer
                            graduatingClassIds: [],
                          })
                          const d = result.data
                          Alert.alert(
                            '✅ Passage d\'année effectué',
                            `${d.promoted} promus · ${d.repeating} redoublants · ${d.graduated} diplômés` +
                            (d.errors.length > 0 ? `\n${d.errors.length} erreurs — voir les logs.` : '')
                          )
                        } catch (e: any) {
                          Alert.alert('Erreur', e?.message ?? 'Impossible de lancer le passage d\'année.')
                        }
                      },
                    },
                  ]
                )
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={14} color="#D97706" />
              <Text style={[styles.modifyBtnText, { color: '#D97706' }]}>Lancer le passage d'année</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══ SECTION 2 — Trimestres ══════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHeader title="Trimestres" icon="git-branch-outline" />

          {trimestres.map(t => {
            const info = statusInfo(t.status)
            return (
              <View key={t.id} style={[styles.trimestreCard, { borderLeftColor: info.color }]}>
                <View style={styles.trimestreTop}>
                  <View style={styles.trimestreLeft}>
                    <View style={styles.trimestrelabelRow}>
                      <Text style={styles.trimestreId}>{t.id}</Text>
                      <Text style={styles.trimestreName}>{t.label}</Text>
                    </View>
                    <Text style={styles.trimestrePeriode}>{t.periode}</Text>
                  </View>
                  <View style={styles.trimestreRight}>
                    <View style={[styles.statusBadge, { backgroundColor: info.bg }]}>
                      <Text style={[styles.statusText, { color: info.color }]}>
                        {info.icon} {info.label}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.editIconBtn} onPress={() => openTrimestreModal(t)}>
                      <Ionicons name="create-outline" size={15} color={colors.gray[500]} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.trimestreFooter}>
                  <Ionicons name="document-text-outline" size={12} color={colors.gray[400]} />
                  <Text style={styles.trimBulletinText}>
                    Remise bulletins : <Text style={styles.trimBulletinDate}>{t.dateBulletins}</Text>
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* ══ SECTION 3 — Matières et coefficients ════════════════════════ */}
        <View style={styles.section}>
          <SectionHeader title="Matières et coefficients" icon="school-outline" />

          {/* Level selector */}
          <View style={styles.levelSelector}>
            {Object.keys(matieresByLevel).map(lvl => (
              <TouchableOpacity
                key={lvl}
                style={[styles.levelChip, selectedLevel === lvl && styles.levelChipActive]}
                onPress={() => setSelectedLevel(lvl)}
              >
                <Text style={[styles.levelChipText, selectedLevel === lvl && styles.levelChipTextActive]}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Matières list */}
          <View style={styles.matiereCard}>
            {currentMatieres.map(m => (
              <View
                key={m.id}
                style={[
                  styles.matiereRow,
                  m.editHighlight && styles.matiereRowHighlight,
                ]}
              >
                <Text style={styles.matiereName}>{m.nom}</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, m.coef <= 1 && styles.stepperBtnDisabled]}
                    onPress={() => changeCoef(m.id, -1)}
                    disabled={m.coef <= 1}
                  >
                    <Ionicons name="remove" size={14} color={m.coef <= 1 ? colors.gray[300] : colors.gray[700]} />
                  </TouchableOpacity>
                  <View style={styles.coefBadge}>
                    <Text style={styles.coefValue}>{m.coef}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.stepperBtn, m.coef >= 6 && styles.stepperBtnDisabled]}
                    onPress={() => changeCoef(m.id, +1)}
                    disabled={m.coef >= 6}
                  >
                    <Ionicons name="add" size={14} color={m.coef >= 6 ? colors.gray[300] : colors.gray[700]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Total */}
            <View style={styles.totalCoefRow}>
              <Ionicons name="calculator-outline" size={14} color={colors.primary} />
              <Text style={styles.totalCoefText}>
                Total : <Text style={styles.totalCoefNumber}>{totalCoef} coefficients</Text>
              </Text>
            </View>
          </View>

          {/* Add matière button */}
          <TouchableOpacity style={styles.addMatiereBtn} onPress={() => setNewMatiereModal(true)}>
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.addMatiereBtnText}>Ajouter une matière</Text>
          </TouchableOpacity>
        </View>

        {/* ══ SECTION 4 — Règles de passage et mentions ═══════════════════ */}
        <View style={styles.section}>
          <SectionHeader title="Règles de passage et mentions" icon="ribbon-outline" />

          <View style={styles.reglesCard}>
            {regles.map((r, i) => (
              <View
                key={r.id}
                style={[
                  styles.regleRow,
                  i < regles.length - 1 && styles.regleRowBorder,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.regleLabel}>{r.label}</Text>
                  {r.description && (
                    <Text style={styles.regleDesc}>{r.description}</Text>
                  )}
                </View>
                {r.type === 'number' ? (
                  <View style={styles.regleInputWrap}>
                    <TextInput
                      style={styles.regleInput}
                      value={String(r.value)}
                      keyboardType="numeric"
                      maxLength={2}
                      onChangeText={v => updateRegleValue(r.id, v)}
                    />
                    <Text style={styles.regleInputSuffix}>/20</Text>
                  </View>
                ) : (
                  <Switch
                    value={r.value as boolean}
                    onValueChange={v => updateRegleValue(r.id, v)}
                    trackColor={{ false: colors.gray[200], true: colors.primary + '60' }}
                    thumbColor={r.value ? colors.primary : colors.gray[400]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ══ SECTION 5 — Classes actives ═════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHeader title="Classes actives" icon="people-outline" />

          {classes.map(c => (
            <View
              key={c.id}
              style={[
                styles.classeCard,
                c.editHighlight && styles.classeCardHighlight,
              ]}
            >
              <View style={styles.classeLeft}>
                <View style={styles.classeIconWrap}>
                  <Text style={styles.classeIconText}>{c.nom.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.classeNom}>{c.nom}</Text>
                  <Text style={styles.classeProfPrincipal}>Prof. principal : {c.profPrincipal}</Text>
                </View>
              </View>
              <View style={styles.classeRight}>
                <View style={styles.effectifBadge}>
                  <Ionicons name="people" size={11} color={colors.primary} />
                  <Text style={styles.effectifText}>{c.effectif} élèves</Text>
                </View>
                <TouchableOpacity style={styles.editIconBtn} onPress={() => openClasseModal(c)}>
                  <Ionicons name="create-outline" size={15} color={colors.gray[500]} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Spacer pour le bouton sticky */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Bouton Enregistrer sticky ── */}
      <View style={styles.saveBarContainer}>
        <TouchableOpacity
          style={[styles.saveBar, (!isDirty || cfgSaving) && styles.saveBarDisabled]}
          onPress={handleSave}
          disabled={!isDirty || cfgSaving}
        >
          <Ionicons name={cfgSaving ? 'cloud-upload-outline' : 'save-outline'} size={18} color={colors.white} />
          <Text style={styles.saveBarText}>
            {cfgSaving ? 'Enregistrement…' : 'Enregistrer la configuration'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════ */}

      {/* ── Modal — Année scolaire ── */}
      <Modal
        visible={anneeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAnneeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier l'année scolaire</Text>
              <TouchableOpacity onPress={() => setAnneeModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nom de l'année</Text>
              <TextInput
                style={styles.inputField}
                value={anneeEdit.nom}
                onChangeText={v => setAnneeEdit(prev => ({ ...prev, nom: v }))}
                placeholder="Ex : 2025 – 2026"
              />

              <Text style={styles.inputLabel}>Date de rentrée</Text>
              <TextInput
                style={styles.inputField}
                value={anneeEdit.dateRentree}
                onChangeText={v => setAnneeEdit(prev => ({ ...prev, dateRentree: v }))}
                placeholder="Ex : 15 septembre 2025"
              />

              <Text style={styles.inputLabel}>Date de fin d'année</Text>
              <TextInput
                style={styles.inputField}
                value={anneeEdit.dateFin}
                onChangeText={v => setAnneeEdit(prev => ({ ...prev, dateFin: v }))}
                placeholder="Ex : 30 juin 2026"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setAnneeModalVisible(false)}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={saveAnnee}>
                <Text style={styles.btnSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal — Trimestre ── */}
      <Modal
        visible={trimestreModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTrimestreModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Modifier {trimestreEdit?.label}
              </Text>
              <TouchableOpacity onPress={() => setTrimestreModal(null)}>
                <Ionicons name="close" size={22} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            {trimestreEdit && (
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Date de début</Text>
                <TextInput
                  style={styles.inputField}
                  value={trimestreEdit.dateDebut}
                  onChangeText={v => setTrimestreEdit(prev => prev ? { ...prev, dateDebut: v } : prev)}
                  placeholder="JJ/MM/AAAA"
                />

                <Text style={styles.inputLabel}>Date de fin</Text>
                <TextInput
                  style={styles.inputField}
                  value={trimestreEdit.dateFin}
                  onChangeText={v => setTrimestreEdit(prev => prev ? { ...prev, dateFin: v } : prev)}
                  placeholder="JJ/MM/AAAA"
                />

                <Text style={styles.inputLabel}>Date limite remise des bulletins</Text>
                <TextInput
                  style={styles.inputField}
                  value={trimestreEdit.dateBulletins}
                  onChangeText={v => setTrimestreEdit(prev => prev ? { ...prev, dateBulletins: v } : prev)}
                  placeholder="JJ/MM/AAAA"
                />

                <Text style={styles.inputLabel}>Statut</Text>
                <View style={styles.statusSelector}>
                  {(['termine', 'en_cours', 'a_venir'] as TrimestreStatus[]).map(s => {
                    const info = statusInfo(s)
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.statusOption,
                          trimestreEdit.status === s && { borderColor: info.color, backgroundColor: info.bg },
                        ]}
                        onPress={() => setTrimestreEdit(prev => prev ? { ...prev, status: s } : prev)}
                      >
                        <Text style={[styles.statusOptionText, trimestreEdit.status === s && { color: info.color }]}>
                          {info.icon} {info.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setTrimestreModal(null)}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={saveTrimestre}>
                <Text style={styles.btnSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal — Nouvelle matière ── */}
      <Modal
        visible={newMatiereModal}
        transparent
        animationType="fade"
        onRequestClose={() => setNewMatiereModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter une matière — {selectedLevel}</Text>
              <TouchableOpacity onPress={() => setNewMatiereModal(false)}>
                <Ionicons name="close" size={22} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nom de la matière</Text>
              <TextInput
                style={styles.inputField}
                value={newMatiereName}
                onChangeText={setNewMatiereName}
                placeholder="Ex : Informatique"
                autoFocus
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setNewMatiereModal(false)}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSave, !newMatiereName.trim() && styles.btnSaveDisabled]}
                onPress={addMatiere}
                disabled={!newMatiereName.trim()}
              >
                <Text style={styles.btnSaveText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal — Modifier classe ── */}
      <Modal
        visible={classeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setClasseModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier la classe</Text>
              <TouchableOpacity onPress={() => setClasseModal(null)}>
                <Ionicons name="close" size={22} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            {classeEdit && (
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Nom de la classe</Text>
                <TextInput
                  style={styles.inputField}
                  value={classeEdit.nom}
                  onChangeText={v => setClasseEdit(prev => prev ? { ...prev, nom: v } : prev)}
                  placeholder="Ex : 3ème A"
                />

                <Text style={styles.inputLabel}>Effectif</Text>
                <TextInput
                  style={styles.inputField}
                  value={String(classeEdit.effectif)}
                  keyboardType="numeric"
                  maxLength={3}
                  onChangeText={v => setClasseEdit(prev => prev ? { ...prev, effectif: parseInt(v) || 0 } : prev)}
                  placeholder="Ex : 30"
                />

                <Text style={styles.inputLabel}>Professeur principal</Text>
                <TextInput
                  style={styles.inputField}
                  value={classeEdit.profPrincipal}
                  onChangeText={v => setClasseEdit(prev => prev ? { ...prev, profPrincipal: v } : prev)}
                  placeholder="Ex : Mme NGUEMA"
                />
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setClasseModal(null)}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={saveClasse}>
                <Text style={styles.btnSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Deep-copy initial matieres (avoid shared reference) ─────────────────────

function INITIAL_MATIERES_BY_LEVEL(): MatieresByLevel {
  return Object.fromEntries(
    Object.entries(MATIERES_BY_LEVEL).map(([k, v]) => [k, v.map(m => ({ ...m }))])
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  scrollContent:{ paddingBottom: spacing.lg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:   { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },
  dirtyBadge:  {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fef3c7', paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 1, borderColor: '#fde68a',
  },
  dirtyText:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: '#92400e' },

  // Sections
  section: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, gap: spacing.sm },

  // Année scolaire card
  anneeCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    ...shadow.md, gap: spacing.md,
  },
  anneeTopRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  anneeLeft:        { gap: spacing.xs },
  anneeNom:         { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  statutBadge:      {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#dcfce7', paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full,
  },
  statutText:       { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.success },
  modifyBtn:        {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dbeafe', paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.md, borderWidth: 1, borderColor: '#bfdbfe',
  },
  modifyBtnText:    { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  anneeDateRow:     { flexDirection: 'row', alignItems: 'center' },
  anneeDateItem:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  anneeDivider:     { width: 1, height: 32, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  anneeDateLabel:   { fontSize: fontSize.xs, color: colors.gray[400] },
  anneeDateValue:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800], marginTop: 1 },

  // Trimestres
  trimestreCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderLeftWidth: 3, ...shadow.sm, gap: spacing.sm,
  },
  trimestreTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trimestreLeft:     { gap: 2 },
  trimestrelabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  trimestreId:       {
    fontSize: fontSize.xs, fontWeight: fontWeight.extrabold, color: colors.white,
    backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: radius.sm,
  },
  trimestreName:    { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  trimestrePeriode: { fontSize: fontSize.sm, color: colors.gray[500] },
  trimestreRight:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusBadge:      {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText:       { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  trimestreFooter:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trimBulletinText: { fontSize: fontSize.xs, color: colors.gray[500] },
  trimBulletinDate: { fontWeight: fontWeight.semibold, color: colors.gray[700] },

  editIconBtn: {
    width: 28, height: 28, borderRadius: radius.sm,
    backgroundColor: colors.gray[50], alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.gray[200],
  },

  // Level selector
  levelSelector: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  levelChip:     {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, backgroundColor: colors.gray[100],
    borderWidth: 1, borderColor: colors.gray[200],
  },
  levelChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  levelChipText:       { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[600] },
  levelChipTextActive: { color: colors.white },

  // Matières card
  matiereCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.sm,
    overflow: 'hidden',
  },
  matiereRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: colors.gray[50],
  },
  matiereRowHighlight: { backgroundColor: '#fefce8' },
  matiereName:         { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[800], flex: 1, marginRight: spacing.sm },
  stepperRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepperBtn: {
    width: 28, height: 28, borderRadius: radius.full,
    backgroundColor: colors.gray[100], borderWidth: 1, borderColor: colors.gray[200],
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  coefBadge: {
    width: 32, height: 28, borderRadius: radius.sm,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  coefValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  totalCoefRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: '#f0f9ff',
  },
  totalCoefText:   { fontSize: fontSize.sm, color: colors.gray[600] },
  totalCoefNumber: { fontWeight: fontWeight.bold, color: colors.primary },

  addMatiereBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary + '60',
    backgroundColor: '#eff6ff',
  },
  addMatiereBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },

  // Règles card
  reglesCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.sm,
    overflow: 'hidden',
  },
  regleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  regleRowBorder:   { borderBottomWidth: 1, borderBottomColor: colors.gray[50] },
  regleLabel:       { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[800] },
  regleDesc:        { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 1 },
  regleInputWrap:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  regleInput: {
    width: 44, height: 34, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    textAlign: 'center', fontSize: fontSize.base, fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  regleInputSuffix: { fontSize: fontSize.sm, color: colors.gray[400] },

  // Classes actives
  classeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    ...shadow.sm,
  },
  classeCardHighlight: { backgroundColor: '#fefce8' },
  classeLeft:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  classeIconWrap: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center',
  },
  classeIconText:      { fontSize: fontSize.base, fontWeight: fontWeight.extrabold, color: colors.primary },
  classeNom:           { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  classeProfPrincipal: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  classeRight:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  effectifBadge:       {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eff6ff', paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full,
  },
  effectifText:        { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },

  // Save bar
  saveBarContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: spacing.md, ...shadow.lg,
  },
  saveBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md,
  },
  saveBarDisabled: { backgroundColor: colors.gray[300] },
  saveBarText:     { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.white },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    width: '100%', maxWidth: 420, ...shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[900] },
  modalBody:   { padding: spacing.lg, gap: spacing.sm },
  modalFooter: {
    flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg,
  },

  inputLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[700] },
  inputField: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.base, color: colors.gray[900],
    backgroundColor: colors.gray[50],
  },

  statusSelector:    { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statusOption: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  statusOptionText:  { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray[600] },

  btnCancel: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray[300],
    backgroundColor: colors.surface,
  },
  btnCancelText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.gray[600] },
  btnSave: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.primary,
  },
  btnSaveDisabled: { backgroundColor: colors.gray[300] },
  btnSaveText:     { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.white },
})
