import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import styles from './Surfaces.module.css'

export function Dialog({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode
}) {
  const element = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = element.current
    if (!open || !dialog || dialog.open) return
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [open])

  return (
    <dialog ref={element} aria-labelledby={titleId} className={styles.dialog}
      onCancel={(event) => { event.preventDefault(); onClose() }}>
      <header className={styles.head}>
        <h2 id={titleId}>{title}</h2>
        <Button aria-label="닫기" onClick={onClose}><X size={16} aria-hidden="true" /></Button>
      </header>
      <div className={styles.body}>{open ? children : null}</div>
    </dialog>
  )
}
