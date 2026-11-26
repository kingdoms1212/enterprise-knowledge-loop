export type CursorPage<T> = { items: T[]; nextCursor: string | null }

export function cursorPath(path: string, cursor: string | null) {
  return cursor ? path + '?cursor=' + encodeURIComponent(cursor) : path
}
