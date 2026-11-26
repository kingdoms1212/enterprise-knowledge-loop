import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import styles from './Surfaces.module.css'

export function Tabs({ label, tabs, selected, onSelect }: {
  label: string
  tabs: readonly { id: string; label: string; content: ReactNode }[]
  selected: string
  onSelect: (id: string) => void
}) {
  const prefix = useId()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  return <>
    <div role="tablist" aria-label={label} className={styles.tabs}>
      {tabs.map((item, index) => <button key={item.id} id={prefix + '-tab-' + item.id}
        ref={(element) => { buttons.current[index] = element }} type="button" role="tab"
        aria-selected={item.id === selected} aria-controls={prefix + '-panel-' + item.id}
        tabIndex={item.id === selected ? 0 : -1} className={styles.tab} onClick={() => onSelect(item.id)}
        onKeyDown={(event) => {
          const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
            : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
            : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : undefined
          if (next === undefined) return
          event.preventDefault()
          onSelect(tabs[next].id)
          buttons.current[next]?.focus()
        }}>{item.label}</button>)}
    </div>
    {tabs.map((tab) => <div key={tab.id} id={prefix + '-panel-' + tab.id} role="tabpanel"
      hidden={tab.id !== selected} tabIndex={tab.id === selected ? 0 : -1}
      aria-labelledby={prefix + '-tab-' + tab.id} className={styles.tabContent}>{tab.content}</div>)}
  </>
}
