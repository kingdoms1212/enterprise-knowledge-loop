import { apiRequest } from '../../../common/api/client'
import { cursorPath } from '../../../common/api/cursorPage'
import type { CursorPage } from '../../../common/api/cursorPage'

export type CaseRow = { id: string; title: string; state: string; closeType: string | null; createdAt: string }
export type CaseDetail = {
  work: CaseRow; department: string; type: string | null; urgency: string | null; closeNote: string | null
  rowVersion: number; canDecide: boolean; pendingTasks: boolean
  decision: { description: string; reason: string; decidedAt: string } | null
  outcome: { result: string; summary: string; state: string } | null
}
export type CaseDecisionInput = { decision: string; reason: string; expected_version: number }
export type CaseCloseInput = { close_type: string; close_note: string | null; expected_version: number
  outcome?: { result: string; summary: string }
  applied_reference?: { document_version_id?: string; knowledge_version_id?: string; reason: string }
}

function path(id: string) {
  return '/cases/' + encodeURIComponent(id)
}

export const caseApi = {
  list: (cursor: string | null, signal?: AbortSignal) => apiRequest<CursorPage<CaseRow>>(cursorPath('/cases', cursor), { signal }),
  detail: (id: string, signal?: AbortSignal) => apiRequest<CaseDetail>(path(id), { signal }),
  decide: (id: string, body: CaseDecisionInput) => apiRequest<{ decision_id: string; row_version: number }>(
    path(id) + '/decisions', { method: 'POST', body }),
  close: (id: string, body: CaseCloseInput, idempotencyKey: string) => apiRequest<{ case_id: string; row_version: number }>(
    path(id) + '/close', { method: 'POST', body, idempotencyKey }),
}
