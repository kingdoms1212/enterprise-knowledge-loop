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

export const localDemoLoginEnabled = import.meta.env.DEV && import.meta.env.EKL_LOCAL_DEMO_LOGIN === true

export function isLocalDemoLogin(credentials: Credentials) {
  return localDemoLoginEnabled && credentials.organization_id === '1'
    && credentials.employee_number === '1' && credentials.password === '1'
}

export const sessionApi = {
  current: (signal?: AbortSignal) => apiRequest<Session>('/me', { signal }),
  assignments: (signal?: AbortSignal) => apiRequest<Assignment[]>('/me/assignments', { signal }),
  login: (credentials: Credentials) => isLocalDemoLogin(credentials)
    ? apiRequest<Session>('/local-demo/session', { method: 'POST' })
    : apiRequest<Session>('/sessions', { method: 'POST', body: credentials }),
  selectAssignment: (assignment: string, revision: number) => apiRequest<Session>('/sessions/current/assignment', {
    method: 'PUT', body: { assignment_id: assignment, expected_revision: revision },
  }),
  logout: () => apiRequest<void>('/sessions/current', { method: 'DELETE' }),
}
