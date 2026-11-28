import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { ApiError, sessionRecheckEvent } from '../../common/api/client'
import { recheckSession } from '../../features/session/model/session'

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (failureCount, error) => failureCount < 1 && (!(error instanceof ApiError) || error.status >= 500),
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    const recheck = () => { void recheckSession(client) }
    sessionRecheckEvent.addEventListener('recheck', recheck)
    return () => sessionRecheckEvent.removeEventListener('recheck', recheck)
  }, [])
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
