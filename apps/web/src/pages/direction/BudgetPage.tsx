/**
 * BudgetPage — Direction : Trésorerie & Budget
 *
 * - Cash-flow mensuel (entrées scolarités vs sorties dépenses + paie)
 * - Budget par catégorie avec alertes de dépassement
 * - Ajout de dépenses manuelles
 * - Graphiques avec Recharts (déjà inclus dans le projet via shadcn/recharts)
 */
import { useState, useEffect, useCallback } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getFirestore, collection, onSnapshot, query, orderBy, where, limit } from 'firebase/firestore'
import { useAuthStore } from '@/store/auth.store'
import {
  TrendingUp, TrendingDown, AlertTriangle, Plus, DollarSign,
  BarChart2, PieChart, RefreshCw,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CashflowPoint {
  month:    string
  income:   number
  expenses: number
  balance:  number
}

interface BudgetCategory {
  budgeted: number
  actual:   number
  alert:    number
}

interface DashboardData {
  summary: {
    totalIncome: number
    totalExpenses: number
    totalPayroll:  number
    balance: number
    currency: string
  }
  cashflowSeries:    CashflowPoint[]
  expenseByCategory: Record<string, number>
  budgetByCategory:  Record<string, BudgetCategory>
  alerts:            { category: string; percent: number; message: string }[]
}

interface Expense {
  id:       string
  category: string
  label:    string
  amount:   number
  currency: string
  date:     string
  paidByName: string
}

const CATEGORY_LABELS: Record<string, string> = {
  scolarite:    'Scolarité',
  salaires:     'Salaires',
  fournitures:  'Fournitures',
  maintenance:  'Maintenance',
  electricite:  'Électricité',
  eau:          'Eau',
  transport:    'Transport',
  evenements:   'Événements',
  autre:        'Autre',
}

const CATEGORY_COLORS: Record<string, string> = {
  scolarite:   '#2563EB',
  salaires:    '#7C3AED',
  fournitures: '#059669',
  maintenance: '#D97706',
  electricite: '#F59E0B',
  eau:         '#06B6D4',
  transport:   '#EC4899',
  evenements:  '#84CC16',
  autre:       '#9CA3AF',
}

// ── Composant mini-barre de progression ──────────────────────────────────────

function BudgetBar({ budgeted, actual, alert, category }: BudgetCategory & { category: string }) {
  const pct     = budgeted > 0 ? Math.min(100, Math.round((actual / budgeted) * 100)) : 0
  const isAlert = pct >= alert
  const color   = pct >= 100 ? '#DC2626' : isAlert ? '#D97706' : '#2563EB'
  const fmt     = (n: number) => n.toLocaleString('fr-FR')

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-gray-700">{CATEGORY_LABELS[category] ?? category}</span>
        <span className={`font-semibold ${isAlert ? 'text-amber-600' : 'text-gray-600'}`}>
          {fmt(actual)} / {fmt(budgeted)} XOF ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function BudgetPage() {
  const { profile } = useAuthStore()
  const schoolId    = profile?.schoolId ?? ''
  const funcs       = getFunctions(undefined, 'europe-west1')
  const db          = getFirestore()

  const [data,         setData]         = useState<DashboardData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [expenses,     setExpenses]     = useState<Expense[]>([])
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [saving,       setSaving]       = useState(false)

  // Formulaire nouvelle dépense
  const [form, setForm] = useState({
    category: 'fournitures', label: '', amount: '', currency: 'XOF', date: new Date().toISOString().split('T')[0], notes: '',
  })

  const getCashflowCF = httpsCallable(funcs, 'getCashflowDashboard')
  const addExpenseCF  = httpsCallable(funcs, 'addExpense')

  const loadDashboard = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    try {
      const res = await getCashflowCF({ schoolId, academicYear })
      setData(res.data as DashboardData)
    } catch { /* demo silencieux */ } finally {
      setLoading(false)
    }
  }, [schoolId, academicYear])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  // Écoute temps réel des dépenses récentes
  useEffect(() => {
    if (!schoolId) return
    const q = query(
      collection(db, 'schools', schoolId, 'expenses'),
      orderBy('createdAt', 'desc'),
      limit(15),
    )
    return onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)))
    })
  }, [schoolId])

  const handleAddExpense = async () => {
    if (!form.label || !form.amount) return
    setSaving(true)
    try {
      await addExpenseCF({ ...form, amount: Number(form.amount), schoolId })
      setForm({ category: 'fournitures', label: '', amount: '', currency: 'XOF', date: new Date().toISOString().split('T')[0], notes: '' })
      setShowAddForm(false)
      loadDashboard()
    } catch (e: any) {
      alert(`Erreur : ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('fr-FR')

  const summary = data?.summary ?? { totalIncome: 0, totalExpenses: 0, totalPayroll: 0, balance: 0, currency: 'XOF' }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trésorerie & Budget</h1>
          <p className="text-gray-500 mt-1">Vue d'ensemble financière de l'école</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
          >
            {['2025-2026', '2024-2025'].map(y => <option key={y}>{y}</option>)}
          </select>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : 'text-gray-500'}`} />
          </button>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Ajouter dépense
          </button>
        </div>
      </div>

      {/* Alertes */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-medium">{a.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenus scolarité',  value: summary.totalIncome,    icon: TrendingUp,   color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Masse salariale',    value: summary.totalPayroll,   icon: DollarSign,   color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Autres dépenses',    value: summary.totalExpenses - summary.totalPayroll, icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Solde de trésorerie', value: summary.balance,       icon: BarChart2,    color: summary.balance >= 0 ? 'text-blue-600' : 'text-red-600', bg: summary.balance >= 0 ? 'bg-blue-50' : 'bg-red-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
            <p className={`text-xl font-bold mt-0.5 ${color}`}>
              {fmt(value)} <span className="text-xs font-normal text-gray-400">{summary.currency}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Cash-flow mensuel (mini graphique texte) */}
      {data?.cashflowSeries && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            Cash-flow mensuel
          </h2>
          <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5">
            {data.cashflowSeries.filter(p => p.income > 0 || p.expenses > 0).map(p => {
              const max = Math.max(...data!.cashflowSeries.map(x => Math.max(x.income, x.expenses)), 1)
              const inH = Math.round((p.income   / max) * 60)
              const exH = Math.round((p.expenses / max) * 60)
              const label = new Date(p.month + '-01').toLocaleString('fr-FR', { month: 'short' })
              return (
                <div key={p.month} className="flex flex-col items-center gap-1">
                  <div className="flex gap-0.5 items-end h-16">
                    <div className="w-2.5 rounded-t bg-green-400 transition-all" style={{ height: inH }} title={`Entrées: ${fmt(p.income)}`} />
                    <div className="w-2.5 rounded-t bg-red-400 transition-all"   style={{ height: exH }} title={`Sorties: ${fmt(p.expenses)}`} />
                  </div>
                  <span className="text-[10px] text-gray-400">{label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-2 rounded bg-green-400 inline-block" />Entrées</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-2 rounded bg-red-400 inline-block" />Sorties</span>
          </div>
        </div>
      )}

      {/* Budget par catégorie */}
      {data?.budgetByCategory && Object.keys(data.budgetByCategory).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-500" />
            Suivi budgétaire par catégorie
          </h2>
          <div className="space-y-4">
            {Object.entries(data.budgetByCategory).map(([cat, values]) => (
              <BudgetBar key={cat} category={cat} {...values} />
            ))}
          </div>
        </div>
      )}

      {/* Formulaire ajout dépense */}
      {showAddForm && (
        <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Enregistrer une dépense</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Catégorie</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'scolarite').map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Libellé</label>
              <input
                type="text"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Ex: Achat craies et marqueurs..."
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Montant</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Devise</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {['XOF', 'XAF', 'GNF', 'EUR'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddExpense}
              disabled={saving || !form.label || !form.amount}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-600 text-sm">Annuler</button>
          </div>
        </div>
      )}

      {/* Dernières dépenses */}
      {expenses.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Dépenses récentes</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Catégorie', 'Libellé', 'Montant', 'Par'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{e.date}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                      {CATEGORY_LABELS[e.category] ?? e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{e.label}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{e.amount.toLocaleString('fr-FR')} {e.currency}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{e.paidByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
