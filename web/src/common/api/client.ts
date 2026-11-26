const apiRoot = '/api/v1'

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super('Core API returned ' + status)
    this.name = 'ApiError'
  }
}

export function isAuthenticationError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
}

export function apiErrorMessage(error: unknown, conflict = '다른 변경이 먼저 반영되었습니다. 새로 조회해 주세요.'): string {
  if (!(error instanceof ApiError)) return '서버에 연결할 수 없습니다. 연결을 확인하고 다시 시도해 주세요.'
  switch (error.status) {
    case 401: return '로그인이 필요합니다. 다시 로그인해 주세요.'
    case 403: return '이 작업을 수행할 권한이 없습니다.'
    case 404: return '찾을 수 없음'
    case 409: return conflict
    case 413: return '파일 크기는 10 MiB 이하여야 합니다.'
    case 400:
    case 422: return '입력값을 확인하고 다시 시도해 주세요.'
    default: return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; signal?: AbortSignal; idempotencyKey?: string }
type CsrfToken = { headerName: string; token: string }

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, idempotencyKey } = options
  const headers = new Headers({ Accept: 'application/json' })
  if (method !== 'GET') {
    const csrf = await apiRequest<CsrfToken>('/authentication/csrf', { signal })
    headers.set(csrf.headerName, csrf.token)
  }
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)
  if (body !== undefined && !(body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const response = await fetch(apiRoot + path, {
    method,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new ApiError(response.status)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
