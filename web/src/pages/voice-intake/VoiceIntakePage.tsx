import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../common/components/Button'
import { Notice } from '../../common/components/Feedback'
import { WorkQueue } from '../../common/components/WorkQueue'
import styles from '../../common/components/Workspace.module.css'
import { formatDateTime } from '../../common/utils/dateTime'
import { uuidPattern } from '../../common/utils/uuid'
import type { Session } from '../../features/session/api/sessionApi'
import { useAssignments, useSession } from '../../features/session/model/session'
import { VoiceDetailPanel } from '../../features/voice/components/VoiceDetailPanel'
import { VoiceIntakeDialog } from '../../features/voice/components/VoiceIntakeDialog'
import { VoiceStatus } from '../../features/voice/components/VoiceStatus'
import { useVoiceCapabilities, useVoiceQueue } from '../../features/voice/model/voice'

export function VoiceIntakePage() {
  const { data: session } = useSession()
  return session ? <VoiceWorkspace session={session} /> : null
}

function VoiceWorkspace({ session }: { session: Session }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [intake, setIntake] = useState(false)
  const [created, setCreated] = useState('')
  const queue = useVoiceQueue(session)
  const capabilities = useVoiceCapabilities(session)
  const assignments = useAssignments(session)
  const selectedDepartment = assignments.data?.find(({ id }) => id === session.assignmentId)
  const department = selectedDepartment && { id: selectedDepartment.departmentId, name: selectedDepartment.departmentName }
  const id = params.get('voice') ?? ''
  const selected = uuidPattern.test(id)
  const targetHeading = useRef<HTMLHeadingElement>(null)
  const previouslySelected = useRef(false)
  const items = queue.data?.pages.flatMap((page) => page.items) ?? []

  useEffect(() => {
    if (selected || previouslySelected.current) targetHeading.current?.focus()
    previouslySelected.current = selected
  }, [selected])

  return <div className={styles.page}>
    <header className={styles.heading}>
      <div><p className={styles.crumb}>01 / INTAKE · TRIAGE</p><h1>VOC 수신함</h1>
        <p className={styles.intro}>접수된 문의를 확인하고 분류와 담당 부서를 확정합니다.</p></div>
      {capabilities.data?.intake && department && <Button variant="primary" onClick={() => setIntake(true)}>새 VOC 접수</Button>}
    </header>
    {created === id && created && <Notice tone="success" announce>VOC를 접수하고 정제 작업을 요청했습니다.</Notice>}
    <div className={styles.columns}>
      <section className={styles.panel} aria-labelledby="voice-queue-heading">
        <h2 className={styles.panelHeading} id="voice-queue-heading"
          ref={selected ? undefined : targetHeading} tabIndex={-1}>접수 대기열</h2>
        <WorkQueue items={items.map((item) => ({ id: item.id, title: item.title ?? '제목 없는 VOC',
          metadata: formatDateTime(item.receivedAt), status: <VoiceStatus value={item.triageStatus} /> }))}
          selected={id} loading={queue.isPending} error={queue.isError ? queue.error : null}
          hasMore={queue.hasNextPage} loadingMore={queue.isFetchingNextPage} noun="VOC" layout={selected ? undefined : 'table'}
          onSelect={(selected) => setParams({ voice: selected })}
          onRetry={() => queue.refetch()} onMore={() => queue.fetchNextPage()} />
      </section>
      {selected && <section className={styles.panel} aria-labelledby="voice-detail-heading">
        <header className={styles.panelHeading}><div className={styles.row}>
          <h2 id="voice-detail-heading" ref={targetHeading} tabIndex={-1}>접수 상세</h2>
          <Button onClick={() => setParams({})}>상세 닫기</Button>
        </div></header>
        <VoiceDetailPanel key={id} session={session} id={id} department={department}
          onCase={(caseId) => navigate('/cases?case=' + encodeURIComponent(caseId))} />
      </section>}
    </div>
    {intake && department && <VoiceIntakeDialog session={session} department={department}
      onClose={() => setIntake(false)} onDone={(voice) => { setIntake(false); setCreated(voice); setParams({ voice }) }} />}
  </div>
}
