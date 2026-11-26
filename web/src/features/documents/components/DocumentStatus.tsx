import { Badge } from '../../../common/components/Feedback'

const parseStatuses = {
  PENDING: { label: '파싱 대기', tone: 'neutral' },
  PARSED: { label: '파싱 완료', tone: 'success' },
  OCR_REQUIRED: { label: 'OCR 필요', tone: 'warning' },
  QUALITY_FAILED: { label: '품질 검토 필요', tone: 'warning' },
  FAILED: { label: '파싱 실패', tone: 'danger' },
} as const
const publishStatuses = {
  DRAFT: { label: '초안', tone: 'neutral' },
  PUBLISHED: { label: '게시됨', tone: 'success' },
  RETIRED: { label: '게시 회수', tone: 'neutral' },
} as const

export function ParseStatus({ status }: { status: string | null }) {
  const state = status ? parseStatuses[status as keyof typeof parseStatuses] : undefined
  return <Badge tone={state?.tone}>{state?.label ?? '처리 상태 없음'}</Badge>
}

export function PublishStatus({ status }: { status: string }) {
  const state = publishStatuses[status as keyof typeof publishStatuses]
  return <Badge tone={state?.tone}>{state?.label ?? '게시 상태 없음'}</Badge>
}
