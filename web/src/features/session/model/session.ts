import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ApiError } from '../../../common/api/client'
import { useWorkTabs } from '../../work-tabs/model/workTabs'
import { sessionApi } from '../api/sessionApi'
import type { Credentials, Session } from '../api/sessionApi'

const sessionKey = ['session', 'current'] as const
const assignmentKey = (accountId: string) => ['session', 'assignments', accountId] as const

export function workspaceKey(session: Session) {
  return ['workspace', session.organizationId, session.accountId, session.assignmentId, session.contextRevision] as const
}

export function useSession(enabled = true) {
  return useQuery({ queryKey: sessionKey, queryFn: ({ signal }) => sessionApi.current(signal), enabled,
    refetchOnWindowFocus: 'always', retry: false, staleTime: 5_000 })
}

export function useAssignments(session: Session) {
  return useQuery({ queryKey: assignmentKey(session.accountId), queryFn: ({ signal }) => sessionApi.assignments(signal),
    staleTime: 30_000 })
}

export async function recheckSession(client: QueryClient) {
  const previous = client.getQueryData<Session>(sessionKey)
  if (!previous) return

  await client.invalidateQueries({ queryKey: sessionKey }, { cancelRefetch: false })
  const { data: next, error } = client.getQueryState<Session, ApiError>(sessionKey) ?? {}
  if (error?.status === 401 || (next && (next.contextRevision !== previous.contextRevision
      || next.assignmentId !== previous.assignmentId || next.accountId !== previous.accountId))) {
    const filter = { queryKey: workspaceKey(previous) }
    await client.cancelQueries(filter)
    client.removeQueries(filter)
    void client.invalidateQueries({ queryKey: assignmentKey(previous.accountId) })
    client.getMutationCache().clear()
    useWorkTabs.getState().clear()
  }
}

export function useSessionActions() {
  const client = useQueryClient()

  async function replaceSession(next: Session | null) {
    await client.cancelQueries()
    client.removeQueries({ predicate: (query) => query.queryKey[0] === 'workspace'
      || (query.queryKey[0] === 'session' && query.queryKey[1] === 'assignments') })
    client.getMutationCache().clear()
    useWorkTabs.getState().clear()
    client.setQueryData<Session | null>(sessionKey, next)
  }

  return {
    async login(credentials: Credentials) {
      const next = await sessionApi.login(credentials)
      await replaceSession(next)
      return next
    },
    async selectAssignment(id: string, session: Session) {
      try {
        const next = await sessionApi.selectAssignment(id, session.contextRevision)
        if (next.contextRevision !== session.contextRevision || next.assignmentId !== session.assignmentId) {
          await replaceSession(next)
        }
        return next
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 409)) {
          await client.invalidateQueries({ queryKey: sessionKey })
        }
        throw error
      }
    },
    async logout() {
      try {
        await sessionApi.logout()
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error
      }
      await replaceSession(null)
    },
    async refresh() {
      await client.invalidateQueries({ queryKey: sessionKey })
    },
  }
}
