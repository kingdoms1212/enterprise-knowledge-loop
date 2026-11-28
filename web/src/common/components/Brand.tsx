import { Cloud, Repeat2 } from 'lucide-react'
import styles from './Brand.module.css'

export function Brand() {
  return <div className={styles.brand}>
    <span className={styles.brandMark} aria-hidden="true"><Cloud size={25} /><Repeat2 size={13} /></span>
    <span><small className={styles.enterprise}>ENTERPRISE</small>Knowledge<br />Loop
      <small className={styles.workspace}>AI WORKSPACE</small></span>
  </div>
}
