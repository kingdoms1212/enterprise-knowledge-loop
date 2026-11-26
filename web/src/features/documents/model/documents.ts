import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '../../session/api/sessionApi'
import { workspaceKey } from '../../session/model/session'
import { documentsApi } from '../api/documentsApi'
import type { DocumentCommand, DocumentView, FolderCommand } from '../api/documentsApi'

export function useDocumentList(session: Session, view: DocumentView, folder: string) {
  return useInfiniteQuery({
    queryKey: [...workspaceKey(session), 'document-list', view, folder],
    queryFn: ({ pageParam, signal }) => documentsApi.list(view, folder, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useFolders(session: Session, department: string, parent: string) {
  return useInfiniteQuery({
    queryKey: [...workspaceKey(session), 'folders', department, parent],
    queryFn: ({ pageParam, signal }) => documentsApi.folders(department, parent, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useLibraryCapabilities(session: Session) {
  return useQuery({ queryKey: [...workspaceKey(session), 'document-capabilities'],
    queryFn: ({ signal }) => documentsApi.capabilities(signal) })
}

export function usePolicyPreview(session: Session, department: string, classification: number, folder: string) {
  return useQuery({
    queryKey: [...workspaceKey(session), 'document-policy-preview', department, classification, folder],
    queryFn: ({ signal }) => documentsApi.preview(department, classification, folder, signal),
    retry: false, gcTime: 0, refetchOnWindowFocus: false,
  })
}

export function useDocument(session: Session, id: string) {
  return useQuery({
    queryKey: [...workspaceKey(session), 'documents', id],
    queryFn: ({ signal }) => documentsApi.get(id, signal),
    refetchInterval: (query) => query.state.status === 'success'
      && query.state.data?.document.parseStatus === 'PENDING' ? 5_000 : false,
  })
}

export function useUploadDocument(session: Session) {
  const client = useQueryClient()
  return useMutation({
    gcTime: 0,
    mutationFn: ({ input, key }: { input: Parameters<typeof documentsApi.upload>[0]; key: string }) => documentsApi.upload(input, key),
    onSuccess: () => client.invalidateQueries({ queryKey: [...workspaceKey(session), 'document-list'] }),
  })
}

export function useDocumentCommand(session: Session, id: string, revision: number) {
  const client = useQueryClient()
  const scope = workspaceKey(session)
  return useMutation({
    gcTime: 0,
    mutationFn: ({ command, key }: { command: DocumentCommand; key: string }) =>
      documentsApi.change(id, revision, command, key),
    onSuccess: async (_result, { command }) => {
      if (command.type === 'retire') client.removeQueries({ queryKey: [...scope, 'documents', id] })
      else await client.invalidateQueries({ queryKey: [...scope, 'documents', id] })
      await client.invalidateQueries({ queryKey: [...scope, 'document-list'] })
    },
  })
}

export function useFolderCommand(session: Session) {
  const client = useQueryClient()
  const scope = workspaceKey(session)
  return useMutation({
    gcTime: 0,
    mutationFn: ({ command, key }: { command: FolderCommand; key: string }) => documentsApi.changeFolder(command, key),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: [...scope, 'folders'] })
      await client.invalidateQueries({ queryKey: [...scope, 'document-list'] })
    },
  })
}
