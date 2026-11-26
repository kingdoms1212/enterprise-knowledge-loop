import { Badge } from '../../../common/components/Feedback'

const labels = {
  OPEN: ['접수됨', 'neutral'], COLLECTING_OPINIONS: ['의견 수집 중', 'info'],
  DECIDED: ['결정 완료', 'info'], IN_ACTION: ['조치 중', 'warning'], CLOSED: ['종결', 'success'],
} as const

export const closeLabels: Record<string, string> = {
  AI_REFERENCE: 'AI 지식 참조', RESOLVED: '일반 종결', NO_REPLY_NEEDED: '종료',
}

export function CaseStatus({ value }: { value: string }) {
  const state = labels[value as keyof typeof labels]
  return <Badge tone={state?.[1]}>{state?.[0] ?? '상태 미지정'}</Badge>
}
