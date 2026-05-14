import { BookOpen, ClipboardList, Users, Sparkles, Clock, ChevronRight } from 'lucide-react'
import { StatCard, Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/store/auth.store'
import { formatRelativeDate } from '@/lib/utils'

const DEMO_CLASSES = [
  { id: '1', name: '6ème A', studentCount: 28, avgScore: 13.4, lastActivity: Date.now() - 3600000,  subject: 'Mathématiques' },
  { id: '2', name: '5ème B', studentCount: 26, avgScore: 11.8, lastActivity: Date.now() - 86400000, subject: 'Mathématiques' },
  { id: '3', name: '4ème A', studentCount: 30, avgScore: 14.2, lastActivity: Date.now() - 172800000, subject: 'Physique'     },
]

const DEMO_PENDING = [
  { id: '1', student: 'Kwamé Asante',  exercise: 'Exercice Fractions #3',   submittedAt: Date.now() - 3600000  },
  { id: '2', student: 'Amina Diallo',  exercise: 'Rédaction — La météo',     submittedAt: Date.now() - 7200000  },
  { id: '3', student: 'Lucas Martin',  exercise: 'Problème algèbre #7',      submittedAt: Date.now() - 14400000 },
]

const DEMO_COURSES = [
  { id: '1', title: 'Les fractions',             subject: 'Maths',   level: '6ème', status: 'published', completionRate: 73 },
  { id: '2', title: 'Les équations du 1er degré', subject: 'Maths',  level: '5ème', status: 'published', completionRate: 45 },
  { id: '3', title: 'Les circuits électriques',  subject: 'Physique', level: '4ème', status: 'draft',     completionRate: 0  },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'published') return <Badge variant="success">Publié</Badge>
  if (status === 'draft')     return <Badge variant="gray">Brouillon</Badge>
  return <Badge variant="warning">Archivé</Badge>
}

export function TeacherDashboardPage() {
  const { profile } = useAuthStore()
  const greeting = new Date().getHours() < 12 ? 'Bonjour' : 'Bonsoir'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {profile?.displayName?.split(' ')[0] ?? 'Professeur'} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button variant="primary" leftIcon={<Sparkles size={16} />}>
          Générer avec IA
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Mes classes"
          value={DEMO_CLASSES.length}
          subtitle={`${DEMO_CLASSES.reduce((s, c) => s + c.studentCount, 0)} élèves au total`}
          icon={<Users size={22} className="text-primary-600" />}
          iconBg="bg-primary-50"
        />
        <StatCard
          title="Cours publiés"
          value={DEMO_COURSES.filter((c) => c.status === 'published').length}
          subtitle={`${DEMO_COURSES.filter((c) => c.status === 'draft').length} brouillon(s)`}
          icon={<BookOpen size={22} className="text-success-600" />}
          iconBg="bg-success-50"
        />
        <StatCard
          title="À corriger"
          value={DEMO_PENDING.length}
          subtitle="Exercices en attente"
          icon={<ClipboardList size={22} className="text-warning-600" />}
          iconBg="bg-warning-50"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Mes classes */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Mes classes</h3>
            <button className="text-sm text-primary-600 hover:underline font-medium">Voir tout</button>
          </div>
          <div className="space-y-3">
            {DEMO_CLASSES.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors group"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users size={18} className="text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{cls.name}</p>
                    <Badge variant="gray">{cls.subject}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{cls.studentCount} élèves · Dernière activité {formatRelativeDate(cls.lastActivity)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">{cls.avgScore}<span className="text-sm text-gray-400">/20</span></p>
                  <p className="text-xs text-gray-400">Moyenne classe</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            ))}
          </div>
        </Card>

        {/* À corriger */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">À corriger</h3>
            <Badge variant="warning">{DEMO_PENDING.length}</Badge>
          </div>
          <div className="space-y-3">
            {DEMO_PENDING.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-warning-50 border border-warning-100">
                <Avatar name={item.student} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.student}</p>
                  <p className="text-xs text-gray-500 truncate">{item.exercise}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock size={10} /> {formatRelativeDate(item.submittedAt)}
                  </p>
                </div>
              </div>
            ))}
            <Button variant="secondary" className="w-full" size="sm">
              Voir tous les exercices
            </Button>
          </div>
        </Card>
      </div>

      {/* Mes cours */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Mes cours</h3>
          <Button variant="primary" size="sm" leftIcon={<BookOpen size={14} />}>
            Nouveau cours
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cours</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Matière</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Niveau</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Statut</th>
                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Complétion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {DEMO_COURSES.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="py-3">
                    <p className="text-sm font-medium text-gray-900">{course.title}</p>
                  </td>
                  <td className="py-3 text-sm text-gray-500">{course.subject}</td>
                  <td className="py-3 text-sm text-gray-500">{course.level}</td>
                  <td className="py-3"><StatusBadge status={course.status} /></td>
                  <td className="py-3 text-right">
                    {course.status === 'published' ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${course.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{course.completionRate}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
