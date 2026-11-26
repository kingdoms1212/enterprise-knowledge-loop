import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage, isAuthenticationError } from '../../common/api/client'
import { Brand } from '../../common/components/Brand'
import { Button } from '../../common/components/Button'
import { EmptyState, LoadingState, Notice } from '../../common/components/Feedback'
import type { Session } from '../../features/session/api/sessionApi'
import { useAssignments, useSession, useSessionActions } from '../../features/session/model/session'
import styles from '../AuthPages.module.css'

export function AssignmentSelectionPage() {
  const { data: session } = useSession()
  if (!session) return null
  return <AssignmentSelection key={session.contextRevision} session={session} />
}

function AssignmentSelection({ session }: { session: Session }) {
  const assignments = useAssignments(session)
  const actions = useSessionActions()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(session.assignmentId ?? '')
  const [operation, setOperation] = useState<'select' | 'logout' | null>(null)
  const [error, setError] = useState('')

  async function select() {
    if (!selected) return
    setOperation('select')
    setError('')
    try {
      await actions.selectAssignment(selected, session)
      navigate('/work', { replace: true })
    } catch (error) {
      setError(apiErrorMessage(error, '업무 소속이 먼저 변경되었습니다. 현재 소속을 다시 확인해 주세요.'))
    } finally {
      setOperation(null)
    }
  }

  async function logout() {
    setOperation('logout')
    setError('')
    try {
      await actions.logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setError(apiErrorMessage(error))
    } finally {
      setOperation(null)
    }
  }

  return <main className={styles.screen}>
    <section className={styles.assignment} aria-labelledby="assignment-title">
      <Brand />
      <header><h1 id="assignment-title">업무 소속 선택</h1><p className={styles.description}>{session.displayName} 님이 이번 세션에서 사용할 소속을 선택해 주세요.</p></header>
      {assignments.isPending && <LoadingState label="업무 소속 조회 중" />}
      {assignments.isError && <Notice tone="danger" announce>{apiErrorMessage(assignments.error)}</Notice>}
      {assignments.isError && <Button onClick={() => isAuthenticationError(assignments.error) ? actions.refresh() : assignments.refetch()}>다시 조회</Button>}
      {assignments.isSuccess && assignments.data.length === 0 && <EmptyState title="선택할 수 있는 업무 소속이 없습니다." description="발령 상태를 조직 관리자에게 확인해 주세요." />}
      {!!assignments.data?.length && <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void select() }}>
        <fieldset className={styles.options} disabled={operation !== null}>
          <legend>유효한 발령</legend>
          {assignments.data.map((assignment) => <label className={styles.option} key={assignment.id}>
            <input type="radio" name="assignment" value={assignment.id} checked={selected === assignment.id} onChange={() => setSelected(assignment.id)} required />
            <span>{assignment.departmentName}</span><small>{assignment.assignmentType === 'PRIMARY' ? '본직' : '겸직'}</small>
          </label>)}
        </fieldset>
        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={!selected || operation !== null} busy={operation === 'select'}
            busyLabel="소속 확인 중" aria-describedby={!selected ? 'assignment-note' : undefined}>선택한 소속으로 시작</Button>
          {!selected && <small id="assignment-note">유효한 발령을 선택해 주세요.</small>}
        </div>
      </form>}
      {error && <Notice tone="danger" announce>{error}</Notice>}
      <div className={styles.actions}>
        {session.assignmentId && <Button disabled={operation !== null} onClick={() => navigate('/work')}>업무로 돌아가기</Button>}
        <Button busy={operation === 'logout'} disabled={operation !== null} onClick={logout}>로그아웃</Button>
      </div>
    </section>
  </main>
}
