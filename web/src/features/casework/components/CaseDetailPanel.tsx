import { useState } from 'react'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { LoadingState, Notice } from '../../../common/components/Feedback'
import styles from '../../../common/components/Workspace.module.css'
import { formatDateTime } from '../../../common/utils/dateTime'
import type { Session } from '../../session/api/sessionApi'
import { useCaseDetail } from '../model/casework'
import { CaseCloseDialog } from './CaseCloseDialog'
import { CaseDecisionDialog } from './CaseDecisionDialog'
import { CaseStatus, closeLabels } from './CaseStatus'

const classifications: Record<string, string> = { INQUIRY: '문의', COMPLAINT: '불만', REQUEST: '요청', PROPOSAL: '제안', OTHER: '기타' }
const urgencies: Record<string, string> = { NORMAL: '일반', HIGH: '높음', URGENT: '긴급' }
const outcomes: Record<string, string> = { SUCCESS: '성공', PARTIAL: '부분 해결', FAIL: '실패', NO_ACTION: '조치 없음' }

export function CaseDetailPanel({ session, id }: { session: Session; id: string }) {
  const query = useCaseDetail(session, id)
  const [dialog, setDialog] = useState<'decide' | 'close' | null>(null)
  const [message, setMessage] = useState('')
  if (query.isPending) return <LoadingState label="Case 상세 조회 중" />
  if (query.isError) return <div className={styles.body}>
    <Notice tone="danger" announce>{apiErrorMessage(query.error)}</Notice><div><Button onClick={() => query.refetch()}>다시 조회</Button></div>
  </div>
  const detail = query.data
  return <div className={styles.body}>
    <div className={styles.row}>
      <div><h3 className={styles.title}>{detail.work.title}</h3><CaseStatus value={detail.work.state} /></div>
      {detail.canDecide && <div className={styles.actions}>
        <Button onClick={() => setDialog('decide')}>{detail.decision ? '결정 변경' : '결정 기록'}</Button>
        <Button variant="primary" onClick={() => setDialog('close')} disabled={detail.pendingTasks}
          aria-describedby={detail.pendingTasks ? 'case-close-block' : undefined}>종결</Button>
      </div>}
    </div>
    {detail.pendingTasks && <Notice tone="warning">
      <span id="case-close-block">필수 협업 업무가 끝나면 Case를 종결할 수 있습니다.</span>
    </Notice>}
    {message && <Notice tone="success" announce>{message}</Notice>}
    <dl className={styles.meta}>
      <dt>담당 부서</dt><dd>{detail.department}</dd>
      {detail.type && <><dt>분류</dt><dd>{classifications[detail.type] ?? detail.type}</dd></>}
      {detail.urgency && <><dt>긴급도</dt><dd>{urgencies[detail.urgency] ?? detail.urgency}</dd></>}
      {detail.work.closeType && <><dt>종결 유형</dt><dd>{closeLabels[detail.work.closeType] ?? detail.work.closeType}</dd></>}
      {detail.closeNote && <><dt>종결 메모</dt><dd className={styles.text}>{detail.closeNote}</dd></>}
    </dl>
    <section className={styles.section} aria-labelledby="case-decision-heading">
      <h3 id="case-decision-heading">사람 결정</h3>
      {detail.decision ? <>
        <strong>{formatDateTime(detail.decision.decidedAt)}</strong>
        <p className={styles.text}>{detail.decision.description}</p>
        <p className={styles.text}>{detail.decision.reason}</p>
      </> : <p className={styles.intro}>아직 결정이 기록되지 않았습니다.</p>}
    </section>
    <section className={styles.section} aria-labelledby="case-outcome-heading">
      <h3 id="case-outcome-heading">처리 결과</h3>
      {detail.outcome ? <><strong>{outcomes[detail.outcome.result] ?? detail.outcome.result}</strong>
        <p className={styles.text}>{detail.outcome.summary}</p></> : <p className={styles.intro}>기록된 처리 결과가 없습니다.</p>}
    </section>
    {dialog === 'decide' && <CaseDecisionDialog session={session} detail={detail} onClose={() => setDialog(null)}
      onDone={() => { setDialog(null); setMessage('결정을 저장했습니다.') }} />}
    {dialog === 'close' && <CaseCloseDialog session={session} detail={detail} onClose={() => setDialog(null)}
      onDone={() => { setDialog(null); setMessage('Case를 종결했습니다.') }} />}
  </div>
}
