import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Users, BookOpen,
  CheckCircle2, AlertTriangle, Download, Calendar,
  BarChart2, Award, Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

// ── Data ──────────────────────────────────────────────────────────────────────

const TRIMESTER_SCORES = [
  { class: '6ème A', t1: 12.8, t2: 13.2, t3: null },
  { class: '6ème B', t1: 11.5, t2: 12.1, t3: null },
  { class: '5ème A', t1: 13.1, t2: 13.8, t3: null },
  { class: '5ème B', t1: 11.0, t2: 11.4, t3: null },
  { class: '4ème A', t1: 12.2, t2: 12.6, t3: null },
  { class: '3ème A', t1: 11.6, t2: 11.9, t3: null },
]

const SUBJECT_PERFORMANCE = [
  { subject: 'EPS',             avg: 15.9, exercises: 32, completion: 91 },
  { subject: 'Sciences',        avg: 14.2, exercises: 48, completion: 85 },
  { subject: 'Mathématiques',   avg: 12.8, exercises: 72, completion: 79 },
  { subject: 'Histoire-Géo',    avg: 12.6, exercises: 28, completion: 74 },
  { subject: 'Français',        avg: 12.2, exercises: 41, completion: 71 },
  { subject: 'Anglais',         avg: 11.9, exercises: 35, completion: 68 },
]

const MONTHLY_ACTIVITY = [
  { month: 'Sep', exercises: 42, submissions: 380 },
  { month: 'Oct', exercises: 68, submissions: 610 },
  { month: 'Nov', exercises: 55, submissions: 520 },
  { month: 'Déc', exercises: 31, submissions: 290 },
  { month: 'Jan', exercises: 72, submissions: 680 },
  { month: 'Fév', exercises: 84, submissions: 760 },
  { month: 'Mar', exercises: 91, submissions: 840 },
  { month: 'Avr', exercises: 78, submissions: 720 },
  { month: 'Mai', exercises: 63, submissions: 580 },
]

const TOP_STUDENTS = [
  { name: 'Sofia Mancini',   class: '5ème A', avg: 16.4, trend: 'up' },
  { name: 'Marie Dubois',    class: '6ème A', avg: 15.2, trend: 'up' },
  { name: 'Lisa Chen',       class: '5ème A', avg: 14.8, trend: 'stable' },
  { name: 'Emma Wilson',     class: '4ème A', avg: 15.1, trend: 'up' },
  { name: 'Camille Noir',    class: '3ème A', avg: 14.3, trend: 'up' },
]

const STUDENTS_AT_RISK = [
  { name: 'Kwamé Asante',    class: '6ème B', avg: 8.4,  issue: 'Moy. <10' },
  { name: 'Amina Diallo',    class: '6ème A', avg: 9.2,  issue: 'Moy. <10' },
  { name: 'Tom Rousseau',    class: '3ème A', avg: 8.6,  issue: 'Absent 4j' },
  { name: 'Marc Petit',      class: '5ème B', avg: 9.6,  issue: 'Moy. <10' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, trend, color = 'primary' }: {
  icon: React.ReactNode; label: string; value: string | number
  sub?: string; trend?: 'up' | 'down' | 'stable'; color?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
          color === 'primary' ? 'bg-primary-50' : color === 'success' ? 'bg-success-50' :
          color === 'warning' ? 'bg-warning-50' : color === 'danger' ? 'bg-danger-50' : 'bg-purple-50'
        )}>{icon}</div>
        {trend && (
          <span className={cn('text-xs font-medium flex items-center gap-1',
            trend === 'up' ? 'text-success-600' : trend === 'down' ? 'text-danger-600' : 'text-gray-400'
          )}>
            {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
            {trend === 'up' ? '+2.4%' : trend === 'down' ? '-1.1%' : '='}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/** Vertical bar chart using pure CSS */
function BarChart({ data, valueKey, labelKey, color = 'bg-primary-500' }: {
  data: Record<string, any>[]
  valueKey: string
  labelKey: string
  color?: string
}) {
  const max = Math.max(...data.map(d => d[valueKey]))
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => {
        const pct = max > 0 ? (d[valueKey] / max) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex items-end" style={{ height: '100px' }}>
              <div
                className={cn('w-full rounded-t-lg transition-all group-hover:opacity-80', color)}
                style={{ height: `${pct}%` }}
                title={`${d[labelKey]}: ${d[valueKey]}`}
              />
            </div>
            <span className="text-xs text-gray-400">{d[labelKey]}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Horizontal score bar */
function HBar({ score, max = 20 }: { score: number; max?: number }) {
  const pct = (score / max) * 100
  const color = score >= 14 ? 'bg-success-500' : score >= 10 ? 'bg-warning-400' : 'bg-danger-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-sm font-bold w-10 text-right',
        score >= 14 ? 'text-success-600' : score >= 10 ? 'text-warning-600' : 'text-danger-600'
      )}>{score}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [period, setPeriod] = useState<'T1' | 'T2' | 'Année'>('T2')

  const overallAvg = +(TRIMESTER_SCORES.reduce((s, c) => s + (c.t2 ?? 0), 0) / TRIMESTER_SCORES.length).toFixed(1)
  const maxActivity = Math.max(...MONTHLY_ACTIVITY.map(m => m.submissions))

  return (
    <div className="px-8 py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports & Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Vue d'ensemble · Année 2025-2026</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(['T1', 'T2', 'Année'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}>{p}</button>
            ))}
          </div>
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>Exporter PDF</Button>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Users size={18} className="text-primary-600" />}        label="Élèves totaux"        value={144}           sub="10 nouvelles inscriptions" trend="up"     color="primary" />
        <StatCard icon={<Award size={18} className="text-success-600" />}         label="Moyenne générale"    value={`${overallAvg}/20`} sub="T2 2025-2026"       trend="up"     color="success" />
        <StatCard icon={<CheckCircle2 size={18} className="text-purple-600" />}   label="Exercices complétés"  value="1 842"         sub="Ce trimestre"              trend="up"     color="purple" />
        <StatCard icon={<AlertTriangle size={18} className="text-warning-500" />} label="Élèves en difficulté" value={4}             sub="Nécessitent un suivi"      trend="down"   color="warning" />
      </div>

      {/* Two columns: Activity chart + Trimester comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* Monthly activity */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Activité mensuelle</h3>
            <Badge variant="primary" size="sm">Soumissions</Badge>
          </div>
          <BarChart data={MONTHLY_ACTIVITY} valueKey="submissions" labelKey="month" color="bg-primary-400" />
        </div>

        {/* Class comparison T1→T2 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Évolution par classe</h3>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-gray-300 inline-block" />T1</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-primary-500 inline-block" />T2</span>
            </div>
          </div>
          <div className="space-y-3">
            {TRIMESTER_SCORES.map(row => {
              const diff = row.t2 !== null && row.t1 !== null ? +(row.t2 - row.t1).toFixed(1) : null
              return (
                <div key={row.class}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 w-16 flex-shrink-0">{row.class}</span>
                    <div className="flex items-center gap-2 flex-1 mx-3">
                      {/* T1 bar */}
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-300 rounded-full" style={{ width: `${((row.t1 ?? 0) / 20) * 100}%` }} />
                      </div>
                      {/* T2 bar */}
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', (row.t2 ?? 0) >= 14 ? 'bg-success-500' : (row.t2 ?? 0) >= 10 ? 'bg-primary-500' : 'bg-danger-500')}
                          style={{ width: `${((row.t2 ?? 0) / 20) * 100}%` }} />
                      </div>
                    </div>
                    {diff !== null && (
                      <span className={cn('text-xs font-semibold w-12 text-right',
                        diff > 0 ? 'text-success-600' : diff < 0 ? 'text-danger-600' : 'text-gray-400'
                      )}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Three columns: Subjects + Top students + At-risk */}
      <div className="grid grid-cols-3 gap-4">
        {/* Subject performance */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Performance par matière</h3>
          <div className="space-y-3">
            {SUBJECT_PERFORMANCE.map(s => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 truncate flex-1">{s.subject}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-gray-400">{s.completion}%</span>
                  </div>
                </div>
                <HBar score={s.avg} />
              </div>
            ))}
          </div>
        </div>

        {/* Top students */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-warning-500" />
            <h3 className="font-semibold text-gray-900">Meilleurs élèves</h3>
          </div>
          <div className="space-y-3">
            {TOP_STUDENTS.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  i === 0 ? 'bg-warning-100 text-warning-700' :
                  i === 1 ? 'bg-gray-100 text-gray-600' :
                  i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                )}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.class}</p>
                </div>
                <span className="text-sm font-bold text-success-600">{s.avg}/20</span>
              </div>
            ))}
          </div>
        </div>

        {/* At-risk students */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-danger-500" />
            <h3 className="font-semibold text-gray-900">Élèves à surveiller</h3>
          </div>
          <div className="space-y-3">
            {STUDENTS_AT_RISK.map((s) => (
              <div key={s.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-danger-50 border border-danger-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.class}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-danger-600">{s.avg}/20</span>
                  <Badge variant="danger" size="sm">{s.issue}</Badge>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium text-center">
            Voir tous les élèves en difficulté →
          </button>
        </div>
      </div>

      {/* Attendance heatmap (simplified) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Assiduité par classe · {period}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success-200 inline-block" />{'≥95%'}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning-200 inline-block" />{'85-94%'}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-danger-200 inline-block" />{'<85%'}</span>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {[
            { class: '6ème A', rate: 94 }, { class: '6ème B', rate: 88 },
            { class: '5ème A', rate: 97 }, { class: '5ème B', rate: 91 },
            { class: '4ème A', rate: 93 }, { class: '3ème A', rate: 89 },
          ].map(c => (
            <div key={c.class} className={cn(
              'rounded-xl p-3 text-center border',
              c.rate >= 95 ? 'bg-success-50 border-success-100' :
              c.rate >= 85 ? 'bg-warning-50 border-warning-100' : 'bg-danger-50 border-danger-100'
            )}>
              <p className={cn('text-lg font-bold',
                c.rate >= 95 ? 'text-success-700' : c.rate >= 85 ? 'text-warning-700' : 'text-danger-700'
              )}>{c.rate}%</p>
              <p className="text-xs text-gray-500 font-medium">{c.class}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
