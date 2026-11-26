import { ChevronDown, ChevronRight, Folder, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { apiErrorMessage, isAuthenticationError } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { LoadingState, Notice } from '../../../common/components/Feedback'
import type { Session } from '../../session/api/sessionApi'
import type { DocumentView, FolderRow } from '../api/documentsApi'
import { useFolders } from '../model/documents'
import styles from './LibraryLists.module.css'

const documentViews: { id: DocumentView; label: string }[] = [
  { id: 'MY_DEPARTMENT', label: '내 부서 문서' },
  { id: 'UPLOADED_BY_ME', label: '내가 올린 문서' },
  { id: 'SHARED', label: '공유받은 문서' },
  { id: 'RECENT', label: '최근 문서' },
]

export function FolderTree({ session, department, view, folderId, onSelect, onManage }: {
  session: Session; department?: { id: string; name: string }; view: DocumentView
  folderId: string; onSelect: (view: DocumentView, folder?: FolderRow) => void
  onManage: (row: FolderRow) => void
}) {
  return <nav aria-label="문서함 보기" className={styles.folderNavigation}>
    {documentViews.map(({ id, label }) => <div key={id}>
      <button type="button" className={styles.folderLink} aria-current={view === id && !folderId ? 'page' : undefined}
        onClick={() => onSelect(id)}><Folder size={16} aria-hidden="true" />{label}</button>
      {id === 'MY_DEPARTMENT' && view === id && department && <FolderBranch
        session={session} department={department.id} parent="" selected={folderId}
        onSelect={(folder) => onSelect('MY_DEPARTMENT', folder)} onManage={onManage} />}
    </div>)}
  </nav>
}

type BranchProps = { session: Session; department: string; parent: string; selected: string;
  onSelect: (row: FolderRow) => void; onManage: (row: FolderRow) => void }

function FolderBranch({ session, department, parent, selected, onSelect, onManage }: BranchProps) {
  const query = useFolders(session, department, parent)
  if (query.isPending) return <LoadingState label="폴더 목록 조회 중" />
  if (query.isError && (!query.data || isAuthenticationError(query.error))) {
    return <Notice tone="danger" announce>{apiErrorMessage(query.error)}</Notice>
  }
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  if (!items.length) return parent ? <p className={styles.treeHint}>하위 폴더 없음</p> : null

  return <ul className={styles.folderList}>
    {items.map((row) => <FolderNode key={row.folder.id} row={row} session={session} department={department}
      selected={selected} onSelect={onSelect} onManage={onManage} />)}
    {query.hasNextPage && <li><Button onClick={() => query.fetchNextPage()} busy={query.isFetchingNextPage}>폴더 더 보기</Button></li>}
    {query.isFetchNextPageError && <li><Notice tone="danger" announce>{apiErrorMessage(query.error)}</Notice></li>}
  </ul>
}

function FolderNode({ row, session, department, selected, onSelect, onManage }: Omit<BranchProps, 'parent'> & { row: FolderRow }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = expanded ? ChevronDown : ChevronRight
  return <li>
    <div className={styles.folderNode}>
      <button type="button" className={styles.expand} aria-expanded={expanded}
        aria-label={row.folder.name + (expanded ? ' 하위 폴더 접기' : ' 하위 폴더 펼치기')}
        onClick={() => setExpanded(!expanded)}><Icon size={16} aria-hidden="true" /></button>
      <button type="button" className={styles.folderLink} aria-current={selected === row.folder.id ? 'page' : undefined}
        onClick={() => onSelect(row)}>{row.folder.name}</button>
      {row.manage && <button type="button" className={styles.expand} aria-label={row.folder.name + ' 관리'}
        onClick={() => onManage(row)}><Settings2 size={16} aria-hidden="true" /></button>}
    </div>
    {expanded && <FolderBranch session={session} department={department} parent={row.folder.id}
      selected={selected} onSelect={onSelect} onManage={onManage} />}
  </li>
}
