import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiErrorMessage } from '../../common/api/client'
import { Button } from '../../common/components/Button'
import { Dialog } from '../../common/components/Dialog'
import { FormField, Textarea } from '../../common/components/Fields'
import { Badge, LoadingState, Notice } from '../../common/components/Feedback'
import { WorkQueue } from '../../common/components/WorkQueue'
import styles from '../../common/components/Workspace.module.css'
import { uuidPattern } from '../../common/utils/uuid'
import { knowledgeDraftApi } from '../../features/knowledge/api/knowledgeDraftApi'
import { knowledgeWorkspaceApi, type KnowledgeDraftDetail, type ReviewDecision } from '../../features/knowledge/api/knowledgeWorkspaceApi'
import type { Session } from '../../features/session/api/sessionApi'
import { useSession, workspaceKey } from '../../features/session/model/session'

const states: Record<string, string> = { DRAFT: '초안', REVIEW: '검토 중', APPROVED: '승인', PUBLISHED: '게시', RETIRED: '폐기' }
const kinds: Record<string, string> = { REFERENCE: '참고 자료', SOLUTION: '해결 방법', LESSON: '교훈' }
const decisionLabels = { APPROVE: '승인하고 게시', RETURN: '보완 요청', REJECT: '반려' }
const approvalLabels: Record<string, string> = { OPEN: '최종 승인 대기', APPROVED: '승인 완료', RETURNED: '보완 요청', REJECTED: '반려' }

export function KnowledgeWorkspacePage() {
  const { data: session } = useSession()
  const [params, setParams] = useSearchParams()
  const id = params.get('version') ?? ''
  const view = params.get('view') === 'reviews' ? 'reviews' : 'drafts'
  if (!session) return null

  return <div className={styles.page}>
    <header className={styles.heading}><h1>지식 작성·결재</h1></header>
    <div className={styles.actions} role="group" aria-label="지식 업무 선택">
      <Button aria-pressed={view === 'drafts'} onClick={() => setParams({})}>내 초안</Button>
      <Button aria-pressed={view === 'reviews'} onClick={() => setParams({ view: 'reviews' })}>결재 대기</Button>
    </div>
    <div className={styles.columns}>
      <section className={styles.panel} aria-labelledby="draft-list">
        <h2 className={styles.panelHeading} id="draft-list">{view === 'reviews' ? '결재 대기 목록' : '내 지식 초안'}</h2>
        <DraftList session={session} view={view} selected={id} onSelect={(version) => setParams({ view, version })} />
      </section>
      {uuidPattern.test(id) && <section className={styles.panel} aria-labelledby="draft-detail">
        <header className={styles.panelHeading}><div className={styles.row}>
          <h2 id="draft-detail">지식 버전 상세</h2>
          <Button onClick={() => setParams({ view })}>상세 닫기</Button>
        </div></header>
        <DraftDetail key={id} session={session} version={id} />
      </section>}
    </div>
  </div>
}

function DraftList({ session, view, selected, onSelect }: {
  session: Session; view: 'drafts' | 'reviews'; selected: string; onSelect: (id: string) => void
}) {
  const query = useInfiniteQuery({
    queryKey: [...workspaceKey(session), 'knowledge-list', view],
    queryFn: ({ pageParam, signal }) => knowledgeWorkspaceApi.list(view, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
  return <WorkQueue items={(query.data?.pages.flatMap((page) => page.items) ?? []).map((row) => ({
    id: row.id, title: row.title, metadata: kinds[row.kind] + ' · v' + row.versionNumber,
    status: <Badge>{states[row.state] ?? row.state}</Badge>,
  }))} selected={selected} loading={query.isPending} error={query.error} hasMore={query.hasNextPage}
    loadingMore={query.isFetchingNextPage} noun="지식 초안" onSelect={onSelect}
    onRetry={() => query.refetch()} onMore={() => query.fetchNextPage()} />
}

function DraftDetail({ session, version }: { session: Session; version: string }) {
  const queryKey = [...workspaceKey(session), 'knowledge-detail', version]
  const client = useQueryClient()
  const query = useQuery({ queryKey, queryFn: ({ signal }) => knowledgeWorkspaceApi.detail(version, signal) })
  const [command, setCommand] = useState<ReviewDecision | 'SUBMIT' | null>(null)
  const [message, setMessage] = useState('')
  if (query.isPending) return <LoadingState label="지식 버전 조회 중" />
  if (query.isError) return <div className={styles.body}><Notice tone="danger" announce>{apiErrorMessage(query.error)}</Notice>
    <div><Button onClick={() => query.refetch()}>다시 조회</Button></div>
  </div>
  const detail = query.data

  return <div className={styles.body}>
    <div className={styles.row}>
      <h3 className={styles.title}>{detail.version.title}</h3>
      <Badge>{states[detail.version.state] ?? detail.version.state} · v{detail.version.versionNumber}</Badge>
    </div>
    {detail.approval && <p>결재 상태 · {approvalLabels[detail.approval.state] ?? detail.approval.state}</p>}
    {detail.approval?.reason && <Notice tone="warning" title="결재 사유">{detail.approval.reason}</Notice>}
    {message && <Notice tone="success" announce>{message}</Notice>}
    <section className={styles.section} aria-labelledby="draft-sources">
      <h3 id="draft-sources">공식 근거</h3>
      {detail.sources.map((source, index) => <p key={index} className={styles.text}>
        <Link to={source.documentId ? '/documents?document=' + encodeURIComponent(source.documentId)
          : '/cases?case=' + encodeURIComponent(source.caseId ?? '')}>{source.title}</Link>
        {source.versionNumber != null && ' · v' + source.versionNumber}
        {source.locator && ' · ' + source.locator}
      </p>)}
    </section>
    {detail.canEdit ? <DraftEditor detail={detail} onSaved={(body, rowVersion) => {
      client.setQueryData<KnowledgeDraftDetail>(queryKey, { ...detail, body, rowVersion })
      void client.invalidateQueries({ queryKey })
    }} /> : <section className={styles.section} aria-labelledby="knowledge-body">
      <h3 id="knowledge-body">본문</h3><p className={styles.text}>{detail.body}</p>
    </section>}
    {detail.canSubmit && <div><Button variant="primary" onClick={() => setCommand('SUBMIT')}>상신</Button></div>}
    {detail.approval?.canDecide && <div className={styles.actions}>
      {(Object.keys(decisionLabels) as ReviewDecision[]).map((action) =>
        <Button key={action} variant={action === 'APPROVE' ? 'primary' : 'secondary'} onClick={() => setCommand(action)}>
          {decisionLabels[action]}
        </Button>)}
    </div>}
    {command && <ReviewDialog detail={detail} command={command} onClose={() => setCommand(null)}
      onDone={(text) => {
        setCommand(null)
        setMessage(text)
        void client.invalidateQueries({ queryKey })
        void client.invalidateQueries({ queryKey: [...workspaceKey(session), 'knowledge-list'] })
      }} />}
  </div>
}

function ReviewDialog({ detail, command, onClose, onDone }: {
  detail: KnowledgeDraftDetail; command: ReviewDecision | 'SUBMIT'; onClose: () => void; onDone: (message: string) => void
}) {
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const attempt = useRef<{ reason: string; key: string } | null>(null)
  const label = command === 'SUBMIT' ? '지식 상신' : decisionLabels[command]

  async function submit() {
    const text = reason.trim()
    if (pending || (command !== 'APPROVE' && !text)) return
    setPending(true)
    setError('')
    try {
      if (command === 'SUBMIT') {
        await knowledgeWorkspaceApi.submit(detail, text)
        onDone('상신했습니다. 소유 부서의 최종 승인을 기다립니다.')
      } else if (detail.approval) {
        if (attempt.current?.reason !== text) attempt.current = { reason: text, key: crypto.randomUUID() }
        await knowledgeWorkspaceApi.decide(detail.approval, command, text, attempt.current.key)
        onDone(command === 'APPROVE' ? '게시했습니다. 검색 준비와 부서 전달을 요청했습니다.'
          : command === 'RETURN' ? '보완 요청을 기록했습니다.' : '반려를 기록했습니다.')
      }
    } catch (failure) {
      setError(apiErrorMessage(failure, '결재, 근거 또는 권한 상태가 변경되었습니다. 상세를 다시 조회해 주세요.'))
    } finally {
      setPending(false)
    }
  }

  return <Dialog open title={label} onClose={() => { if (!pending) onClose() }}>
    <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void submit() }}>
      {command === 'SUBMIT' && <p>소유 부서에 최종 승인을 요청합니다. 게시 후 현재 열람 권한이 있는 소유 부서 구성원이 배포 대상입니다.</p>}
      <FormField id="review-reason" label="사유" required={command !== 'APPROVE'}>
        {(props) => <Textarea {...props} value={reason} maxLength={2000} required={command !== 'APPROVE'}
          readOnly={pending} onChange={(event) => setReason(event.target.value)} />}
      </FormField>
      {error && <Notice tone="danger" announce>{error}</Notice>}
      <div className={styles.formActions}>
        <Button disabled={pending} onClick={onClose}>취소</Button>
        <Button type="submit" variant="primary" busy={pending}>{label}</Button>
      </div>
    </form>
  </Dialog>
}

function DraftEditor({ detail, onSaved }: {
  detail: KnowledgeDraftDetail; onSaved: (body: string, rowVersion: number) => void
}) {
  const [edit, setEdit] = useState<{ body: string; revision: number }>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const body = edit?.body ?? detail.body

  async function save() {
    const text = body.trim()
    if (!text || pending) return
    setPending(true)
    setMessage('')
    setError('')
    try {
      const { row_version } = await knowledgeDraftApi.edit({
        knowledge_id: detail.version.knowledgeId, version_id: detail.version.id,
        row_version: edit?.revision ?? detail.rowVersion,
      }, text)
      setEdit(undefined)
      onSaved(text, row_version)
      setMessage('초안 본문을 저장했습니다.')
    } catch (failure) {
      setError(apiErrorMessage(failure, '초안이 변경되었습니다. 내용을 다시 불러온 뒤 저장해 주세요.'))
    } finally {
      setPending(false)
    }
  }

  return <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void save() }}>
    <FormField id="saved-draft-body" label="초안 본문" required>
      {(props) => <Textarea {...props} value={body} maxLength={100_000} readOnly={pending}
        onChange={(event) => setEdit({ body: event.target.value, revision: edit?.revision ?? detail.rowVersion })} />}
    </FormField>
    {error && <Notice tone="danger" announce>{error}</Notice>}
    {message && <Notice tone="success" announce>{message}</Notice>}
    <div className={styles.formActions}>
      {edit && <Button disabled={pending} onClick={() => { setEdit(undefined); setError(''); setMessage('') }}>저장된 본문으로 돌아가기</Button>}
      <Button type="submit" variant="primary" busy={pending} disabled={!body.trim() || !edit}>본문 저장</Button>
    </div>
  </form>
}
