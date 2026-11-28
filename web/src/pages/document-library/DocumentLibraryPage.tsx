import { FilePlus2, FolderPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../common/components/Button'
import { Notice } from '../../common/components/Feedback'
import { uuidPattern } from '../../common/utils/uuid'
import { DocumentDetailPanel } from '../../features/documents/components/DocumentDetailPanel'
import { DocumentList } from '../../features/documents/components/DocumentList'
import { FolderTree } from '../../features/documents/components/FolderTree'
import { FolderDialog } from '../../features/documents/components/FolderDialog'
import { UploadDialog } from '../../features/documents/components/UploadDialog'
import type { DocumentView, FolderRow } from '../../features/documents/api/documentsApi'
import { useLibraryCapabilities } from '../../features/documents/model/documents'
import type { Session } from '../../features/session/api/sessionApi'
import { useAssignments, useSession } from '../../features/session/model/session'
import styles from './DocumentLibraryPage.module.css'

export function DocumentLibraryPage() {
  const { data: session } = useSession()
  return session ? <DocumentLibrary session={session} /> : null
}

function DocumentLibrary({ session }: { session: Session }) {
  const [params, setParams] = useSearchParams()
  const assignments = useAssignments(session)
  const capabilities = useLibraryCapabilities(session)
  const selectedAssignment = assignments.data?.find((item) => item.id === session.assignmentId)
  const department = selectedAssignment && { id: selectedAssignment.departmentId, name: selectedAssignment.departmentName }
  const documentId = params.get('document') ?? ''
  const hasSelection = uuidPattern.test(documentId)
  const targetHeading = useRef<HTMLHeadingElement>(null)
  const previouslySelected = useRef(false)
  const rawFolder = params.get('folder') ?? ''
  const view = parseView(params.get('view'))
  const folder = view === 'MY_DEPARTMENT' && uuidPattern.test(rawFolder) ? rawFolder : ''
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploaded, setUploaded] = useState('')
  const [retired, setRetired] = useState(false)
  const [folderDialog, setFolderDialog] = useState<{ target: FolderRow | null } | null>(null)
  const [folderMessage, setFolderMessage] = useState('')

  useEffect(() => {
    if (hasSelection || previouslySelected.current) targetHeading.current?.focus()
    previouslySelected.current = hasSelection
  }, [hasSelection])

  function selectDocument(id: string) {
    setRetired(false)
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('document', id)
      return next
    })
  }

  function selectFolder(nextView: DocumentView, selected?: FolderRow) {
    setRetired(false)
    const next = new URLSearchParams({ view: nextView })
    if (selected) next.set('folder', selected.folder.id)
    setParams(next)
  }

  function closeDocument() {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('document')
      return next
    })
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.section}>S14 / DOCUMENTS</p><h1>문서함</h1><p className={styles.subtitle}>문서를 폴더로 정리하고 버전과 권한을 관리합니다.</p></div>
      {department && <div className={styles.actions}>
        {capabilities.data?.upload && <Button variant="primary" onClick={() => setUploadOpen(true)}>
          <FilePlus2 size={16} aria-hidden="true" />업로드
        </Button>}
        {capabilities.data?.manageFolders && <Button onClick={() => setFolderDialog({ target: null })}>
          <FolderPlus size={16} aria-hidden="true" />새 폴더
        </Button>}
      </div>}
    </header>
    {uploaded === documentId && uploaded && <Notice tone="success" announce>문서를 등록했습니다.</Notice>}
    {retired && <Notice tone="success" announce>문서를 폐기했습니다.</Notice>}
    {folderMessage && <Notice tone="success" announce>{folderMessage}</Notice>}
    <div className={styles.columns} data-detail-open={hasSelection}>
      <section className={styles.panel} aria-labelledby="folder-heading">
        <h2 className={styles.panelHeading} id="folder-heading">폴더</h2>
        <FolderTree session={session} department={department} view={view} folderId={folder} onSelect={selectFolder}
          onManage={(target) => setFolderDialog({ target })} />
      </section>
      <section className={styles.panel} aria-labelledby="lookup-heading">
        <h2 className={styles.panelHeading} id="lookup-heading"
          ref={hasSelection ? undefined : targetHeading} tabIndex={-1}>문서 목록</h2>
        <DocumentList session={session} view={view} folder={folder} selected={documentId} onSelect={selectDocument} />
      </section>
      {hasSelection && <section className={styles.panel} aria-labelledby="detail-heading">
        <header className={styles.detailHeading}><h2 id="detail-heading" ref={targetHeading} tabIndex={-1}>문서 상세</h2>
          <Button onClick={closeDocument}>상세 닫기</Button>
        </header>
        <DocumentDetailPanel key={documentId} session={session} id={documentId} department={department} onRetired={() => {
          setRetired(true)
          closeDocument()
        }} />
      </section>}
    </div>
    {department && capabilities.data?.upload && <UploadDialog session={session} department={department} folder={folder}
      open={uploadOpen} onClose={() => setUploadOpen(false)}
      onUploaded={(id) => { selectDocument(id); setUploaded(id); setUploadOpen(false) }} />}
    {department && folderDialog && <FolderDialog session={session} department={department.id} target={folderDialog.target}
      onClose={() => setFolderDialog(null)} onDone={(command) => {
        if (command.type === 'archive' && command.target.folder.id === folder) selectFolder('MY_DEPARTMENT')
        setFolderMessage(command.type === 'archive' ? '폴더를 보관했습니다.'
          : command.type === 'rename' ? '폴더 이름을 변경했습니다.' : '폴더를 생성했습니다.')
        setFolderDialog(null)
      }} />}
  </div>
}

function parseView(value: string | null): DocumentView {
  switch (value) {
    case 'UPLOADED_BY_ME':
    case 'SHARED':
    case 'RECENT':
      return value
    default:
      return 'MY_DEPARTMENT'
  }
}
