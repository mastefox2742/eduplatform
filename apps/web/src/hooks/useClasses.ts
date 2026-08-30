/**
 * Classes de l'école, depuis Supabase (verticale référentiel / identité).
 * Utilisé par l'écran d'inscription pour proposer des classes réelles,
 * avec leurs identifiants — indispensables à `enroll-student`.
 */
import { useState, useEffect } from 'react'
import { supabase, usesSupabase } from '@/config/supabase'
import { useSchoolId } from './useSchool'

export interface ClassOption {
  id:         string
  name:       string
  levelId:    string | null
  levelName:  string | null
}

export function useClasses(): { classes: ClassOption[]; loading: boolean } {
  const schoolId = useSchoolId()
  const enabled  = usesSupabase('identite') || usesSupabase('referentiel')
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    supabase
      .from('classes')
      .select('id, name, level_id, level_name')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (cancelled) return
        setClasses(
          (data ?? []).map((c) => ({
            id:        c.id as string,
            name:      c.name as string,
            levelId:   (c.level_id as string) ?? null,
            levelName: (c.level_name as string) ?? null,
          }))
        )
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [enabled, schoolId])

  return { classes, loading }
}
