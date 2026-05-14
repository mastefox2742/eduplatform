import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Il y a ${days}j`
  return formatDate(timestamp)
}

export function computeAverage(grades: Array<{ value: number; coefficient: number }>): number {
  if (!grades.length) return 0
  const totalCoeff = grades.reduce((s, g) => s + g.coefficient, 0)
  const weighted = grades.reduce((s, g) => s + g.value * g.coefficient, 0)
  return totalCoeff > 0 ? Math.round((weighted / totalCoeff) * 100) / 100 : 0
}

export function gradeToMention(grade: number): { label: string; color: string } {
  if (grade >= 16) return { label: 'Très bien', color: 'success' }
  if (grade >= 14) return { label: 'Bien', color: 'primary' }
  if (grade >= 12) return { label: 'Assez bien', color: 'warning' }
  if (grade >= 10) return { label: 'Passable', color: 'warning' }
  return { label: 'Insuffisant', color: 'danger' }
}

export function generateStudentCode(prefix = 'ELV'): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}-${year}-${rand}`
}
