import { apiRequest } from '../../../common/api/client'

type DraftInput = {
  title: string
  kind: 'REFERENCE' | 'SOLUTION' | 'LESSON'
  body: string
  source_refs: { source_role: 'PRIMARY'; document_version_id: string; source_locator: string }[]
}

export type SavedDraft = { knowledge_id: string; version_id: string; row_version: number }

export const knowledgeDraftApi = {
  create(input: DraftInput, idempotencyKey: string) {
    return apiRequest<SavedDraft>('/knowledge', { method: 'POST', body: input, idempotencyKey })
  },
  edit(draft: SavedDraft, body: string) {
    const path = '/knowledge/' + encodeURIComponent(draft.knowledge_id) + '/versions/' + encodeURIComponent(draft.version_id)
    return apiRequest<Pick<SavedDraft, 'version_id' | 'row_version'>>(path, {
      method: 'PATCH', body: { body, expected_version: draft.row_version },
    })
  },
}
