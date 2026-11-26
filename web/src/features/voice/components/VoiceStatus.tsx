import { Badge } from '../../../common/components/Feedback'

const states = {
  RECEIVED: ['접수됨', 'neutral'],
  CLEANING: ['정제 중', 'info'],
  QUARANTINED: ['격리', 'danger'],
  ANALYZED: ['분류 대기', 'info'],
  ANALYSIS_FAILED: ['분석 실패', 'warning'],
  TRIAGED: ['분류 완료', 'success'],
  DUPLICATE: ['중복', 'warning'],
} as const

export function VoiceStatus({ value }: { value: string | null }) {
  const state = value ? states[value as keyof typeof states] : undefined
  return <Badge tone={state?.[1]}>{state?.[0] ?? '상태 미지정'}</Badge>
}
