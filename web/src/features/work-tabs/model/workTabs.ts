import { create } from 'zustand'

export type WorkTab = { path: string; label: string }
type WorkTabState = {
  tabs: WorkTab[]
  open: (tab: WorkTab) => void
  close: (path: string) => void
  clear: () => void
}

export const useWorkTabs = create<WorkTabState>((set) => ({
  tabs: [],
  open: (tab) => set((state) => state.tabs.some((current) => current.path === tab.path)
    ? state : { tabs: [...state.tabs, tab] }),
  close: (path) => set((state) => ({ tabs: state.tabs.filter((tab) => tab.path !== path) })),
  clear: () => set({ tabs: [] }),
}))
