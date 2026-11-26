import type { ButtonHTMLAttributes } from 'react'
import styles from './Controls.module.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
  busy?: boolean
  busyLabel?: string
}

export function Button({
  variant = 'secondary', type = 'button', busy = false, busyLabel = '처리 중',
  disabled, children, className = '', ...props
}: ButtonProps) {
  return (
    <button {...props} type={type} disabled={disabled || busy} aria-busy={busy || undefined}
      className={[styles.button, variant === 'secondary' ? '' : styles[variant], className].join(' ')}>
      {busy ? busyLabel : children}
    </button>
  )
}
