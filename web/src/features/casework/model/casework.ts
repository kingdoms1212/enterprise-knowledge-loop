import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '../../session/api/sessionApi'
import { workspaceKey } from '../../session/model/session'
import { caseApi } from '../api/caseApi'
import type { CaseCloseInput, CaseDecisionInput } from '../api/caseApi'

export function useCaseQueue(session: Session) {
  return useInfiniteQuery({
    queryKey: [...workspaceKey(session), 'casework', 'queue'],
    queryFn: ({ pageParam, signal }) => caseApi.list(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useCaseDetail(session: Session, id: string) {
  return useQuery({ queryKey: [...workspaceKey(session), 'casework', 'detail', id],
    queryFn: ({ signal }) => caseApi.detail(id, signal) })
}

type CaseCommand = { kind: 'decide'; body: CaseDecisionInput } | { kind: 'close'; body: CaseCloseInput; key: string }

export function useCaseCommand(session: Session, id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    gcTime: 0,
    mutationFn: async (command: CaseCommand): Promise<void> => {
      if (command.kind === 'decide') await caseApi.decide(id, command.body)
      else await caseApi.close(id, command.body, command.key)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...workspaceKey(session), 'casework'] }),
  })
}
