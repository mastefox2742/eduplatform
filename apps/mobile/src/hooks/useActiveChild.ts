/**
 * useActiveChild — l'enfant dont le parent consulte le dossier.
 *
 * Cahier des charges §16.1, §26.
 *
 * La liste vient désormais de `student_guardians`, pas de
 * `profiles.children` (JSONB déprécié). Ce n'est pas un détail
 * d'implémentation : un tableau JSON ne porte aucune contrainte, si
 * bien qu'un rattachement erroné exposait le dossier d'un enfant à la
 * mauvaise famille.
 *
 * Le hook n'applique **aucun filtre de son côté** : RLS ne renvoie que
 * les enfants auxquels ce parent est explicitement rattaché — c'est le
 * critère d'acceptation §26.
 */
import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/config/supabase'
import { useAuth } from './useAuth'

const STORAGE_KEY = '@projetto1:active_child_id'

export interface ChildRef {
  studentId: string
  name: string
  className: string
  levelName: string
  schoolId: string
  photoUrl: string | null
  /** Ce parent est-il le responsable financier de cet enfant ? */
  isFinancial: boolean
  relation: string
}

export function useActiveChild() {
  const { user, profile } = useAuth()
  const [children, setChildren] = useState<ChildRef[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const userId = user?.id ?? null

  const load = useCallback(async () => {
    if (!userId) {
      setChildren([])
      setIsLoading(false)
      return
    }

    // Cas de l'élève lui-même : il n'a pas de « liste d'enfants »,
    // mais les écrans partagés attendent la même forme.
    if (profile?.role === 'student' || profile?.role === 'eleve') {
      setChildren([{
        studentId: userId,
        name: profile.displayName ?? 'Moi',
        className: profile.className ?? '',
        levelName: profile.levelName ?? '',
        schoolId: profile.schoolId ?? '',
        photoUrl: profile.photoUrl ?? null,
        isFinancial: false,
        relation: 'self',
      }])
      setActiveId(userId)
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('student_guardians')
      .select(`
        student_id, is_financial, relation, school_id,
        profiles!student_guardians_student_id_fkey (
          display_name, photo_url, class_name, level_name
        )
      `)
      .eq('guardian_id', userId)

    if (error) {
      setChildren([])
      setIsLoading(false)
      return
    }

    const rows = (data ?? []) as unknown as Array<{
      student_id: string
      is_financial: boolean
      relation: string
      school_id: string
      profiles: {
        display_name: string | null
        photo_url: string | null
        class_name: string | null
        level_name: string | null
      } | null
    }>

    const list: ChildRef[] = rows.map((r) => ({
      studentId: r.student_id,
      name: r.profiles?.display_name ?? 'Mon enfant',
      className: r.profiles?.class_name ?? '',
      levelName: r.profiles?.level_name ?? '',
      schoolId: r.school_id,
      photoUrl: r.profiles?.photo_url ?? null,
      isFinancial: r.is_financial,
      relation: r.relation,
    }))

    setChildren(list)

    // Restaure le dernier enfant consulté, s'il est toujours rattaché.
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    const valid = stored && list.some((c) => c.studentId === stored)
    setActiveId(valid ? stored : list[0]?.studentId ?? null)
    setIsLoading(false)
  }, [userId, profile?.role, profile?.displayName, profile?.className,
      profile?.levelName, profile?.schoolId, profile?.photoUrl])

  useEffect(() => { void load() }, [load])

  const setActive = useCallback(async (studentId: string) => {
    // On refuse un enfant hors de la liste : RLS bloquerait de toute
    // façon les requêtes, mais l'écran afficherait un vide inexplicable.
    if (!children.some((c) => c.studentId === studentId)) return
    setActiveId(studentId)
    await AsyncStorage.setItem(STORAGE_KEY, studentId)
  }, [children])

  const activeChild = children.find((c) => c.studentId === activeId) ?? null

  return {
    children,
    activeChild,
    /** École de l'enfant consulté : les enfants d'une même famille
     *  peuvent être scolarisés dans deux établissements du réseau. */
    activeSchoolId: activeChild?.schoolId ?? null,
    activeId,
    setActive,
    isLoading,
    /** Le sélecteur d'enfant n'a de sens qu'au-delà d'un enfant. */
    hasMultiple: children.length > 1,
    reload: load,
  }
}
