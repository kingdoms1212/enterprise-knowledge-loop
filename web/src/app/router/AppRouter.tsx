import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { apiErrorMessage, isAuthenticationError } from '../../common/api/client'
import { Button } from '../../common/components/Button'
import { EmptyState, LoadingState, Notice } from '../../common/components/Feedback'
import { useSession } from '../../features/session/model/session'
import { AssignmentSelectionPage } from '../../pages/assignment-selection/AssignmentSelectionPage'
import { LoginPage } from '../../pages/login/LoginPage'
import { MyWorkPage } from '../../pages/my-work/MyWorkPage'
import styles from '../../pages/AuthPages.module.css'
import { AppLayout } from '../layout/AppLayout'

const DocumentLibraryPage = lazy(() => import('../../pages/document-library/DocumentLibraryPage')
  .then((module) => ({ default: module.DocumentLibraryPage })))
const VoiceIntakePage = lazy(() => import('../../pages/voice-intake/VoiceIntakePage')
  .then((module) => ({ default: module.VoiceIntakePage })))
const CaseWorkspacePage = lazy(() => import('../../pages/case-workspace/CaseWorkspacePage')
  .then((module) => ({ default: module.CaseWorkspacePage })))
const StyleGuidePage = lazy(() => import('../../pages/style-guide/StyleGuidePage')
  .then((module) => ({ default: module.StyleGuidePage })))

export function AppRouter() {
  return <BrowserRouter>
    <Suspense fallback={<LoadingState label="화면 불러오는 중" />}><Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/style-guide" element={<StyleGuidePage />} />
      <Route element={<RequireSession />}>
        <Route path="/assignments" element={<AssignmentSelectionPage />} />
        <Route element={<RequireAssignment />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate replace to="/work" />} />
            <Route path="/work" element={<MyWorkPage />} />
            <Route path="/documents" element={<DocumentLibraryPage />} />
            <Route path="/voices" element={<VoiceIntakePage />} />
            <Route path="/cases" element={<CaseWorkspacePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<main className={styles.screen}>
        <EmptyState title="찾을 수 없음" description="주소를 확인해 주세요." action={<Link to="/">업무 화면으로 이동</Link>} />
      </main>} />
    </Routes></Suspense>
  </BrowserRouter>
}

function RequireSession() {
  const session = useSession()
  if (session.isPending) return <main className={styles.screen}><LoadingState label="세션 확인 중" /></main>
  if (session.isError && !isAuthenticationError(session.error)) return <main className={styles.screen}>
    <Notice tone="danger" announce>{apiErrorMessage(session.error)}</Notice><Button onClick={() => session.refetch()}>다시 확인</Button>
  </main>
  return session.isError || !session.data ? <Navigate replace to="/login" /> : <Outlet />
}

function RequireAssignment() {
  const session = useSession()
  return session.data?.assignmentId ? <Outlet /> : <Navigate replace to="/assignments" />
}
