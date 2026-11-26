import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkTabs } from './workTabs'

beforeEach(() => useWorkTabs.getState().clear())

describe('work tabs', () => {
  it('keeps tab order and does not duplicate open tabs', () => {
    const store = useWorkTabs.getState()
    store.open({ path: '/work', label: '내 업무' })
    store.open({ path: '/documents', label: '문서함' })
    store.open({ path: '/work', label: '내 업무' })
    expect(useWorkTabs.getState().tabs.map(({ path }) => path)).toEqual(['/work', '/documents'])
  })

  it('closes selected tabs and clears tabs on session changes', () => {
    const store = useWorkTabs.getState()
    store.open({ path: '/work', label: '내 업무' })
    store.open({ path: '/documents', label: '문서함' })
    store.close('/documents')
    expect(useWorkTabs.getState().tabs).toEqual([{ path: '/work', label: '내 업무' }])
    store.clear()
    expect(useWorkTabs.getState().tabs).toEqual([])
  })
})
