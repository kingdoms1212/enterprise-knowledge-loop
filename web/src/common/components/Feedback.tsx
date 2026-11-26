import { AlertCircle, CheckCircle2, Clock3, Info, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './Feedback.module.css'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'ai'
const statusIcon = { neutral: Clock3, info: Info, success: CheckCircle2, warning: AlertCircle, danger: AlertCircle, ai: Sparkles }

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const Icon = statusIcon[tone]
  return <span className={styles.badge + ' ' + styles[tone]}><Icon size={14} aria-hidden="true" />{children}</span>
}

export function Notice({ tone = 'info', title, children, announce = false }: {
  tone?: Tone; title?: string; children: ReactNode; announce?: boolean
}) {
  return (
    <div className={styles.notice + ' ' + styles[tone]} role={announce ? (tone === 'danger' ? 'alert' : 'status') : undefined}>
      {title && <strong>{title}</strong>}
      <p>{children}</p>
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className={styles.empty}><strong>{title}</strong><p>{description}</p>{action}</div>
}

export function LoadingState({ label }: { label: string }) {
  return <div className={styles.skeleton} role="status"><div className="visually-hidden">{label}</div>
    <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" /></div>
}
