import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleHome } from '@/components/auth/RoleHome'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { UserRole } from '@school/shared-types'

const DesignPage         = lazy(() => import('@/pages/DesignPage').then(m => ({ default: m.DesignPage })))
const DirectionOverview  = lazy(() => import('@/pages/direction/OverviewPage').then(m => ({ default: m.DirectionOverviewPage })))
const DirectionDashboard = lazy(() => import('@/pages/direction/DashboardPage').then(m => ({ default: m.DirectionDashboardPage })))
const TeacherDashboard   = lazy(() => import('@/pages/teacher/DashboardPage').then(m => ({ default: m.TeacherDashboardPage })))
const StudentsPage       = lazy(() => import('@/pages/direction/StudentsPage').then(m => ({ default: m.StudentsPage })))
const TeachersPage       = lazy(() => import('@/pages/direction/TeachersPage').then(m => ({ default: m.TeachersPage })))
const ClassesPage           = lazy(() => import('@/pages/direction/ClassesPage').then(m => ({ default: m.ClassesPage })))
const ReportsPage           = lazy(() => import('@/pages/direction/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SettingsPage          = lazy(() => import('@/pages/direction/SettingsPage').then(m => ({ default: m.SettingsPage })))
const AssessmentsPage       = lazy(() => import('@/pages/direction/AssessmentsPage').then(m => ({ default: m.AssessmentsPage })))
const TeacherAttendancePage = lazy(() => import('@/pages/direction/TeacherAttendancePage').then(m => ({ default: m.TeacherAttendancePage })))
const SchedulePage          = lazy(() => import('@/pages/direction/SchedulePage').then(m => ({ default: m.SchedulePage })))
const ExamRegistrationPage   = lazy(() => import('@/pages/direction/ExamRegistrationPage').then(m => ({ default: m.ExamRegistrationPage })))
const ExamResultsPage        = lazy(() => import('@/pages/direction/ExamResultsPage').then(m => ({ default: m.ExamResultsPage })))
const TeacherAssessmentsPage = lazy(() => import('@/pages/teacher/AssessmentsPage').then(m => ({ default: m.TeacherAssessmentsPage })))
const ExportsPage            = lazy(() => import('@/pages/direction/ExportsPage'))
const BudgetPage             = lazy(() => import('@/pages/direction/BudgetPage'))
const TeacherSchedulePage   = lazy(() => import('@/pages/teacher/SchedulePage').then(m => ({ default: m.TeacherSchedulePage })))
const TeacherClassesPage    = lazy(() => import('@/pages/teacher/ClassesPage').then(m => ({ default: m.TeacherClassesPage })))
const TeacherCoursesPage    = lazy(() => import('@/pages/teacher/CoursesPage').then(m => ({ default: m.TeacherCoursesPage })))
const TeacherExercisesPage  = lazy(() => import('@/pages/teacher/ExercisesPage').then(m => ({ default: m.TeacherExercisesPage })))
const TeacherGradebookPage  = lazy(() => import('@/pages/teacher/GradebookPage').then(m => ({ default: m.TeacherGradebookPage })))

function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/login',        element: <LoginPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  // Galerie du design system : publique et sans donnée réelle. Elle sert
  // de référence partagée entre le développement et la maquette, et permet
  // de vérifier un composant sans backend ni compte.
  { path: '/design', element: <PageWrapper><DesignPage /></PageWrapper> },
  { path: '*',             element: <NotFoundPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <RoleHome /> },

      // Direction
      {
        path: 'direction',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><DirectionOverview /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/analytics',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><DirectionDashboard /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/students',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><StudentsPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/teachers',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><TeachersPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/classes',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><ClassesPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/reports',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><ReportsPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/settings',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><SettingsPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/assessments',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><AssessmentsPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/attendance',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><TeacherAttendancePage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/schedule',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><SchedulePage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/exams',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><ExamRegistrationPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/exam-results',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><ExamResultsPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },

      {
        path: 'direction/exports',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><ExportsPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'direction/budget',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.DIRECTION, UserRole.ADMIN]}>
            <PageWrapper><BudgetPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },

      // Teacher
      {
        path: 'teacher',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
            <PageWrapper><TeacherDashboard /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher/schedule',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
            <PageWrapper><TeacherSchedulePage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher/assessments',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
            <PageWrapper><TeacherAssessmentsPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher/classes',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
            <PageWrapper><TeacherClassesPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher/courses',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
            <PageWrapper><TeacherCoursesPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher/exercises',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
            <PageWrapper><TeacherExercisesPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher/gradebook',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
            <PageWrapper><TeacherGradebookPage /></PageWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },
])
