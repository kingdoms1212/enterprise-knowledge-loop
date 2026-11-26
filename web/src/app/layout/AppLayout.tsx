import { ClipboardList, Files, House, Inbox, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../../common/api/client'
import { Brand } from '../../common/components/Brand'
import { Button } from '../../common/components/Button'
import { Badge, Notice } from '../../common/components/Feedback'
import { useAssignments, useSession, useSessionActions } from '../../features/session/model/session'
import type { Session } from '../../features/session/api/sessionApi'
import { useWorkTabs } from '../../features/work-tabs/model/workTabs'
import styles from './Layout.module.css'

const workTabs = [
  { path: '/work', label: '내 업무', group: '업무', icon: House },
  { path: '/voices', label: 'VOC 접수·분류', group: '업무', icon: Inbox },
  { path: '/cases', label: 'Case 작업 공간', group: '업무', icon: ClipboardList },
  { path: '/documents', label: '문서함', group: '지식', icon: Files },
] as const

export function AppLayout() {
  const { data: session } = useSession()
  if (!session?.assignmentId) return null
  const key = [session.accountId, session.assignmentId, session.contextRevision].join(':')
  return <Workspace key={key} session={session} />
}

function Workspace({ session }: { session: Session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const tabs = useWorkTabs((state) => state.tabs)
  const actions = useSessionActions()
  const assignments = useAssignments(session)
  const department = assignments.data?.find(({ id }) => id === session.assignmentId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  useEffect(() => {
    const match = workTabs.find((tab) => tab.path === location.pathname)
    if (match) useWorkTabs.getState().open({ path: match.path, label: match.label })
  }, [location.pathname])

  async function logout() {
    setLoggingOut(true)
    setLogoutError('')
    try {
      await actions.logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(apiErrorMessage(error))
    } finally {
      setLoggingOut(false)
    }
  }

  function closeTab(path: string) {
    useWorkTabs.getState().close(path)
    if (location.pathname === path) {
      const next = useWorkTabs.getState().tabs.at(-1)?.path ?? '/work'
      navigate(next === path ? '/' : next)
    }
  }

  return <div className={styles.shell}>
    <a href="#main-content" className={styles.skip}>본문으로 건너뛰기</a>
    <aside id="workspace-menu" className={styles.sidebar} data-open={menuOpen}>
      <Brand />
      <nav aria-label="업무 메뉴">
        {(['업무', '지식'] as const).map((group) => <section className={styles.navGroup} key={group} aria-label={group}>
          <p className={styles.navLabel}>{group}</p>
          {workTabs.filter((tab) => tab.group === group).map(({ path, label, icon: Icon }) =>
            <NavLink className={styles.navLink} key={path} to={path} end onClick={() => setMenuOpen(false)}>
              <Icon size={18} aria-hidden="true" />{label}
            </NavLink>)}
        </section>)}
      </nav>
    </aside>
    <div>
      <header className={styles.topbar}>
        <div className={styles.context}>
          <Button className={styles.mobileMenu} aria-expanded={menuOpen} aria-controls="workspace-menu" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={18} aria-hidden="true" />메뉴
          </Button>
          <strong>{department?.departmentName ?? '업무 공간'}</strong>
          <Badge tone="ai">내부 AI</Badge>
        </div>
        <div className={styles.actions}>
          <span className={styles.context}>{session.displayName}</span>
          <Link to="/assignments">업무 소속 변경</Link>
          <Button busy={loggingOut} onClick={logout}>로그아웃</Button>
        </div>
      </header>
      <nav aria-label="열린 작업 탭" className={styles.tabs}>
        {tabs.map((tab) => <span className={styles.tab} key={tab.path}>
          <NavLink to={tab.path} end>{tab.label}</NavLink>
          {tab.path !== '/work' && <button type="button" aria-label={tab.label + ' 탭 닫기'} onClick={() => closeTab(tab.path)}>
            <X size={15} aria-hidden="true" />
          </button>}
        </span>)}
      </nav>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        {logoutError && <Notice tone="danger" announce>{logoutError}</Notice>}
        <Outlet />
      </main>
    </div>
  </div>
}
