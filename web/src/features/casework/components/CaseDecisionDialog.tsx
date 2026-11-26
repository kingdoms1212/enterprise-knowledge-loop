import { zodResolver } from '@hookform/resolvers/zod'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { Dialog } from '../../../common/components/Dialog'
import { Notice } from '../../../common/components/Feedback'
import { FormField, Textarea } from '../../../common/components/Fields'
import styles from '../../../common/components/Workspace.module.css'
import type { Session } from '../../session/api/sessionApi'
import type { CaseDetail } from '../api/caseApi'
import { useCaseCommand } from '../model/casework'

const schema = z.object({
  decision: z.string().trim().min(1, '결정 내용을 입력해 주세요.').max(20_000),
  reason: z.string().trim().min(1, '결정 사유를 입력해 주세요.').max(2000),
})
type Values = z.infer<typeof schema>

export function CaseDecisionDialog({ session, detail, onClose, onDone }: {
  session: Session; detail: CaseDetail; onClose: () => void; onDone: () => void
}) {
  const revision = useRef(detail.rowVersion)
  const mutation = useCaseCommand(session, detail.work.id)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: {
      decision: detail.decision?.description ?? '', reason: detail.decision?.reason ?? '',
    },
  })

  async function submit(values: Values) {
    try {
      await mutation.mutateAsync({ kind: 'decide', body: { ...values, expected_version: revision.current } })
      onDone()
    } catch (error) {
      setError('root', { message: apiErrorMessage(error, 'Case 상태가 변경되었습니다. 상세를 닫고 다시 확인해 주세요.') })
    }
  }

  return <Dialog open title="사람 결정 기록" onClose={() => { if (!isSubmitting) onClose() }}>
    <form className={styles.form} noValidate onSubmit={handleSubmit(submit)}>
      <FormField id="case-decision" label="결정 내용" required error={errors.decision?.message}>
        {(props) => <Textarea {...props} {...register('decision')} required maxLength={20_000} />}
      </FormField>
      <FormField id="case-decision-reason" label="결정 사유" required error={errors.reason?.message}>
        {(props) => <Textarea {...props} {...register('reason')} required maxLength={2000} />}
      </FormField>
      {errors.root?.message && <Notice tone="danger" announce>{errors.root.message}</Notice>}
      <div className={styles.formActions}><Button onClick={onClose} disabled={isSubmitting}>취소</Button>
        <Button type="submit" variant="primary" busy={isSubmitting}>결정 저장</Button></div>
    </form>
  </Dialog>
}
