import { useState } from 'react'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { EmptyState, LoadingState, Notice } from '../../../common/components/Feedback'
import { Table } from '../../../common/components/Table'
import { DocumentKnowledgeDraftDialog } from '../../knowledge/components/DocumentKnowledgeDraftDialog'
import type { Session } from '../../session/api/sessionApi'
import { useDocument } from '../model/documents'
import { DocumentActionDialog } from './DocumentActionDialog'
import type { DocumentAction } from './DocumentActionDialog'
import type { DocumentVersion } from '../api/documentsApi'
import { ParseStatus, PublishStatus } from './DocumentStatus'
import styles from './Documents.module.css'

const classificationLabels = ['공개', '사내', '대외비', '제한']
const policyLabels: Record<string, string> = { TEMPLATE: '부서 기본 정책', INHERITED: '상위 폴더에서 상속', OVERRIDE: '개별 정책' }
const formatTime = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })

export function DocumentDetailPanel({ session, id, department, onRetired }: {
  session: Session; id: string; department?: { id: string; name: string }; onRetired: () => void
}) {
  const query = useDocument(session, id)
  const [action, setAction] = useState<DocumentAction | null>(null)
  const [draftSource, setDraftSource] = useState<DocumentVersion | null>(null)
  const [message, setMessage] = useState('')
  if (query.isPending) return <LoadingState label="문서 상세 조회 중" />
  if (query.isError) return <div className={styles.content}>
    <Notice tone="danger" announce>{apiErrorMessage(query.error)}</Notice>
    <Button onClick={() => query.refetch()}>다시 조회</Button>
  </div>

  const { document, policy, versions, actions } = query.data
  const columns = [
    { key: 'version', heading: '버전', cell: (version: DocumentVersion) => 'v' + version.versionNumber },
    { key: 'parse', heading: '처리', cell: (version: DocumentVersion) => <ParseStatus status={version.parseStatus} /> },
    { key: 'publish', heading: '게시', cell: (version: DocumentVersion) => <PublishStatus status={version.publishState} /> },
    { key: 'created', heading: '등록 시각', cell: (version: DocumentVersion) => formatTime.format(new Date(version.createdAt)) },
  ]
  const versionList = actions?.publish || versions.some((version) => version.publishState === 'PUBLISHED') ? [...columns, {
    key: 'action', heading: '작업', cell: (version: DocumentVersion) => <div className={styles.versionAction}>
      {version.publishState === 'PUBLISHED' && <Button onClick={() => setDraftSource(version)}>지식 초안 작성</Button>}
      {actions?.publish && version.publishState === 'PUBLISHED' && <Button onClick={() => setAction({ type: 'unpublish', version, revision: document.rowVersion })}>게시 회수</Button>}
      {actions?.publish && version.publishState === 'DRAFT' && (version.parseStatus === 'PARSED'
        ? <Button onClick={() => setAction({ type: 'publish', version, revision: document.rowVersion })}>게시</Button>
        : <small>파싱 완료 후 게시 가능</small>)}
    </div>,
  }] : columns
  return <>
    <div className={styles.content}>
      <h3 className={styles.title}>{document.title}</h3>
      <div><ParseStatus status={document.parseStatus} /></div>
      {(actions?.uploadVersion || actions?.retire) && <div className={styles.toolbar}>
        {actions.uploadVersion && <Button onClick={() => setAction({ type: 'version', revision: document.rowVersion })}>새 버전 올리기</Button>}
        {actions.retire && <Button variant="danger" onClick={() => setAction({ type: 'retire', revision: document.rowVersion })}>문서 폐기</Button>}
      </div>}
      {message && <Notice tone="success" announce>{message}</Notice>}
      <dl className={styles.summary}>
        <dt>보안 등급</dt><dd>{classificationLabels[policy.classificationLevel] ?? '미지정'}</dd>
        <dt>권한 출처</dt><dd>{policyLabels[policy.origin] ?? '미지정'}</dd>
        {department?.id === document.ownerDepartmentId && <><dt>소유 부서</dt><dd>{department.name}</dd></>}
      </dl>
      <h3>버전 이력</h3>
    </div>
    {versions.length === 0 ? <EmptyState title="등록된 버전이 없습니다." description="새 버전이 등록되면 이곳에 표시됩니다." /> :
      <div className={styles.versionTable}><Table label="문서 버전 이력" rows={versions}
        rowKey={(version) => version.id} columns={versionList} /></div>}
    {draftSource && <DocumentKnowledgeDraftDialog title={document.title} source={draftSource} onClose={() => setDraftSource(null)} />}
    <DocumentActionDialog session={session} document={document} action={action} onClose={() => setAction(null)}
      onRefresh={() => { setAction(null); void query.refetch() }}
      onDone={(type) => {
        setAction(null)
        if (type === 'retire') { onRetired(); return }
        setMessage(type === 'version' ? '새 버전을 등록했습니다.' : type === 'publish' ? '게시하고 색인 작업을 요청했습니다.' : '게시를 회수했습니다.')
      }} />
  </>
}
