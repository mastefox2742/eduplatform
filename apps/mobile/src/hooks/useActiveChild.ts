/**
 * useActiveChild — Gestion du profil enfant actif (multi-enfants)
 *
 * Un parent peut avoir plusieurs enfants dans la même école ou
 * dans des écoles différentes utilisant EduSchool.
 * Ce hook persiste le choix dans AsyncStorage et expose :
 *   - activeChild : l'enfant sélectionné (ChildRef)
 *   - children    : tous les enfants du parent
 *   - setActive   : changer d'enfant
 */
import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from './useAuth'
import type { ChildRef } from '@school/shared-types'

const STORAGE_KEY = '@eduschool:active_child_id'

// Construire la liste des enfants depuis le profil parent
function extractChildren(profile: any): ChildRef[] {
  if (!profile) return []

  // Cas 1 : profile.children[] (ParentProfile complet)
  if (Array.isArray(profile.children) && profile.children.length > 0) {
    return profile.children as ChildRef[]
  }

  // Cas 2 : profile.studentId / childId (parent avec un seul enfant)
  const studentId = profile.studentId ?? profile.childId
  if (studentId) {
    return [{
      studentId,
      name:      profile.childName   ?? 'Mon enfant',
      className: profile.childClass  ?? '',
      schoolId:  profile.schoolId    ?? '',
      levelName: profile.childLevel  ?? '',
    }]
  }

  // Cas 3 : l'utilisateur EST l'élève (rôle student)
  if (profile.role === 'student') {
    return [{
      studentId:  profile.id ?? '',
      name:       profile.displayName ?? 'Moi',
      className:  profile.className   ?? '',
      schoolId:   profile.schoolId    ?? '',
      levelName:  profile.levelName   ?? '',
    }]
  }

  return []
}

export function useActiveChild() {
  const { profile } = useAuth()

  const children = extractChildren(profile)

  const [activeChildId, setActiveChildId] = useState<string>(
    children[0]?.studentId ?? ''
  )

  // Charger le dernier enfant actif depuis AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved && children.some(c => c.studentId === saved)) {
        setActiveChildId(saved)
      } else if (children.length > 0) {
        setActiveChildId(children[0].studentId)
      }
    })
  }, [profile?.id])

  const setActive = useCallback(async (studentId: string) => {
    setActiveChildId(studentId)
    await AsyncStorage.setItem(STORAGE_KEY, studentId)
  }, [])

  const activeChild = children.find(c => c.studentId === activeChildId) ?? children[0] ?? null

  return {
    children,
    activeChild,
    activeChildId: activeChild?.studentId ?? '',
    activeSchoolId: activeChild?.schoolId ?? profile?.schoolId ?? 'demo',
    setActive,
    hasMultipleChildren: children.length > 1,
  }
}
