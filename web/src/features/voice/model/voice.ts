import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '../../session/api/sessionApi'
import { workspaceKey } from '../../session/model/session'
import { voiceApi } from '../api/voiceApi'
import type { VoiceIntake, VoiceTriage } from '../api/voiceApi'

export function useVoiceQueue(session: Session) {
  return useInfiniteQuery({
    queryKey: [...workspaceKey(session), 'voice', 'queue'],
    queryFn: ({ pageParam, signal }) => voiceApi.list(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useVoiceDetail(session: Session, id: string) {
  return useQuery({
    queryKey: [...workspaceKey(session), 'voice', 'detail', id],
    queryFn: ({ signal }) => voiceApi.detail(id, signal),
    refetchInterval: ({ state }) => state.status === 'success'
      && (state.data?.voice.triageStatus === 'RECEIVED' || state.data?.voice.triageStatus === 'CLEANING') ? 5_000 : false,
  })
}

export function useVoiceCapabilities(session: Session) {
  return useQuery({ queryKey: [...workspaceKey(session), 'voice', 'capabilities'],
    queryFn: ({ signal }) => voiceApi.capabilities(signal) })
}

export function useVoiceIntake(session: Session) {
  const client = useQueryClient()
  return useMutation({
    gcTime: 0,
    mutationFn: ({ body, key }: { body: VoiceIntake; key: string }) => voiceApi.intake(body, key),
    onSuccess: () => client.invalidateQueries({ queryKey: [...workspaceKey(session), 'voice', 'queue'] }),
  })
}

export function useVoiceTriage(session: Session, id: string) {
  const client = useQueryClient()
  return useMutation({
    gcTime: 0,
    mutationFn: ({ body, key }: { body: VoiceTriage; key: string }) => voiceApi.triage(id, body, key),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: [...workspaceKey(session), 'voice'] })
      await client.invalidateQueries({ queryKey: [...workspaceKey(session), 'casework', 'queue'] })
    },
  })
}
