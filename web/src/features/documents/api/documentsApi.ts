import { apiRequest } from '../../../common/api/client'

export type DocumentVersion = {
  id: string
  versionNumber: number
  parseStatus: string
  publishState: string
  createdAt: string
}
export type DocumentSummary = {
    id: string
    title: string
    ownerDepartmentId: string
    folderId: string | null
    currentVersionId: string | null
    versionNumber: number | null
    parseStatus: string | null
    rowVersion: number
}
export type DocumentDetail = {
  document: DocumentSummary
  versions: DocumentVersion[]
  policy: { origin: string; classificationLevel: number }
  actions: { uploadVersion: boolean; publish: boolean; retire: boolean }
}
export type DocumentView = 'MY_DEPARTMENT' | 'UPLOADED_BY_ME' | 'SHARED' | 'RECENT'
export type DocumentRow = { document: DocumentSummary; classificationLevel: number; policyOrigin: string; updatedAt: string }
export type FolderRow = { folder: { id: string; name: string; ownerDepartmentId: string; parentId: string | null }; rowVersion: number; manage: boolean }
export type LibraryPage<T> = { items: T[]; nextCursor: string | null }
export type LibraryCapabilities = { upload: boolean; manageFolders: boolean }
export type PolicyPreview = {
  origin: 'INHERITED' | 'TEMPLATE'
  sourceName: string | null
  classificationLevel: number
  sharingScope: string
  rules: { action: string; effect: 'ALLOW' | 'DENY' }[]
}

type DocumentUpload = {
  title: string
  departmentId: string
  classification: number
  folderId: string
  file: File
}

export type DocumentUploadResult = { document_id: string; row_version: number; job_id: string }
export type DocumentCommand =
  | { type: 'version'; file: File }
  | { type: 'publish' | 'unpublish'; version: string }
  | { type: 'retire'; reason: string }
export type FolderCommand =
  | { type: 'create'; department: string; name: string; parent: string | null; classification: number | null }
  | { type: 'rename'; target: FolderRow; name: string }
  | { type: 'archive'; target: FolderRow }

export const documentsApi = {
  get: (id: string, signal?: AbortSignal) => apiRequest<DocumentDetail>('/documents/' + encodeURIComponent(id), { signal }),
  list: (view: DocumentView, folder: string, cursor: string | null, signal?: AbortSignal) =>
    apiRequest<LibraryPage<DocumentRow>>(filteredPath('/documents', { view, folder_id: folder, cursor }), { signal }),
  folders: (department: string, parent: string, cursor: string | null, signal?: AbortSignal) =>
    apiRequest<LibraryPage<FolderRow>>(filteredPath('/document-folders', {
      owner_department_id: department, parent_id: parent, cursor,
    }), { signal }),
  capabilities: (signal?: AbortSignal) => apiRequest<LibraryCapabilities>('/document-library/capabilities', { signal }),
  preview: (department: string, classification: number, folder: string, signal?: AbortSignal) =>
    apiRequest<PolicyPreview>('/documents/policy-preview', {
      method: 'POST', signal, body: { owner_department_id: department, classification_level: classification, folder_id: folder || null },
    }),
  upload: (input: DocumentUpload, idempotencyKey: string) => {
    const body = new FormData()
    body.set('title', input.title)
    body.set('owner_department_id', input.departmentId)
    body.set('classification_level', String(input.classification))
    body.set('file', input.file)
    if (input.folderId) body.set('folder_id', input.folderId)
    return apiRequest<DocumentUploadResult>('/documents', { method: 'POST', body, idempotencyKey })
  },
  change: (id: string, revision: number, command: DocumentCommand, idempotencyKey: string) => {
    const path = '/documents/' + encodeURIComponent(id)
    if (command.type === 'version') {
      const body = new FormData()
      body.set('file', command.file)
      body.set('expected_version', String(revision))
      return apiRequest<DocumentUploadResult>(path + '/versions', { method: 'POST', body, idempotencyKey })
    }
    if (command.type === 'retire') {
      return apiRequest<DocumentUploadResult>(path + '/retire',
        { method: 'POST', body: { expected_version: revision, reason: command.reason } })
    }
    return apiRequest<DocumentUploadResult>(path + '/versions/' + encodeURIComponent(command.version) + '/' + command.type,
      { method: 'POST', body: { expected_version: revision }, idempotencyKey: command.type === 'publish' ? idempotencyKey : undefined })
  },
  changeFolder: (command: FolderCommand, idempotencyKey: string) => {
    if (command.type === 'create') {
      return apiRequest<void>('/document-folders', {
        method: 'POST', idempotencyKey, body: {
          owner_department_id: command.department, name: command.name, parent_id: command.parent,
          classification_level: command.classification,
        },
      })
    }
    const path = '/document-folders/' + encodeURIComponent(command.target.folder.id)
    if (command.type === 'archive') return apiRequest<void>(path, { method: 'DELETE' })
    return apiRequest<void>(path, {
      method: 'PATCH', body: { name: command.name, expected_version: command.target.rowVersion },
    })
  },
}

function filteredPath(path: string, values: Record<string, string | null>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value) search.set(key, value)
  }
  return path + '?' + search
}
