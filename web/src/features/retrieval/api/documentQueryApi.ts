import { apiRequest } from '../../../common/api/client'

type DocumentQueryResponse = {
  status: string
  outcome_reason: string | null
  generation_mode: string | null
  answer: string | null
  sources: { citation_key: string; document_id: string; title: string; version_number: number; page: number | null; paragraph: number | null }[]
}

export function queryDocuments(question: string) {
  return apiRequest<DocumentQueryResponse>('/rag/queries', { method: 'POST', body: { question } })
}
