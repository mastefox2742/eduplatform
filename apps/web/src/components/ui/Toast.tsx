import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { cn } from '@/lib/utils'

const ICONS = {
  success: <CheckCircle size={18} className="text-success-600" />,
  error:   <XCircle    size={18} className="text-danger-600"  />,
  warning: <AlertTriangle size={18} className="text-warning-600" />,
  info:    <Info       size={18} className="text-primary-600" />,
}

const COLORS = {
  success: 'border-success-200 bg-success-50',
  error:   'border-danger-200  bg-danger-50',
  warning: 'border-warning-200 bg-warning-50',
  info:    'border-primary-200 bg-primary-50',
}

function ToastItem({ id, type, title, message }: { id: string; type: keyof typeof ICONS; title: string; message?: string }) {
  const { removeToast } = useUIStore()

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 4000)
    return () => clearTimeout(timer)
  }, [id, removeToast])

  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-4 shadow-card animate-slide-up', COLORS[type])}>
      {ICONS[type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {message && <p className="text-xs text-gray-600 mt-0.5">{message}</p>}
      </div>
      <button onClick={() => removeToast(id)} className="text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useUIStore()

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => <ToastItem key={t.id} {...t} />)}
    </div>
  )
}
