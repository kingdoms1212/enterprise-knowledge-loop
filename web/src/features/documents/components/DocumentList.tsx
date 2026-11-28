import { FileText } from 'lucide-react'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { EmptyState, LoadingState, Notice } from '../../../common/components/Feedback'
import { Table } from '../../../common/components/Table'
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
    {!selected ? <div className={styles.documentTable} role="region" aria-label="문서 목록 표" tabIndex={0}>
      <Table label="문서 목록" rows={rows} rowKey={({ document }) => document.id} columns={[
        { key: 'title', heading: '이름', cell: ({ document, policyOrigin }) =>
          <button className={styles.documentTitle} type="button" onClick={() => onSelect(document.id)}>
            <FileText size={16} aria-hidden="true" /><span>{document.title}
              {policyOrigin === 'OVERRIDE' && <small>권한 예외</small>}</span>
          </button> },
        { key: 'version', heading: '버전', cell: ({ document }) => document.versionNumber ? 'v' + document.versionNumber : '–' },
        { key: 'level', heading: '보안 등급', cell: ({ classificationLevel }) => levels[classificationLevel] ?? '미지정' },
        { key: 'status', heading: '처리 상태', cell: ({ document }) => <ParseStatus status={document.parseStatus} /> },
        { key: 'time', heading: '수정 시각', cell: ({ updatedAt }) => datetime.format(new Date(updatedAt)) },
      ]} />
    </div> : <ul className={styles.documentList}>
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
    </ul>}
    {query.isFetchNextPageError && <div className={styles.listActions}><Notice tone="danger" announce>{apiErrorMessage(query.error)}</Notice></div>}
    {query.hasNextPage && <div className={styles.listActions}><Button onClick={() => query.fetchNextPage()}
      busy={query.isFetchingNextPage}>문서 더 보기</Button></div>}
  </div>
}
