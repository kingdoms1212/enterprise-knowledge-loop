import { zodResolver } from '@hookform/resolvers/zod'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { Dialog } from '../../../common/components/Dialog'
import { Notice } from '../../../common/components/Feedback'
import { FormField, Select, Textarea, TextInput } from '../../../common/components/Fields'
import styles from '../../../common/components/Workspace.module.css'
import type { Session } from '../../session/api/sessionApi'
import type { VoiceDetail } from '../api/voiceApi'
import { useVoiceTriage } from '../model/voice'

const schema = z.object({
  type: z.enum(['INQUIRY', 'COMPLAINT', 'REQUEST', 'PROPOSAL', 'OTHER']),
  urgency: z.enum(['NORMAL', 'HIGH', 'URGENT']),
  reason: z.string().trim().max(2000),
})
type Values = z.infer<typeof schema>

export function VoiceTriageDialog({ session, detail, department, onClose, onDone }: {
  session: Session; detail: VoiceDetail; department: { id: string; name: string }
  onClose: () => void; onDone: (id: string) => void
}) {
  const mutation = useVoiceTriage(session, detail.voice.id)
  const revision = useRef(detail.rowVersion)
  const previous = useRef<{ signature: string; key: string } | null>(null)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: { type: 'INQUIRY', urgency: 'NORMAL', reason: '' },
  })

  async function submit(values: Values) {
    const body = { type_final: values.type, urgency_final: values.urgency,
      primary_department_id: department.id, handler_id: session.accountId,
      override_reason: values.reason || null, expected_version: revision.current }
    const signature = JSON.stringify(body)
    if (previous.current?.signature !== signature) previous.current = { signature, key: crypto.randomUUID() }
    try {
      const result = await mutation.mutateAsync({ body, key: previous.current.key })
      onDone(result.case_id)
    } catch (error) {
      setError('root', { message: apiErrorMessage(error, '분류 상태가 변경되었습니다. VOC를 다시 열어 확인해 주세요.') })
    }
  }

  return <Dialog open title="분류 확정 및 Case 만들기" onClose={() => { if (!isSubmitting) onClose() }}>
    <form className={styles.form} noValidate onSubmit={handleSubmit(submit)}>
      <p>{detail.voice.title ?? 'VOC'}</p>
      <FormField id="triage-type" label="유형" required error={errors.type?.message}>
        {(props) => <Select {...props} {...register('type')}>
          <option value="INQUIRY">문의</option><option value="COMPLAINT">불만</option><option value="REQUEST">요청</option>
          <option value="PROPOSAL">제안</option><option value="OTHER">기타</option>
        </Select>}
      </FormField>
      <FormField id="triage-urgency" label="긴급도" required error={errors.urgency?.message}>
        {(props) => <Select {...props} {...register('urgency')}>
          <option value="NORMAL">일반</option><option value="HIGH">높음</option><option value="URGENT">긴급</option>
        </Select>}
      </FormField>
      <FormField id="triage-handler" label="담당 부서·담당자">
        {(props) => <TextInput {...props} value={department.name + ' · ' + session.displayName} readOnly />}
      </FormField>
      <FormField id="triage-reason" label="변경 사유" hint="AI 제안과 다르게 확정할 때 사유를 입력해 주세요." error={errors.reason?.message}>
        {(props) => <Textarea {...props} {...register('reason')} maxLength={2000} />}
      </FormField>
      {errors.root?.message && <Notice tone="danger" announce>{errors.root.message}</Notice>}
      <div className={styles.formActions}>
        <Button disabled={isSubmitting} onClick={onClose}>취소</Button>
        <Button variant="primary" type="submit" busy={isSubmitting}>Case 만들기</Button>
      </div>
    </form>
  </Dialog>
}
