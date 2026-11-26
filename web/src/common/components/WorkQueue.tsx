import type { ReactNode } from 'react'
import { apiErrorMessage, isAuthenticationError } from '../api/client'
import { Button } from './Button'
import { EmptyState, LoadingState, Notice } from './Feedback'
import styles from './Workspace.module.css'

export function WorkQueue({ items, selected, loading, error, hasMore, loadingMore, onSelect, onRetry, onMore, noun }: {
  items: { id: string; title: string; metadata: string; status: ReactNode }[]
  selected: string; loading: boolean; error: unknown; hasMore: boolean; loadingMore: boolean; noun: string
  onSelect: (id: string) => void; onRetry: () => void; onMore: () => void
}) {
  if (loading) return <LoadingState label={noun + ' 목록 조회 중'} />
  if (error && (!items.length || isAuthenticationError(error))) return <div className={styles.queueFooter}>
    <Notice tone="danger" announce>{apiErrorMessage(error)}</Notice><Button onClick={onRetry}>다시 조회</Button>
  </div>
  if (!items.length) return <EmptyState title={'표시할 ' + noun + '가 없습니다.'} description="업무 항목이 들어오면 이곳에 표시됩니다." />

  return <>
    <ul className={styles.queue}>
      {items.map((item) => <li key={item.id}>
        <button type="button" aria-current={selected === item.id ? 'true' : undefined} onClick={() => onSelect(item.id)}>
          <span><strong>{item.title}</strong><small>{item.metadata}</small></span>
          <span>{item.status}</span>
        </button>
      </li>)}
    </ul>
    {(hasMore || error != null) && <div className={styles.queueFooter}>
      {error != null && <Notice tone="danger" announce>{apiErrorMessage(error)}</Notice>}
      {hasMore && <Button busy={loadingMore} onClick={onMore}>더 보기</Button>}
    </div>}
  </>
}
