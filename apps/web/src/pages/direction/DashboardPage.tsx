import { Users, GraduationCap, BookOpen, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { StatCard, Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/store/auth.store'
import { formatRelativeDate } from '@/lib/utils'

// Données de démonstration — à remplacer par des hooks Firebase
const DEMO_STATS = {
  totalStudents:   312,
  totalTeachers:   18,
  totalCourses:    94,
  avgScore:        13.7,
  presentToday:    287,
  absentToday:     25,
  completionRate:  74,
}

const DEMO_ALERTS = [
  { id: '1', type: 'warning',  message: 'Kwamé Asante — absent 3 jours consécutifs',    time: Date.now() - 3600000  },
  { id: '2', type: 'warning',  message: 'Amina Diallo — moyenne <10 en Mathématiques',  time: Date.now() - 7200000  },
  { id: '3', type: 'info',     message: '8 bulletins en attente de validation',          time: Date.now() - 10800000 },
  { id: '4', type: 'success',  message: 'Examen brevet blanc planifié pour le 20 jan.', time: Date.now() - 86400000 },
]

const DEMO_RECENT_STUDENTS = [
  { id: '1', name: 'Marie Dubois',    class: '6ème A', score: 15.2, status: 'Excellent'  },
  { id: '2', name: 'Kwamé Asante',    class: '5ème B', score: 8.4,  status: 'Attention'  },
  { id: '3', name: 'Fatou Sow',       class: '4ème C', score: 13.6, status: 'Bien'       },
  { id: '4', name: 'Lucas Martin',    class: '3ème A', score: 11.8, status: 'Passable'   },
  { id: '5', name: 'Amina Diallo',    class: '6ème B', score: 9.2,  status: 'Attention'  },
]

const DEMO_ACTIVITIES = [
  { id: '1', user: 'M. Leblanc',    action: 'a publié le cours "Fractions"',         time: Date.now() - 1800000  },
  { id: '2', user: 'Mme Martin',    action: 'a créé 5 exercices de conjugaison',     time: Date.now() - 3600000  },
  { id: '3', user: 'M. Dupont',     action: 'a généré les bulletins de 3ème A',      time: Date.now() - 7200000  },
  { id: '4', user: 'Mme Kourouma', action: 'a assigné un devoir à 5ème B',           time: Date.now() - 14400000 },
]

function AlertBadge({ type }: { type: string }) {
  if (type === 'warning') return <Badge variant="warning">⚠ Alerte</Badge>
  if (type === 'success') return <Badge variant="success">✓ Info</Badge>
  return <Badge variant="primary">ℹ Info</Badge>
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 14) return <Badge variant="success">{score}</Badge>
  if (score >= 10) return <Badge variant="warning">{score}</Badge>
  return <Badge variant="danger">{score}</Badge>
}

export function DirectionDashboardPage() {
  const { profile } = useAuthStore()
  const greeting = new Date().getHours() < 12 ? 'Bonjour' : 'Bonsoir'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {profile?.displayName?.split(' ')[0] ?? 'Directeur'} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Élèves inscrits"
          value={DEMO_STATS.totalStudents}
          subtitle={`${DEMO_STATS.presentToday} présents aujourd'hui`}
          icon={<GraduationCap size={22} className="text-primary-600" />}
          iconBg="bg-primary-50"
          trend={{ value: 3.2, label: 'vs mois dernier' }}
        />
        <StatCard
          title="Professeurs"
          value={DEMO_STATS.totalTeachers}
          subtitle="Tous actifs"
          icon={<Users size={22} className="text-purple-600" />}
          iconBg="bg-purple-50"
        />
        <StatCard
          title="Cours publiés"
          value={DEMO_STATS.totalCourses}
          subtitle={`Taux de complétion : ${DEMO_STATS.completionRate}%`}
          icon={<BookOpen size={22} className="text-success-600" />}
          iconBg="bg-success-50"
        />
        <StatCard
          title="Moyenne générale"
          value={`${DEMO_STATS.avgScore}/20`}
          subtitle="Tous niveaux confondus"
          icon={<TrendingUp size={22} className="text-warning-600" />}
          iconBg="bg-warning-50"
          trend={{ value: 0.4, label: 'vs trimestre 1' }}
        />
      </div>

      {/* Présence du jour */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Présence aujourd'hui</h3>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-600">Présents</span>
              <span className="text-sm font-semibold text-gray-900">
                {DEMO_STATS.presentToday}/{DEMO_STATS.totalStudents}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-success-500 rounded-full transition-all duration-700"
                style={{ width: `${(DEMO_STATS.presentToday / DEMO_STATS.totalStudents) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <div className="flex items-center gap-1.5 text-success-600">
                <CheckCircle2 size={16} />
                <span className="text-xl font-bold">{DEMO_STATS.presentToday}</span>
              </div>
              <p className="text-xs text-gray-400">Présents</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-danger-600">
                <AlertCircle size={16} />
                <span className="text-xl font-bold">{DEMO_STATS.absentToday}</span>
              </div>
              <p className="text-xs text-gray-400">Absents</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Two columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Alertes */}
        <Card className="xl:col-span-1">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Alertes & notifications</h3>
          <div className="space-y-3">
            {DEMO_ALERTS.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <AlertBadge type={alert.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Clock size={10} /> {formatRelativeDate(alert.time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Élèves récents */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Élèves à surveiller</h3>
            <button className="text-sm text-primary-600 hover:underline font-medium">Voir tout</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Élève</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Classe</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Moyenne</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {DEMO_RECENT_STUDENTS.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} size="sm" />
                        <span className="text-sm font-medium text-gray-900">{student.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-gray-500">{student.class}</td>
                    <td className="py-3 text-right">
                      <ScoreBadge score={student.score} />
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-xs font-medium ${
                        student.status === 'Excellent' ? 'text-success-600' :
                        student.status === 'Attention' ? 'text-danger-600' :
                        'text-gray-500'
                      }`}>{student.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Activité récente */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Activité récente</h3>
        <div className="space-y-3">
          {DEMO_ACTIVITIES.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3">
              <Avatar name={activity.user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{activity.user}</span> {activity.action}
                </p>
              </div>
              <p className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                <Clock size={10} /> {formatRelativeDate(activity.time)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
