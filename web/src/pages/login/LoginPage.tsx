import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiError, apiErrorMessage } from '../../common/api/client'
import { Brand } from '../../common/components/Brand'
import { Button } from '../../common/components/Button'
import { LoadingState, Notice } from '../../common/components/Feedback'
import { FormField, TextInput } from '../../common/components/Fields'
import { uuidPattern } from '../../common/utils/uuid'
import { useSession, useSessionActions } from '../../features/session/model/session'
import styles from '../AuthPages.module.css'

const credentialsSchema = z.object({
  organization_id: z.string().trim().regex(uuidPattern, '조직 ID를 UUID 형식으로 입력해 주세요.'),
  employee_number: z.string().trim().min(1, '사번을 입력해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
})

export function LoginPage() {
  const session = useSession()
  const actions = useSessionActions()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { organization_id: import.meta.env.VITE_ORGANIZATION_ID ?? '', employee_number: '', password: '' },
  })

  async function login(credentials: z.infer<typeof credentialsSchema>) {
    try {
      const context = await actions.login(credentials)
      navigate(context.assignmentId ? '/work' : '/assignments', { replace: true })
    } catch (error) {
      const message = error instanceof ApiError && error.status === 401
        ? '조직 ID, 사번과 비밀번호를 확인해 주세요.' : apiErrorMessage(error)
      setError('root', { message })
    }
  }

  if (session.data) return <Navigate replace to={session.data.assignmentId ? '/work' : '/assignments'} />

  return <main className={styles.screen}>
    <div className={styles.frame}>
      <div className={styles.brandPanel}>
        <Brand />
        <p>문서를 정리하고, 업무에서 확인한 지식을 부서와 공유합니다.</p>
      </div>
      <section className={styles.panel} aria-labelledby="login-title">
        <header><h1 id="login-title">사번 로그인</h1><p className={styles.description}>조직 계정의 정보로 접속해 주세요.</p></header>
        {session.isPending
          ? <LoadingState label="세션 확인 중" />
          : <form className={styles.form} noValidate onSubmit={handleSubmit(login)}>
              <FormField label="조직 ID" id="organization-id" required error={errors.organization_id?.message}>
                {(props) => <TextInput {...props} {...register('organization_id')} autoComplete="organization" required />}
              </FormField>
              <FormField label="사번" id="employee-number" required error={errors.employee_number?.message}>
                {(props) => <TextInput {...props} {...register('employee_number')} autoComplete="username" required />}
              </FormField>
              <FormField label="비밀번호" id="password" required error={errors.password?.message}>
                {(props) => <TextInput {...props} {...register('password')} type="password" autoComplete="current-password" required />}
              </FormField>
              {errors.root?.message && <Notice tone="danger" announce>{errors.root.message}</Notice>}
              <Button variant="primary" type="submit" busy={isSubmitting} busyLabel="로그인 중">로그인</Button>
            </form>}
      </section>
    </div>
    <div className={styles.footer}><Link to="/style-guide">스타일 가이드</Link></div>
  </main>
}
