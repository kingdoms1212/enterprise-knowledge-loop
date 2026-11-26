import { apiRequest } from '../../../common/api/client'

export type Session = {
  organizationId: string
  accountId: string
  employmentId: string
  employeeNumber: string
  displayName: string
  assignmentId: string | null
  contextRevision: number
}
export type Assignment = { id: string; departmentId: string; departmentName: string; assignmentType: string }
export type Credentials = { organization_id: string; employee_number: string; password: string }

export const sessionApi = {
  current: (signal?: AbortSignal) => apiRequest<Session>('/me', { signal }),
  assignments: (signal?: AbortSignal) => apiRequest<Assignment[]>('/me/assignments', { signal }),
  login: (credentials: Credentials) => apiRequest<Session>('/sessions', { method: 'POST', body: credentials }),
  selectAssignment: (assignment: string, revision: number) => apiRequest<Session>('/sessions/current/assignment', {
    method: 'PUT', body: { assignment_id: assignment, expected_revision: revision },
  }),
  logout: () => apiRequest<void>('/sessions/current', { method: 'DELETE' }),
}
