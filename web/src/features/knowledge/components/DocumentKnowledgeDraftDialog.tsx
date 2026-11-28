import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { Dialog } from '../../../common/components/Dialog'
import { Badge, Notice } from '../../../common/components/Feedback'
import { FormField, Select, Textarea, TextInput } from '../../../common/components/Fields'
import styles from '../../../common/components/Workspace.module.css'
import type { DocumentVersion } from '../../documents/api/documentsApi'
import { knowledgeDraftApi, type SavedDraft } from '../api/knowledgeDraftApi'

const schema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요.').max(255),
  kind: z.enum(['REFERENCE', 'SOLUTION', 'LESSON']),
  locator: z.string().trim().min(1, '근거 위치를 입력해 주세요.').max(2000),
  body: z.string().trim().min(1, '초안 본문을 입력해 주세요.').max(100_000),
})
type Values = z.infer<typeof schema>

export function DocumentKnowledgeDraftDialog({ title, source, onClose }: {
  title: string; source: DocumentVersion; onClose: () => void
}) {
  const [draft, setDraft] = useState<SavedDraft | null>(null)
  const [message, setMessage] = useState('')
  const attempt = useRef<{ signature: string; key: string } | null>(null)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title, kind: 'REFERENCE', locator: '', body: '' },
  })

  async function save(values: Values) {
    setMessage('')
    try {
      if (draft) {
        const result = await knowledgeDraftApi.edit(draft, values.body)
        setDraft({ ...draft, ...result })
        setMessage('초안 본문을 저장했습니다.')
        return
      }
      const input = {
        title: values.title, kind: values.kind, body: values.body,
        source_refs: [{ source_role: 'PRIMARY' as const, document_version_id: source.id, source_locator: values.locator }],
      }
      const signature = JSON.stringify(input)
      if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() }
      setDraft(await knowledgeDraftApi.create(input, attempt.current.key))
      setMessage('지식 초안을 저장했습니다.')
    } catch (error) {
      setError('root', { message: apiErrorMessage(error, '문서 또는 초안 상태가 변경되었습니다. 문서함에서 다시 확인해 주세요.') })
    }
  }

  return <Dialog open title="지식 초안 작성" onClose={() => { if (!isSubmitting) onClose() }}>
    <form className={styles.form} noValidate onSubmit={handleSubmit(save)}>
      <div>
        <Badge>주 근거</Badge> <strong>{title} · v{source.versionNumber}</strong>
      </div>
      <FormField id="draft-title" label="제목" required error={errors.title?.message}>
        {(props) => <TextInput {...props} {...register('title')} maxLength={255} readOnly={Boolean(draft)} />}
      </FormField>
      <FormField id="draft-kind" label="지식 유형" required error={errors.kind?.message}>
        {(props) => <Select {...props} {...register('kind')} disabled={Boolean(draft)}>
          <option value="REFERENCE">참고 자료</option>
          <option value="SOLUTION">해결 방법</option>
          <option value="LESSON">교훈</option>
        </Select>}
      </FormField>
      <FormField id="draft-locator" label="근거 위치" required error={errors.locator?.message}>
        {(props) => <TextInput {...props} {...register('locator')} maxLength={2000} readOnly={Boolean(draft)}
          placeholder="예시 4쪽, 검색 지연 점검 절차" />}
      </FormField>
      <FormField id="draft-body" label="초안 본문" required error={errors.body?.message}>
        {(props) => <Textarea {...props} {...register('body')} maxLength={100_000} />}
      </FormField>
      {message && <Notice tone="success" announce>{message}</Notice>}
      {errors.root?.message && <Notice tone="danger" announce>{errors.root.message}</Notice>}
      <div className={styles.formActions}>
        {draft && <Link to={'/knowledge?version=' + encodeURIComponent(draft.version_id)}>저장한 초안 열기</Link>}
        <Button disabled={isSubmitting} onClick={onClose}>{draft ? '닫기' : '취소'}</Button>
        <Button type="submit" variant="primary" busy={isSubmitting}>{draft ? '본문 저장' : '초안 저장'}</Button>
      </div>
    </form>
  </Dialog>
}
