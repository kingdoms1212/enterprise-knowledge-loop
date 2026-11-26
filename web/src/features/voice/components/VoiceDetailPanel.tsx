import { useState } from 'react'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { LoadingState, Notice } from '../../../common/components/Feedback'
import styles from '../../../common/components/Workspace.module.css'
import { formatDateTime } from '../../../common/utils/dateTime'
import type { Session } from '../../session/api/sessionApi'
import { useVoiceDetail } from '../model/voice'
import { VoiceStatus } from './VoiceStatus'
import { VoiceTriageDialog } from './VoiceTriageDialog'

export function VoiceDetailPanel({ session, id, department, onCase }: {
  session: Session; id: string; department?: { id: string; name: string }; onCase: (id: string) => void
}) {
  const query = useVoiceDetail(session, id)
  const [triage, setTriage] = useState(false)
  if (query.isPending) return <LoadingState label="VOC 상세 조회 중" />
  if (query.isError) return <div className={styles.body}>
    <Notice tone="danger" announce>{apiErrorMessage(query.error)}</Notice>
    <div><Button onClick={() => query.refetch()}>다시 조회</Button></div>
  </div>
  const detail = query.data
  return <div className={styles.body}>
    <div className={styles.row}>
      <div><h3 className={styles.title}>{detail.voice.title ?? '제목 없는 VOC'}</h3><VoiceStatus value={detail.voice.triageStatus} /></div>
      {detail.canTriage && department && <Button variant="primary" onClick={() => setTriage(true)}>분류 확정</Button>}
    </div>
    <dl className={styles.meta}>
      <dt>접수 시각</dt><dd>{formatDateTime(detail.voice.receivedAt)}</dd>
      <dt>채널</dt><dd>{detail.voice.channel === 'MANUAL' ? '수동 접수' : detail.voice.channel}</dd>
      {detail.productCode && <><dt>제품·서비스</dt><dd>{detail.productCode}</dd></>}
      {detail.urgencyHint && <><dt>요청 긴급도</dt><dd>{detail.urgencyHint}</dd></>}
    </dl>
    <section className={styles.section} aria-labelledby="voice-clean">
      <h3 id="voice-clean">정제된 접수 내용</h3>
      {detail.cleanText ? <p className={styles.text}>{detail.cleanText}</p>
        : <p className={styles.intro}>정제된 내용이 아직 없습니다.</p>}
    </section>
    {triage && department && <VoiceTriageDialog session={session} detail={detail} department={department}
      onClose={() => setTriage(false)} onDone={(caseId) => { setTriage(false); onCase(caseId) }} />}
  </div>
}
