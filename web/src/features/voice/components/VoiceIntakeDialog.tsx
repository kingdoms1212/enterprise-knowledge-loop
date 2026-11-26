import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { Dialog } from '../../../common/components/Dialog'
import { Notice } from '../../../common/components/Feedback'
import { FormField, Textarea, TextInput } from '../../../common/components/Fields'
import styles from '../../../common/components/Workspace.module.css'
import { localDateTime } from '../../../common/utils/dateTime'
import type { Session } from '../../session/api/sessionApi'
import { useVoiceIntake } from '../model/voice'

const schema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요.').max(255),
  body: z.string().refine((value) => value.trim().length > 0, 'VOC 원문을 입력해 주세요.').refine((value) => value.length <= 100_000),
  product: z.string().trim().min(1, '제품 또는 서비스 코드를 입력해 주세요.').max(120),
  received: z.string().min(1, '접수 시각을 입력해 주세요.').refine((value) => !Number.isNaN(new Date(value).getTime()), '접수 시각을 확인해 주세요.'),
})
type Values = z.infer<typeof schema>

export function VoiceIntakeDialog({ session, department, onClose, onDone }: {
  session: Session; department: { id: string; name: string }; onClose: () => void; onDone: (id: string) => void
}) {
  const mutation = useVoiceIntake(session)
  const initialTimestamp = useState(localDateTime)[0]
  const key = useRef<{ values: string; id: string } | null>(null)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: { title: '', body: '', product: '', received: initialTimestamp },
  })

  async function submit(values: Values) {
    const payload = { title: values.title, body: values.body, product_code: values.product,
      received_department_id: department.id, received_at: new Date(values.received).toISOString() }
    const signature = JSON.stringify(payload)
    if (key.current?.values !== signature) key.current = { values: signature, id: crypto.randomUUID() }
    try {
      const result = await mutation.mutateAsync({ body: payload, key: key.current.id })
      onDone(result.voice_id)
    } catch (error) {
      setError('root', { message: apiErrorMessage(error, '같은 내용이 이미 접수되었거나 접수 정책이 적용되지 않았습니다.') })
    }
  }

  return <Dialog open title="새 VOC 접수" onClose={() => { if (!isSubmitting) onClose() }}>
    <form noValidate className={styles.form} onSubmit={handleSubmit(submit)}>
      <FormField id="voice-title" label="제목" required error={errors.title?.message}>
        {(props) => <TextInput {...props} {...register('title')} maxLength={255} required />}
      </FormField>
      <FormField id="voice-product" label="제품·서비스 코드" required error={errors.product?.message}>
        {(props) => <TextInput {...props} {...register('product')} maxLength={120} required />}
      </FormField>
      <FormField id="voice-department" label="접수 부서">
        {(props) => <TextInput {...props} value={department.name} readOnly />}
      </FormField>
      <FormField id="voice-received" label="접수 시각" required error={errors.received?.message}>
        {(props) => <TextInput {...props} {...register('received')} type="datetime-local" required />}
      </FormField>
      <FormField id="voice-body" label="VOC 원문" required error={errors.body?.message}>
        {(props) => <Textarea {...props} {...register('body')} maxLength={100_000} required />}
      </FormField>
      <Notice>접수된 원문은 정제 작업을 거칩니다.</Notice>
      {errors.root?.message && <Notice tone="danger" announce>{errors.root.message}</Notice>}
      <div className={styles.formActions}>
        <Button disabled={isSubmitting} onClick={onClose}>취소</Button>
        <Button type="submit" variant="primary" busy={isSubmitting} busyLabel="접수 중">접수</Button>
      </div>
    </form>
  </Dialog>
}
