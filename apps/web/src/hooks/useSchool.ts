/**
 * Provides the current schoolId from the auth store.
 * Falls back to a demo schoolId when in demo mode.
 */
import { useAuthStore } from '@/store/auth.store'

const DEMO_SCHOOL_ID = 'demo-school'

export function useSchoolId(): string {
  const { profile } = useAuthStore()
  // In demo mode, profile is null — use the demo school
  return profile?.schoolId ?? DEMO_SCHOOL_ID
}

export { DEMO_SCHOOL_ID }
