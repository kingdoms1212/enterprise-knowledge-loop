import { useState } from 'react'
import { Columns3, Layers3, Palette, Type } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../../common/components/Brand'
import { Button } from '../../common/components/Button'
import { Dialog } from '../../common/components/Dialog'
import { Badge, EmptyState, LoadingState, Notice } from '../../common/components/Feedback'
import { Checkbox, FormField, Select, Textarea, TextInput } from '../../common/components/Fields'
import { Table } from '../../common/components/Table'
import { Tabs } from '../../common/components/Tabs'
import styles from './StyleGuidePage.module.css'

const colors = [
  { label: '기본 동작', token: '--color-primary', hex: '#087B5A' },
  { label: '선택 배경', token: '--color-selected', hex: '#EAF6F0' },
  { label: '본문 글자', token: '--color-ink', hex: '#0F2A43' },
  { label: '업무 배경', token: '--color-bg', hex: '#F4F7F8' },
  { label: '입력 표면', token: '--color-surface', hex: '#FFFFFF' },
  { label: '구분선', token: '--color-line', hex: '#DDE6EE' },
]

const samples = [
  { id: 'one', title: '운영 업무 매뉴얼', version: 'v2', status: 'complete' },
  { id: 'two', title: '장애 대응 절차', version: 'v1', status: 'pending' },
]

const spacingExamples = [
  { label: '4', token: '--space-1' }, { label: '8', token: '--space-2' },
  { label: '12', token: '--space-3' }, { label: '16', token: '--space-4' },
  { label: '24', token: '--space-6' }, { label: '32', token: '--space-8' },
]

const sections = [
  { id: 'foundation', label: '디자인 토큰', icon: Palette },
  { id: 'controls', label: '버튼과 입력', icon: Type },
  { id: 'feedback', label: '상태와 안내', icon: Layers3 },
  { id: 'patterns', label: '화면 조합', icon: Columns3 },
]

export function StyleGuidePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tab, setTab] = useState('list')

  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <Brand />
      <nav aria-label="가이드 목차" className={styles.navigation}>
        {sections.map(({ id, label, icon: Icon }) => <a key={id} href={'#' + id}><Icon size={17} aria-hidden="true" />{label}</a>)}
      </nav>
      <Link to="/work" className={styles.loginLink}>업무 화면 보기</Link>
    </aside>
    <main className={styles.main}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Enterprise Knowledge Loop</p>
        <h1>UI 스타일 가이드</h1>
        <p>프로토타입의 색상과 화면 배치를 기준으로, EKL React 화면이 함께 쓰는 구성 요소입니다.</p>
      </header>

      <section className={styles.section} id="foundation" aria-labelledby="foundation-title">
        <header className={styles.heading}><h2 id="foundation-title">디자인 토큰</h2></header>
        <div className={styles.palette}>
          {colors.map(({ label, token, hex }) => <div className={styles.swatch} key={token}>
            <div className={styles.paint} style={{ backgroundColor: 'var(' + token + ')' }} />
            <div className={styles.swatchLabel}><strong>{label}</strong><code>{hex}</code></div>
          </div>)}
        </div>
        <div className={styles.columns}>
          <div className={styles.specimen}>
            <h3>글꼴과 위계</h3>
            <p className={styles.titleSample}>문서와 지식</p>
            <p>문서를 등록하고 버전과 처리 상태를 확인합니다.</p>
            <p className={styles.metadata}>맑은 고딕 (Malgun Gothic) · 기본 본문 14px</p>
          </div>
          <div className={styles.specimen}>
            <h3>기본 간격</h3>
            <div className={styles.spacing}>
              {spacingExamples.map(({ label, token }) => <div key={token}><span style={{ width: 'var(' + token + ')' }} /><code>{label} px</code></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="controls" aria-labelledby="controls-title">
        <header className={styles.heading}><h2 id="controls-title">버튼과 입력</h2></header>
        <div className={styles.columns}>
          <div className={styles.specimen}>
            <h3>Button</h3>
            <div className={styles.chips}>
              <Button variant="primary" onClick={() => setDialogOpen(true)}>문서 등록</Button>
              <Button onClick={() => setDialogOpen(true)}>자세히 보기</Button>
              <Button variant="danger" onClick={() => setDialogOpen(true)}>폐기</Button>
              <Button busy busyLabel="등록 중">등록</Button>
            </div>
            <div className={styles.disabledSample}>
              <Button disabled aria-describedby="disabled-explanation">게시</Button>
              <small id="disabled-explanation">파싱이 끝나면 게시할 수 있습니다.</small>
            </div>
          </div>
          <div className={styles.specimen}>
            <h3>FormField · TextInput · Select</h3>
            <FormField id="guide-title" label="문서 제목" required hint="목록에 표시될 이름을 입력합니다.">
              {(props) => <TextInput {...props} placeholder="예: 운영 업무 매뉴얼" required />}
            </FormField>
            <FormField id="guide-security" label="보안 등급">
              {(props) => <Select {...props} defaultValue="internal"><option value="internal">사내</option><option value="restricted">제한</option></Select>}
            </FormField>
            <FormField id="guide-reason" label="변경 사유" error="변경 사유를 입력해 주세요." required>
              {(props) => <Textarea {...props} required />}
            </FormField>
            <Checkbox label="수신 확인을 요청합니다." />
          </div>
        </div>
      </section>

      <section className={styles.section} id="feedback" aria-labelledby="feedback-title">
        <header className={styles.heading}><h2 id="feedback-title">상태와 안내</h2></header>
        <div className={styles.columns}>
          <div className={styles.specimen}>
            <h3>Badge · Notice</h3>
            <div className={styles.chips}>
              <Badge>파싱 대기</Badge><Badge tone="success">파싱 완료</Badge><Badge tone="warning">OCR 필요</Badge>
              <Badge tone="danger">처리 실패</Badge><Badge tone="ai">AI 제안</Badge>
            </div>
            <Notice tone="warning" title="다른 변경이 반영되었습니다.">최신 문서를 다시 조회한 뒤 변경사항을 확인해 주세요.</Notice>
          </div>
          <div className={styles.specimen}>
            <h3>EmptyState · LoadingState</h3>
            <div className={styles.previewBox}><EmptyState title="선택한 문서가 없습니다." description="목록에서 문서를 선택해 주세요." /></div>
            <div className={styles.previewBox}><LoadingState label="문서 목록 조회 중" /></div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="patterns" aria-labelledby="patterns-title">
        <header className={styles.heading}><h2 id="patterns-title">화면 조합</h2></header>
        <div className={styles.pattern}>
          <Tabs label="문서 영역 예시" selected={tab} onSelect={setTab} tabs={[
            { id: 'list', label: '문서 목록', content: <Table label="문서 목록 예시" rows={samples} rowKey={(row) => row.id}
                columns={[
                  { key: 'title', heading: '이름', cell: (row) => row.title },
                  { key: 'version', heading: '버전', cell: (row) => row.version },
                  { key: 'status', heading: '처리 상태', cell: (row) => row.status === 'complete'
                    ? <Badge tone="success">파싱 완료</Badge> : <Badge>파싱 대기</Badge> },
                ]} /> },
            { id: 'dialog', label: '다이얼로그', content: <div className={styles.dialogPreview}>
              <p>열기, Escape 닫기, 포커스 복귀를 확인할 수 있습니다.</p>
              <Button onClick={() => setDialogOpen(true)}>다이얼로그 열기</Button>
            </div> },
          ]} />
        </div>
      </section>
    </main>
    <Dialog open={dialogOpen} title="문서 등록 예시" onClose={() => setDialogOpen(false)}>
      <div className={styles.dialogPreview}>
        <FormField id="dialog-sample-title" label="문서 제목">{(props) => <TextInput {...props} />}</FormField>
        <Button onClick={() => setDialogOpen(false)}>닫기</Button>
      </div>
    </Dialog>
  </div>
}
