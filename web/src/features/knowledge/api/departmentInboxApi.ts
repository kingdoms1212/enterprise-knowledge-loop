import { apiRequest } from '../../../common/api/client'
import { cursorPath, type CursorPage } from '../../../common/api/cursorPage'

export type DepartmentInboxItem = {
  id: string; versionId: string; title: string; versionNumber: number; deliveredAt: string; acknowledgedAt: string | null
}

export const departmentInboxApi = {
  list: (cursor: string | null, signal?: AbortSignal) =>
    apiRequest<CursorPage<DepartmentInboxItem>>(cursorPath('/distributions/inbox', cursor), { signal }),
  acknowledge: (id: string) =>
    apiRequest<{ acknowledged_at: string }>('/distributions/' + encodeURIComponent(id) + '/acknowledgements', { method: 'POST' }),
}
