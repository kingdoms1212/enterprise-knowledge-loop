import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiErrorMessage } from '../../common/api/client'
import { Button } from '../../common/components/Button'
import { Badge, LoadingState, Notice } from '../../common/components/Feedback'
import { WorkQueue } from '../../common/components/WorkQueue'
import styles from '../../common/components/Workspace.module.css'
import { formatDateTime } from '../../common/utils/dateTime'
import { departmentInboxApi, type DepartmentInboxItem } from '../../features/knowledge/api/departmentInboxApi'
import { knowledgeWorkspaceApi } from '../../features/knowledge/api/knowledgeWorkspaceApi'
import type { Session } from '../../features/session/api/sessionApi'
import { useSession, workspaceKey } from '../../features/session/model/session'

export function DepartmentInboxPage() {
  const { data: session } = useSession()
  return session ? <Inbox session={session} /> : null
}

function Inbox({ session }: { session: Session }) {
  const [params, setParams] = useSearchParams()
  const id = params.get('delivery') ?? ''
  const queryKey = [...workspaceKey(session), 'department-inbox']
  const query = useInfiniteQuery({ queryKey,
    queryFn: ({ pageParam, signal }) => departmentInboxApi.list(pageParam, signal), initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const selected = query.isError ? undefined : items.find((item) => item.id === id)

  return <div className={styles.page}>
    <header className={styles.heading}><h1>부서 지식함</h1></header>
    <div className={styles.columns}>
      <section className={styles.panel} aria-labelledby="inbox-title">
        <h2 className={styles.panelHeading} id="inbox-title">전달된 지식</h2>
        <WorkQueue items={items.map((item) => ({ id: item.id, title: item.title,
          metadata: 'v' + item.versionNumber + ' · ' + formatDateTime(item.deliveredAt),
          status: <Badge tone={item.acknowledgedAt ? 'success' : 'neutral'}>{item.acknowledgedAt ? '확인 완료' : '미확인'}</Badge>,
        }))} selected={id} noun="전달된 지식" loading={query.isPending} error={query.error} hasMore={query.hasNextPage}
          loadingMore={query.isFetchingNextPage} onSelect={(delivery) => setParams({ delivery })}
          onRetry={() => query.refetch()} onMore={() => query.fetchNextPage()} />
      </section>
      {selected && <KnowledgeReceipt key={selected.id} session={session} item={selected} />}
    </div>
  </div>
}

function KnowledgeReceipt({ session, item }: { session: Session; item: DepartmentInboxItem }) {
  const client = useQueryClient()
  const scope = workspaceKey(session)
  const detail = useQuery({
    queryKey: [...scope, 'knowledge-detail', item.versionId],
    queryFn: ({ signal }) => knowledgeWorkspaceApi.detail(item.versionId, signal),
  })
  const acknowledge = useMutation({ mutationFn: () => departmentInboxApi.acknowledge(item.id),
    onSuccess: () => client.invalidateQueries({ queryKey: [...scope, 'department-inbox'] }),
  })
  if (detail.isPending) return <LoadingState label="지식 본문 조회 중" />
  if (detail.isError) return <Notice tone="danger" announce>{apiErrorMessage(detail.error)}</Notice>

  return <section className={styles.panel} aria-labelledby="receipt-title">
    <div className={styles.body}>
      <h2 id="receipt-title">{detail.data.version.title}</h2>
      <p className={styles.text}>{detail.data.body}</p>
      <div>
        {item.acknowledgedAt ? <Badge tone="success">열람 확인 완료</Badge>
          : <Button variant="primary" busy={acknowledge.isPending} onClick={() => acknowledge.mutate()}>열람 확인</Button>}
      </div>
      {acknowledge.isError && <Notice tone="danger" announce>{apiErrorMessage(acknowledge.error)}</Notice>}
    </div>
  </section>
}
