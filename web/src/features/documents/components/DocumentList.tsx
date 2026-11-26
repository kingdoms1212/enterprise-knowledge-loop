import { FileText } from 'lucide-react'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { EmptyState, LoadingState, Notice } from '../../../common/components/Feedback'
import type { Session } from '../../session/api/sessionApi'
import type { DocumentView } from '../api/documentsApi'
import { useDocumentList } from '../model/documents'
import { ParseStatus } from './DocumentStatus'
import styles from './LibraryLists.module.css'

const levels = ['공개', '사내', '대외비', '제한']
const datetime = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })

export function DocumentList({ session, view, folder, selected, onSelect }: {
  session: Session; view: DocumentView; folder: string; selected: string; onSelect: (id: string) => void
}) {
  const query = useDocumentList(session, view, folder)
  if (query.isPending) return <LoadingState label="문서 목록 조회 중" />
  if (query.isError && !query.isFetchNextPageError) return <div className={styles.listActions}>
    <Notice tone="danger" announce>{apiErrorMessage(query.error)}</Notice>
    <Button onClick={() => query.refetch()}>다시 조회</Button>
  </div>
  const rows = query.data?.pages.flatMap((page) => page.items) ?? []
  if (!rows.length) return <EmptyState title="표시할 문서가 없습니다." description="다른 보기나 폴더를 선택해 주세요." />

  return <div>
    <ul className={styles.documentList}>
      {rows.map(({ document, classificationLevel, policyOrigin, updatedAt }) => (
        <li key={document.id}>
          <button type="button" className={styles.documentRow} aria-current={selected === document.id ? 'true' : undefined}
            onClick={() => onSelect(document.id)}>
            <FileText size={18} aria-hidden="true" />
            <span className={styles.documentLabel}>
              <strong>{document.title}</strong>
              <small>{document.versionNumber ? 'v' + document.versionNumber + ' · ' : ''}
                {levels[classificationLevel] ?? '미지정'}{policyOrigin === 'OVERRIDE' ? ' · 권한 예외' : ''}</small>
              <small>{datetime.format(new Date(updatedAt))}</small>
            </span>
            <ParseStatus status={document.parseStatus} />
          </button>
        </li>
      ))}
    </ul>
    {query.isFetchNextPageError && <div className={styles.listActions}><Notice tone="danger" announce>{apiErrorMessage(query.error)}</Notice></div>}
    {query.hasNextPage && <div className={styles.listActions}><Button onClick={() => query.fetchNextPage()}
      busy={query.isFetchingNextPage}>문서 더 보기</Button></div>}
  </div>
}
