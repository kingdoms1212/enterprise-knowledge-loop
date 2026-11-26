import { apiRequest } from '../../../common/api/client'
import { cursorPath } from '../../../common/api/cursorPage'
import type { CursorPage } from '../../../common/api/cursorPage'

export type VoiceRow = {
  id: string; title: string | null; channel: string; piiStatus: string; triageStatus: string | null; receivedAt: string
}
export type VoiceDetail = {
  voice: VoiceRow; cleanText: string | null; productCode: string | null; urgencyHint: string | null
  rowVersion: number; canTriage: boolean
}
export type VoiceIntake = { title: string; body: string; product_code: string; received_department_id: string; received_at: string }
export type VoiceTriage = {
  type_final: string; urgency_final: string; primary_department_id: string; handler_id: string
  override_reason: string | null; expected_version: number
}

export const voiceApi = {
  list: (cursor: string | null, signal?: AbortSignal) =>
    apiRequest<CursorPage<VoiceRow>>(cursorPath('/voices', cursor), { signal }),
  detail: (id: string, signal?: AbortSignal) => apiRequest<VoiceDetail>('/voices/' + encodeURIComponent(id), { signal }),
  capabilities: (signal?: AbortSignal) => apiRequest<{ intake: boolean }>('/voices/capabilities', { signal }),
  intake: (body: VoiceIntake, idempotencyKey: string) =>
    apiRequest<{ voice_id: string; job_id: string }>('/voices/intake', { method: 'POST', body, idempotencyKey }),
  triage: (id: string, body: VoiceTriage, idempotencyKey: string) =>
    apiRequest<{ case_id: string }>('/voices/' + encodeURIComponent(id) + '/triage', { method: 'POST', body, idempotencyKey }),
}
