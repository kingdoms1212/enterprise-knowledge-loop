import { ChevronDown } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import styles from './Controls.module.css'

type FieldControl = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }

export function FormField({ id, label, required, hint, error, children }: {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: (control: FieldControl) => ReactNode
}) {
  const describedBy = [hint && id + '-hint', error && id + '-error'].filter(Boolean).join(' ')
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}{required && <span aria-hidden="true" className={styles.required}>*</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy || undefined })}
      {hint && <span className={styles.message} id={id + '-hint'}>{hint}</span>}
      {error && <span role="alert" className={styles.message + ' ' + styles.error} id={id + '-error'}>{error}</span>}
    </div>
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={styles.control + ' ' + className} />
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={styles.selectWrap}>
      <select {...props} className={[styles.control, styles.select, className].join(' ')} />
      <ChevronDown size={16} aria-hidden="true" className={styles.chevron} />
    </span>
  )
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={[styles.control, styles.textarea, className].join(' ')} />
}

export function Checkbox({ label, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  return <label className={styles.checkbox}><input {...props} type="checkbox" /><span>{label}</span></label>
}
