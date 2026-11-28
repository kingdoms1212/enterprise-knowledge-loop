import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../../common/components/Feedback'
import { WorkQueue } from '../../common/components/WorkQueue'
import styles from '../../common/components/Workspace.module.css'
import { formatDateTime } from '../../common/utils/dateTime'
import { uuidPattern } from '../../common/utils/uuid'
import { CaseDetailPanel } from '../../features/casework/components/CaseDetailPanel'
import { CaseStatus } from '../../features/casework/components/CaseStatus'
import { useCaseQueue } from '../../features/casework/model/casework'
import type { Session } from '../../features/session/api/sessionApi'
import { useSession } from '../../features/session/model/session'

export function CaseWorkspacePage() {
  const { data: session } = useSession()
  return session ? <CaseWorkspace session={session} /> : null
}

function CaseWorkspace({ session }: { session: Session }) {
  const [params, setParams] = useSearchParams()
  const id = params.get('case') ?? ''
  const queue = useCaseQueue(session)
  const items = queue.data?.pages.flatMap((page) => page.items) ?? []
  return <div className={styles.page}>
    <header className={styles.heading}><div><p className={styles.crumb}>WORKSPACE / VOC</p><h1>VOC 처리</h1>
      <p className={styles.intro}>담당 부서에서 결정과 처리 결과를 기록합니다.</p></div></header>
    <div className={styles.columns}>
      <section className={styles.panel} aria-labelledby="case-list">
        <h2 className={styles.panelHeading} id="case-list">Case 목록</h2>
        <WorkQueue items={items.map((item) => ({ id: item.id, title: item.title, metadata: formatDateTime(item.createdAt),
          status: <CaseStatus value={item.state} /> }))} selected={id} noun="Case" loading={queue.isPending}
          error={queue.isError ? queue.error : null} hasMore={queue.hasNextPage} loadingMore={queue.isFetchingNextPage}
          onSelect={(selected) => setParams({ case: selected })} onRetry={() => queue.refetch()} onMore={() => queue.fetchNextPage()} />
      </section>
      <section className={styles.panel} aria-labelledby="case-detail">
        <h2 className={styles.panelHeading} id="case-detail">Case 상세</h2>
        {uuidPattern.test(id) ? <CaseDetailPanel key={id} session={session} id={id} />
          : <EmptyState title="선택한 Case가 없습니다." description="목록에서 Case를 선택해 주세요." />}
      </section>
    </div>
  </div>
}
