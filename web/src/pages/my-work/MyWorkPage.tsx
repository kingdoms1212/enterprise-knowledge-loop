import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../common/api/client'
import { Button } from '../../common/components/Button'
import { EmptyState, LoadingState, Notice } from '../../common/components/Feedback'
import { TextInput } from '../../common/components/Fields'
import { Table } from '../../common/components/Table'
import { formatDateTime } from '../../common/utils/dateTime'
import { CaseStatus } from '../../features/casework/components/CaseStatus'
import { useCaseQueue } from '../../features/casework/model/casework'
import type { Session } from '../../features/session/api/sessionApi'
import { useSession } from '../../features/session/model/session'
import { VoiceStatus } from '../../features/voice/components/VoiceStatus'
import { useVoiceQueue } from '../../features/voice/model/voice'
import styles from './MyWorkPage.module.css'

const sections = [
  { id: 'intake', label: '분류 전', description: '접수된 문의와 정제 상태를 확인합니다.' },
  { id: 'active', label: '진행 중', description: '결정과 조치 결과를 기록합니다.' },
  { id: 'closed', label: '처리 완료', description: '종결한 업무와 그 결과를 확인합니다.' },
] as const

type Section = typeof sections[number]['id']
type Row = { id: string; title: string; timestamp: string; state: string | null; section: Section }

export function MyWorkPage() {
  const { data: session } = useSession()
  return session ? <WorkOverview session={session} /> : null
}

function WorkOverview({ session }: { session: Session }) {
  const voices = useVoiceQueue(session)
  const cases = useCaseQueue(session)
  const [section, setSection] = useState<Section | 'all'>('all')
  const [query, setQuery] = useState('')
  const pending = voices.isPending || cases.isPending
  const error = voices.error ?? cases.error
  const hasMore = voices.hasNextPage || cases.hasNextPage
  const rows: Row[] = [
    ...(voices.data?.pages.flatMap((page) => page.items) ?? []).filter((item) => item.triageStatus !== 'TRIAGED')
      .map((item) => ({ id: item.id, title: item.title ?? '제목 없는 VOC', timestamp: item.receivedAt,
        state: item.triageStatus, section: 'intake' as const })),
    ...(cases.data?.pages.flatMap((page) => page.items) ?? []).map((item) => ({
      id: item.id, title: item.title, timestamp: item.createdAt,
      state: item.state, section: item.state === 'CLOSED' ? 'closed' as const : 'active' as const,
    })),
  ]
  rows.sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp))
  const visible = rows.filter((row) => (section === 'all' || row.section === section)
    && row.title.toLowerCase().includes(query.trim().toLowerCase()))

  return <div className={styles.page}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>WORKSPACE / VOC</p><h1>오늘 처리할 VOC</h1>
        <p className={styles.intro}>접수된 문의를 해결하고, 다시 쓸 수 있는 경험을 지식으로 남깁니다.</p></div>
      <Link className={styles.primaryAction} to="/voices">VOC 수신함</Link>
    </header>
    <section className={styles.summary} aria-label="VOC 업무 상태">
      {sections.map(({ id, label, description }) => <button key={id} type="button"
        aria-pressed={section === id} onClick={() => setSection(section === id ? 'all' : id)}>
        <strong>{label}</strong>
        <span>{pending || error ? '–' : rows.filter((row) => row.section === id).length}
          <small>{hasMore ? '불러온 건' : '건'}</small></span>
        <p>{description}</p>
      </button>)}
    </section>
    <div className={styles.columns}>
      <section className={styles.panel} aria-labelledby="work-queue">
        <header className={styles.panelHeading}><h2 id="work-queue">내 업무 목록</h2><p>현재 업무 소속 기준</p></header>
        <div className={styles.filters}>
          <div role="group" aria-label="업무 상태 필터">
            <Button aria-pressed={section === 'all'} onClick={() => setSection('all')}>전체</Button>
            {sections.map(({ id, label }) => <Button key={id} aria-pressed={section === id}
              onClick={() => setSection(id)}>{label}</Button>)}
          </div>
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)}
            aria-label="불러온 업무 제목 검색" placeholder="업무 제목 검색" type="search" />
        </div>
        {pending && <div className={styles.content}><LoadingState label="내 업무 불러오는 중" /></div>}
        {error && <div className={styles.content}><Notice tone="danger">{apiErrorMessage(error)}</Notice>
          <Button onClick={() => { if (voices.error) void voices.refetch(); if (cases.error) void cases.refetch() }}>다시 조회</Button></div>}
        {!pending && !error && !visible.length && <div className={styles.content}><EmptyState
          title="표시할 업무가 없습니다." description="VOC 수신함을 확인하거나 다른 상태를 선택해 주세요." /></div>}
        {!!visible.length && <div className={styles.rows}><Table label="내 업무" rows={visible}
          rowKey={(row) => row.id} columns={[
            { key: 'title', heading: '문의 / 등록 시각', cell: (row) => <><strong>{row.title}</strong>
              <small>{formatDateTime(row.timestamp)}</small></> },
            { key: 'state', heading: 'VOC 처리 상태', cell: (row) => row.section === 'intake'
              ? <VoiceStatus value={row.state} /> : <CaseStatus value={row.state ?? ''} /> },
            { key: 'action', heading: '작업', cell: (row) => <Link className={styles.outlineAction}
              aria-label={row.title + (row.section === 'active' ? ' 이어 처리' : ' 확인')}
              to={row.section === 'intake' ? '/voices?voice=' + encodeURIComponent(row.id) : '/cases?case=' + encodeURIComponent(row.id)}>
              {row.section === 'active' ? '이어 처리' : '확인'}
            </Link> },
          ]} /></div>}
        <footer className={styles.panelFooter}>
          <Link to="/cases">VOC 처리 목록</Link>
          {hasMore && <Button busy={voices.isFetchingNextPage || cases.isFetchingNextPage} onClick={() => {
            if (voices.hasNextPage) void voices.fetchNextPage()
            if (cases.hasNextPage) void cases.fetchNextPage()
          }}>업무 더 보기</Button>}
        </footer>
      </section>
      <aside className={styles.panel} aria-labelledby="work-knowledge">
        <header className={styles.panelHeading}><h2 id="work-knowledge">해결 경험을 지식으로</h2></header>
        <div className={styles.content}>
          <p>업무에 필요한 근거와 기존 자료는 문서함에서 확인할 수 있습니다.</p>
          <Link className={styles.outlineAction} to="/documents">문서함</Link>
        </div>
      </aside>
    </div>
  </div>
}
