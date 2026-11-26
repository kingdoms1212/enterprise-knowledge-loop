import { FilePlus2, FolderPlus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../common/components/Button'
import { EmptyState, Notice } from '../../common/components/Feedback'
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
  const rawFolder = params.get('folder') ?? ''
  const view = parseView(params.get('view'))
  const folder = view === 'MY_DEPARTMENT' && uuidPattern.test(rawFolder) ? rawFolder : ''
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploaded, setUploaded] = useState('')
  const [retired, setRetired] = useState(false)
  const [folderDialog, setFolderDialog] = useState<{ target: FolderRow | null } | null>(null)
  const [folderMessage, setFolderMessage] = useState('')

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

  return <div className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.section}>지식</p><h1>문서함</h1><p className={styles.subtitle}>사내 문서를 등록하고 버전과 처리 상태를 확인합니다.</p></div>
      {department && <div className={styles.actions}>
        {capabilities.data?.manageFolders && <Button onClick={() => setFolderDialog({ target: null })}>
          <FolderPlus size={16} aria-hidden="true" />새 폴더
        </Button>}
        {capabilities.data?.upload && <Button variant="primary" onClick={() => setUploadOpen(true)}>
          <FilePlus2 size={16} aria-hidden="true" />업로드
        </Button>}
      </div>}
    </header>
    {uploaded === documentId && uploaded && <Notice tone="success" announce>문서를 등록했습니다.</Notice>}
    {retired && <Notice tone="success" announce>문서를 폐기했습니다.</Notice>}
    {folderMessage && <Notice tone="success" announce>{folderMessage}</Notice>}
    <div className={styles.columns}>
      <section className={styles.panel} aria-labelledby="folder-heading">
        <h2 className={styles.panelHeading} id="folder-heading">폴더</h2>
        <FolderTree session={session} department={department} view={view} folderId={folder} onSelect={selectFolder}
          onManage={(target) => setFolderDialog({ target })} />
      </section>
      <section className={styles.panel} aria-labelledby="lookup-heading">
        <h2 className={styles.panelHeading} id="lookup-heading">문서 목록</h2>
        <DocumentList session={session} view={view} folder={folder} selected={documentId} onSelect={selectDocument} />
      </section>
      <section className={styles.panel} aria-labelledby="detail-heading">
        <h2 className={styles.panelHeading} id="detail-heading">문서 상세</h2>
        {uuidPattern.test(documentId)
          ? <DocumentDetailPanel key={documentId} session={session} id={documentId} department={department} onRetired={() => {
            setRetired(true)
            setParams((current) => {
              const next = new URLSearchParams(current)
              next.delete('document')
              return next
            })
          }} />
          : <EmptyState title="선택한 문서가 없습니다." description="목록에서 문서를 선택해 주세요." />}
      </section>
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
