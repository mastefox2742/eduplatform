import { useState, useEffect } from 'react'
import { query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { cols, FSFee } from '@/services/firestore'

const DEMO_FEES: FSFee[] = [
  { id: '1', studentId: 'student1', label: 'Inscription scolaire 2025-2026', amount: 500000, currency: 'GNF', dueDate: '2025-10-01', invoiceNum: 'FAC-2025-001', status: 'paid',      createdAt: { toDate: () => new Date('2025-09-01') } as any },
  { id: '2', studentId: 'student1', label: 'Frais de scolarité — T1',         amount: 250000, currency: 'GNF', dueDate: '2025-10-15', invoiceNum: 'FAC-2025-002', status: 'paid',      createdAt: { toDate: () => new Date('2025-10-01') } as any },
  { id: '3', studentId: 'student1', label: 'Frais de scolarité — T2',         amount: 250000, currency: 'GNF', dueDate: '2026-01-15', invoiceNum: 'FAC-2026-001', status: 'confirmed', createdAt: { toDate: () => new Date('2026-01-01') } as any },
  { id: '4', studentId: 'student1', label: 'Frais de scolarité — T3',         amount: 250000, currency: 'GNF', dueDate: '2026-04-15', invoiceNum: 'FAC-2026-002', status: 'pending',   createdAt: { toDate: () => new Date('2026-04-01') } as any },
  { id: '5', studentId: 'student1', label: 'Cotisation activités parascolaires',amount: 75000, currency: 'GNF', dueDate: '2026-05-30', invoiceNum: 'FAC-2026-003', status: 'unpaid',   createdAt: { toDate: () => new Date('2026-05-01') } as any },
]

export function useStudentFees(schoolId: string, studentId: string) {
  const [fees,    setFees]    = useState<FSFee[]>(DEMO_FEES)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo' || !studentId) return
    setLoading(true)
    const q = query(cols.fees(schoolId), where('studentId', '==', studentId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q,
      snap => { setFees(snap.docs.map(d => ({ id: d.id, ...d.data() } as FSFee))); setLoading(false) },
      _err => { setFees(DEMO_FEES); setLoading(false) }
    )
    return unsub
  }, [schoolId, studentId])

  const total   = fees.reduce((s, f) => s + f.amount, 0)
  const paid    = fees.filter(f => f.status === 'paid' || f.status === 'confirmed').reduce((s, f) => s + f.amount, 0)
  const pending = fees.filter(f => f.status === 'pending' || f.status === 'unpaid').reduce((s, f) => s + f.amount, 0)

  return { fees, loading, total, paid, pending }
}
