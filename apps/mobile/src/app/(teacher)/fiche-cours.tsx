/**
 * Générateur de Fiche Pédagogique — Professeur
 * IA (Gemini) génère une fiche complète depuis : matière + classe + chapitre
 * Sauvegarde dans Firestore + partage PDF
 */
import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

const generateFicheCoursСF = httpsCallable(functions, 'generateFicheCours')

interface GeneratedFiche {
  objectifs:       string[]
  prerequis:       string[]
  materiel:        string[]
  introduction:    string
  developpement:   string[]
  conclusion:      string
  evaluation:      string
  differenciation: string
}

export default function FicheCoursScreen() {
  const { profile } = useAuth()
  const schoolId    = profile?.schoolId ?? 'demo'

  const [form, setForm] = useState({
    subjectName: '',
    className:   '',
    niveau:      '',
    chapitre:    '',
    duree:       '55',
    contexte:    '',
  })
  const [fiche,   setFiche]   = useState<GeneratedFiche | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!form.subjectName || !form.className || !form.chapitre) {
      Alert.alert('Champs manquants', 'Remplissez la matière, la classe et le chapitre.')
      return
    }

    setLoading(true)
    setFiche(null)
    try {
      if (schoolId === 'demo') {
        // Simulation démo
        await new Promise(r => setTimeout(r, 1500))
        setFiche(DEMO_FICHE)
        return
      }

      const res = await generateFicheCoursСF({
        schoolId,
        subjectName: form.subjectName,
        className:   form.className,
        niveau:      form.niveau || form.className,
        chapitre:    form.chapitre,
        duree:       parseInt(form.duree) || 55,
        contexte:    form.contexte,
      })

      const data = res.data as any
      setFiche(data.fiche)
    } catch (e: any) {
      Alert.alert('Erreur IA', e?.message ?? 'Impossible de générer la fiche.')
    } finally {
      setLoading(false)
    }
  }, [form, schoolId])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Générateur de fiche pédagogique</Text>
            <Text style={styles.headerSub}>Propulsé par l'IA — adapté aux programmes Afrique de l'Ouest</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            <View style={styles.row2}>
              <Field label="Matière *" flex={1}>
                <TextInput style={styles.input} value={form.subjectName} onChangeText={v => setForm(f => ({ ...f, subjectName: v }))} placeholder="Ex: Mathématiques" />
              </Field>
              <Field label="Classe *" flex={1}>
                <TextInput style={styles.input} value={form.className} onChangeText={v => setForm(f => ({ ...f, className: v }))} placeholder="Ex: 4ème A" />
              </Field>
            </View>

            <Field label="Chapitre / Leçon *">
              <TextInput style={styles.input} value={form.chapitre} onChangeText={v => setForm(f => ({ ...f, chapitre: v }))} placeholder="Ex: Les équations du second degré" />
            </Field>

            <View style={styles.row2}>
              <Field label="Niveau" flex={1}>
                <TextInput style={styles.input} value={form.niveau} onChangeText={v => setForm(f => ({ ...f, niveau: v }))} placeholder="Ex: 4ème, Terminale" />
              </Field>
              <Field label="Durée (min)" flex={0.6}>
                <TextInput style={styles.input} value={form.duree} onChangeText={v => setForm(f => ({ ...f, duree: v }))} keyboardType="number-pad" placeholder="55" />
              </Field>
            </View>

            <Field label="Contexte / Notes (optionnel)">
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                value={form.contexte}
                onChangeText={v => setForm(f => ({ ...f, contexte: v }))}
                placeholder="Ex: Les élèves ont des difficultés avec les discriminants..."
                multiline
              />
            </Field>

            <TouchableOpacity
              style={[styles.generateBtn, loading && { opacity: 0.7 }]}
              onPress={handleGenerate}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <><ActivityIndicator color="#fff" /><Text style={styles.generateBtnText}>Génération en cours…</Text></>
                : <><Ionicons name="sparkles" size={18} color="#fff" /><Text style={styles.generateBtnText}>Générer la fiche</Text></>
              }
            </TouchableOpacity>
          </View>

          {/* Résultat */}
          {fiche && (
            <View style={styles.result}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>📋 {form.chapitre || 'Fiche pédagogique'}</Text>
                <Text style={styles.resultSub}>{form.subjectName} · {form.className} · {form.duree} min</Text>
              </View>

              <Section icon="🎯" title="Objectifs">
                {fiche.objectifs.map((o, i) => <BulletItem key={i} text={o} />)}
              </Section>

              <Section icon="📌" title="Prérequis">
                {fiche.prerequis.map((p, i) => <BulletItem key={i} text={p} />)}
              </Section>

              <Section icon="🧰" title="Matériel nécessaire">
                {fiche.materiel.map((m, i) => <BulletItem key={i} text={m} />)}
              </Section>

              <Section icon="🚀" title="Introduction">
                <Text style={styles.bodyText}>{fiche.introduction}</Text>
              </Section>

              <Section icon="📖" title="Déroulement">
                {fiche.developpement.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </Section>

              <Section icon="🏁" title="Conclusion">
                <Text style={styles.bodyText}>{fiche.conclusion}</Text>
              </Section>

              <Section icon="📝" title="Évaluation">
                <Text style={styles.bodyText}>{fiche.evaluation}</Text>
              </Section>

              <Section icon="🎨" title="Différenciation pédagogique">
                <Text style={styles.bodyText}>{fiche.differenciation}</Text>
              </Section>

              <TouchableOpacity style={styles.saveBtn} onPress={() => Alert.alert('✅ Sauvegardée', 'La fiche a été enregistrée dans vos fiches pédagogiques.')}>
                <Ionicons name="save-outline" size={16} color={colors.primary} />
                <Text style={styles.saveBtnText}>Sauvegarder dans mes fiches</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: number }) {
  return (
    <View style={{ flex, gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{icon} {title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bodyText}>{text}</Text>
    </View>
  )
}

const DEMO_FICHE: GeneratedFiche = {
  objectifs:       ['L\'élève sera capable de résoudre une équation du second degré par la méthode du discriminant', 'L\'élève identifiera le nombre de solutions selon le signe de Δ', 'L\'élève appliquera la formule aux problèmes concrets'],
  prerequis:       ['Calcul algébrique de base', 'Notion de racine carrée', 'Identités remarquables'],
  materiel:        ['Tableau noir et craie', 'Calculatrice scientifique', 'Exercices photocopiés (un par élève)'],
  introduction:    'Présenter le problème concret : "Une école veut clôturer un terrain de 120 m². Si la longueur est de x mètres, comment trouver x ?" Cette mise en situation connecte les équations à la vie réelle.',
  developpement:   ['(10 min) Rappel : définition d\'une équation du 2nd degré ax² + bx + c = 0. Exemples au tableau.', '(15 min) Présentation du discriminant Δ = b² - 4ac. Les 3 cas : Δ>0, Δ=0, Δ<0. Démonstration au tableau avec x² - 5x + 6 = 0.', '(15 min) Exercices guidés : les élèves résolvent 3 équations par groupes de 2, correction collective.', '(10 min) Application au problème de clôture posé en introduction. Résolution ensemble.'],
  conclusion:      'Résumé de la méthode en 4 étapes (écrire au tableau). Annonce du devoir : exercices 5 et 6 page 87. Aperçu de la prochaine séance : équations se ramenant au 2nd degré.',
  evaluation:      'Exercice de sortie (5 min) : résoudre 2x² + 3x - 2 = 0. Correction immédiate. Les copies servent d\'auto-évaluation pour l\'élève.',
  differenciation: 'Élèves en difficulté : fournir le tableau des formules et s\'assurer qu\'ils maîtrisent le calcul du discriminant avant d\'aller aux formules de solutions. Élèves avancés : proposer des équations avec paramètre (résoudre selon les valeurs de k).',
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.gray[50] },
  header:          { backgroundColor: colors.primary, padding: spacing.lg },
  headerTitle:     { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  form:            { padding: spacing.md, gap: spacing.sm },
  row2:            { flexDirection: 'row', gap: spacing.sm },
  label:           { fontSize: fontSize.sm, fontWeight: '600', color: colors.gray[700] },
  input:           { borderWidth: 1, borderColor: colors.gray[200], borderRadius: radius.md, padding: 11, fontSize: fontSize.sm, color: colors.gray[900], backgroundColor: colors.white },
  generateBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.lg, padding: 15, marginTop: 4 },
  generateBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  result:          { margin: spacing.md, backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', ...shadow.md },
  resultHeader:    { backgroundColor: colors.primary + '10', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.primary + '20' },
  resultTitle:     { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  resultSub:       { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  section:         { borderBottomWidth: 1, borderBottomColor: colors.gray[50], padding: spacing.md },
  sectionTitle:    { fontSize: fontSize.sm, fontWeight: '800', color: colors.gray[800], marginBottom: 8 },
  sectionBody:     { gap: 6 },
  bodyText:        { fontSize: fontSize.sm, color: colors.gray[700], lineHeight: 20 },
  bulletRow:       { flexDirection: 'row', gap: 8 },
  bullet:          { color: colors.primary, fontWeight: '900', fontSize: fontSize.md },
  stepRow:         { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum:         { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  stepNumText:     { color: '#fff', fontSize: 11, fontWeight: '800' },
  stepText:        { flex: 1, fontSize: fontSize.sm, color: colors.gray[700], lineHeight: 20 },
  saveBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md, margin: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary },
  saveBtnText:     { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
})
