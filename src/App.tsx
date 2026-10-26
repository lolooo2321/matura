import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './lib/db'
import { Shell } from './components/layout/Shell'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { SchedulePage } from './pages/Schedule'
import { Exams } from './pages/Exams'
import { TaskBank } from './pages/TaskBank'
import { AiTutor } from './pages/AiTutor'
import { Quizzes } from './pages/Quizzes'
import { Statistics } from './pages/Statistics'
import { SettingsPage } from './pages/Settings'
import { useTheme } from './hooks/useTheme'

const LOADING = 'LOADING' as const

function Gate({ children }: { children: ReactNode }) {
  useTheme()
  const settings = useLiveQuery(() => db.settings.get(1), [], LOADING)
  if (settings === LOADING) return null
  if (!settings || !settings.onboardingDone) return <Onboarding />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Gate>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/raspored" element={<SchedulePage />} />
            <Route path="/mature" element={<Exams />} />
            <Route path="/zadaci" element={<TaskBank />} />
            <Route path="/tutor" element={<AiTutor />} />
            <Route path="/kvizovi" element={<Quizzes />} />
            <Route path="/statistika" element={<Statistics />} />
            <Route path="/postavke" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Gate>
    </BrowserRouter>
  )
}
