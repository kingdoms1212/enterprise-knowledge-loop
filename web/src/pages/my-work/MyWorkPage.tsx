import { ClipboardList, Files, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'
import styles from './MyWorkPage.module.css'

export function MyWorkPage() {
  return <div className={styles.page}>
    <header><h1>내 업무</h1><p>문서와 업무 관련 지식을 관리하는 공간입니다.</p></header>
    <div className={styles.entries}>
      <Link to="/voices" className={styles.entry}>
        <Inbox size={22} aria-hidden="true" />
        <span><strong>VOC 접수·분류</strong><small>접수 현황 확인과 새 Case 분류</small></span>
      </Link>
      <Link to="/cases" className={styles.entry}>
        <ClipboardList size={22} aria-hidden="true" />
        <span><strong>Case 작업 공간</strong><small>사람 결정과 처리 결과 기록</small></span>
      </Link>
      <Link to="/documents" className={styles.entry}>
        <Files size={22} aria-hidden="true" />
        <span><strong>문서함</strong><small>문서 등록, 버전 및 처리 상태 확인</small></span>
      </Link>
    </div>
  </div>
}
