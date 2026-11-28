import { ArrowDownLeft, ArrowUpRight, Diamond, Files, Gauge, LibraryBig, Menu, Search, X } from 'lucide-react'
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

const navigation = [
  { title: '업무', items: [
    { path: '/work', label: '내 VOC 업무', icon: Gauge },
    { path: '/voices', label: 'VOC 수신함', icon: ArrowDownLeft },
  ] },
  { title: '지식', items: [
    { path: '/knowledge', label: '지식 작성·결재', icon: Diamond },
    { path: '/department-inbox', label: '부서 지식함', icon: ArrowUpRight },
    { path: '/query', label: '문서·지식 질의(AI)', icon: Search },
    { path: '/documents', label: '문서함', icon: Files },
    { path: null, label: '지식·문서 자산', icon: LibraryBig },
  ] },
]

const workTabs = [
  ...navigation.flatMap(({ items }) => items).filter(({ path }) => path !== null),
  { path: '/cases', label: 'VOC 처리' },
]

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
  const activePage = workTabs.find((tab) => tab.path === location.pathname)

  useEffect(() => {
    const match = workTabs.find((tab) => tab.path === location.pathname)
    if (match?.path) useWorkTabs.getState().open({ path: match.path, label: match.label })
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
        {navigation.map(({ title, items }) => <section className={styles.navGroup} key={title} aria-label={title}>
          <p className={styles.navLabel}>{title}</p>
          {items.map(({ path, label, icon: Icon }) => path
            ? <NavLink className={styles.navLink} key={label} to={path} end onClick={() => setMenuOpen(false)}>
              <Icon size={16} aria-hidden="true" />{label}
            </NavLink>
            : <span className={styles.unavailable} key={label}>
              <Icon size={16} aria-hidden="true" /><span>{label}<small>준비 중</small></span>
            </span>)}
        </section>)}
      </nav>
      <div className={styles.sidebarFoot}><Link to="/style-guide">UI 스타일 가이드</Link></div>
    </aside>
    <div>
      <header className={styles.topbar}>
        <div className={styles.context}>
          <Button className={styles.mobileMenu} aria-expanded={menuOpen} aria-controls="workspace-menu" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={18} aria-hidden="true" />메뉴
          </Button>
          <span>워크스페이스 / {activePage?.label ?? '업무'}</span>
        </div>
        <div className={styles.actions}>
          <Badge tone="success">내부 AI 환경</Badge>
          <Link className={styles.assignment} to="/assignments" aria-label="업무 소속 변경">
            업무 소속 <strong>{department?.departmentName ?? '확인 중'}</strong>
          </Link>
          <span className={styles.user} title={session.displayName}>
            <span aria-hidden="true">{session.displayName.trim().charAt(0)}</span>
            <span className="visually-hidden">{session.displayName}</span>
          </span>
          <Button busy={loggingOut} onClick={logout}>로그아웃</Button>
        </div>
      </header>
      {tabs.some((tab) => tab.path !== '/work') && <nav aria-label="열린 작업 탭" className={styles.tabs}>
        {tabs.map((tab) => <span className={styles.tab} key={tab.path}>
          <NavLink to={tab.path} end>{tab.label}</NavLink>
          {tab.path !== '/work' && <button type="button" aria-label={tab.label + ' 탭 닫기'} onClick={() => closeTab(tab.path)}>
            <X size={15} aria-hidden="true" />
          </button>}
        </span>)}
      </nav>}
      <main id="main-content" tabIndex={-1} className={styles.main}>
        {logoutError && <Notice tone="danger" announce>{logoutError}</Notice>}
        <Outlet />
      </main>
    </div>
  </div>
}
