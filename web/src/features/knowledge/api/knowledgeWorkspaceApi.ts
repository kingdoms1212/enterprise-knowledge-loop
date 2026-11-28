import { apiRequest } from '../../../common/api/client'
import { cursorPath, type CursorPage } from '../../../common/api/cursorPage'

export type KnowledgeDraftRow = {
  id: string; knowledgeId: string; title: string; versionNumber: number; kind: string; state: string
}

type Source = {
  documentId: string | null; caseId: string | null; title: string; versionNumber: number | null; locator: string | null
}

export type KnowledgeDraftDetail = {
  version: KnowledgeDraftRow; body: string; rowVersion: number; canEdit: boolean; canSubmit: boolean
  approval: { id: string; state: string; rowVersion: number; canDecide: boolean; reason: string | null } | null
  sources: Source[]
}

export type ReviewDecision = 'APPROVE' | 'RETURN' | 'REJECT'

export const knowledgeWorkspaceApi = {
  list: (view: 'drafts' | 'reviews', cursor: string | null, signal: AbortSignal) =>
    apiRequest<CursorPage<KnowledgeDraftRow>>(cursorPath('/knowledge/' + view, cursor), { signal }),
  detail: (version: string, signal: AbortSignal) =>
    apiRequest<KnowledgeDraftDetail>('/knowledge/versions/' + encodeURIComponent(version), { signal }),
  submit: (detail: KnowledgeDraftDetail, reason: string) =>
    apiRequest<{ step_id: string }>('/knowledge/' + encodeURIComponent(detail.version.knowledgeId)
      + '/versions/' + encodeURIComponent(detail.version.id) + '/submit', {
      method: 'POST', body: { reason, expected_version: detail.rowVersion },
    }),
  decide: (step: NonNullable<KnowledgeDraftDetail['approval']>, decision: ReviewDecision, reason: string, key: string) =>
    apiRequest<{ version_id: string; row_version: number; job_id?: string }>('/approval-steps/' + encodeURIComponent(step.id) + '/decision', {
      method: 'POST', body: { decision, reason: reason || null, expected_version: step.rowVersion }, idempotencyKey: key,
    }),
}
