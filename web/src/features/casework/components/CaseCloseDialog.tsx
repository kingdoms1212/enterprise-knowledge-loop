import { zodResolver } from '@hookform/resolvers/zod'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { Dialog } from '../../../common/components/Dialog'
import { Notice } from '../../../common/components/Feedback'
import { FormField, Select, Textarea, TextInput } from '../../../common/components/Fields'
import styles from '../../../common/components/Workspace.module.css'
import { uuidPattern } from '../../../common/utils/uuid'
import { departmentInboxApi } from '../../knowledge/api/departmentInboxApi'
import type { Session } from '../../session/api/sessionApi'
import { workspaceKey } from '../../session/model/session'
import type { CaseCloseInput, CaseDetail } from '../api/caseApi'
import { useCaseCommand } from '../model/casework'
import { closeLabels } from './CaseStatus'

const schema = z.object({
  type: z.enum(['RESOLVED', 'NO_REPLY_NEEDED', 'AI_REFERENCE']),
  note: z.string().trim().max(2000),
  result: z.enum(['SUCCESS', 'PARTIAL', 'FAIL']),
  summary: z.string().trim().max(20_000),
  referenceKind: z.enum(['document', 'knowledge']),
  version: z.string().trim(),
  referenceReason: z.string().trim().max(2000),
}).superRefine((value, context) => {
  if (value.type === 'NO_REPLY_NEEDED' && !value.note) {
    context.addIssue({ code: 'custom', path: ['note'], message: '종료 사유를 입력해 주세요.' })
  } else if (value.type === 'RESOLVED' && !value.summary) {
    context.addIssue({ code: 'custom', path: ['summary'], message: '처리 결과 요약을 입력해 주세요.' })
  } else if (value.type === 'AI_REFERENCE') {
    if (!uuidPattern.test(value.version)) {
      context.addIssue({ code: 'custom', path: ['version'], message: '게시된 버전의 ID를 입력해 주세요.' })
    }
    if (!value.referenceReason) {
      context.addIssue({ code: 'custom', path: ['referenceReason'], message: '적용 사유를 입력해 주세요.' })
    }
  }
})
type Values = z.infer<typeof schema>

export function CaseCloseDialog({ session, detail, onClose, onDone }: {
  session: Session; detail: CaseDetail; onClose: () => void; onDone: () => void
}) {
  const revision = useRef(detail.rowVersion)
  const previous = useRef<{ signature: string; key: string } | null>(null)
  const mutation = useCaseCommand(session, detail.work.id)
  const { control, register, handleSubmit, setError, setValue, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: {
      type: detail.decision ? 'RESOLVED' : 'NO_REPLY_NEEDED', note: '', result: 'SUCCESS', summary: '',
      referenceKind: 'knowledge', version: '', referenceReason: '',
    },
  })
  const type = useWatch({ control, name: 'type' })
  const referenceKind = useWatch({ control, name: 'referenceKind' })

  async function submit(values: Values) {
    const body: CaseCloseInput = { close_type: values.type, close_note: values.note || null, expected_version: revision.current }
    if (values.type === 'RESOLVED') body.outcome = { result: values.result, summary: values.summary }
    if (values.type === 'AI_REFERENCE') body.applied_reference = {
      ...(values.referenceKind === 'knowledge' ? { knowledge_version_id: values.version } : { document_version_id: values.version }),
      reason: values.referenceReason,
    }
    const signature = JSON.stringify(body)
    if (previous.current?.signature !== signature) previous.current = { signature, key: crypto.randomUUID() }
    try {
      await mutation.mutateAsync({ kind: 'close', body, key: previous.current.key })
      onDone()
    } catch (error) {
      setError('root', { message: apiErrorMessage(error, 'Case 상태가 변경되었거나 완료할 필수 협업 업무가 있습니다.') })
    }
  }

  return <Dialog open title="Case 종결" onClose={() => { if (!isSubmitting) onClose() }}>
    <form className={styles.form} noValidate onSubmit={handleSubmit(submit)}>
      <FormField id="close-type" label="종결 유형" required>
        {(props) => <Select {...props} {...register('type')}>
          <option value="RESOLVED" disabled={!detail.decision}>{closeLabels.RESOLVED}</option>
          <option value="NO_REPLY_NEEDED">{closeLabels.NO_REPLY_NEEDED}</option>
          <option value="AI_REFERENCE">{closeLabels.AI_REFERENCE}</option>
        </Select>}
      </FormField>
      {!detail.decision && <p className={styles.intro}>일반 종결에는 사람 결정 기록이 필요합니다.</p>}
      {type === 'RESOLVED' && <>
        <FormField id="case-result" label="처리 결과" required>
          {(props) => <Select {...props} {...register('result')}>
            <option value="SUCCESS">성공</option><option value="PARTIAL">부분 해결</option><option value="FAIL">실패</option>
          </Select>}
        </FormField>
        <FormField id="case-outcome" label="결과 요약" required error={errors.summary?.message}>
          {(props) => <Textarea {...props} {...register('summary')} required maxLength={20_000} />}
        </FormField>
      </>}
      {type === 'AI_REFERENCE' && <>
        <FormField id="reference-kind" label="참조 종류">
          {(props) => <Select {...props} {...register('referenceKind', {
            onChange: () => setValue('version', ''),
          })}><option value="knowledge">게시 지식</option><option value="document">게시 문서</option></Select>}
        </FormField>
        {referenceKind === 'knowledge' && <DeliveredReferencePicker session={session}
          onSelect={(version) => setValue('version', version, { shouldValidate: true })} />}
        <FormField id="reference-version" label="게시 버전 ID" required error={errors.version?.message}>
          {(props) => <TextInput {...props} {...register('version')} required />}
        </FormField>
        <FormField id="reference-reason" label="적용 사유" required error={errors.referenceReason?.message}>
          {(props) => <Textarea {...props} {...register('referenceReason')} required maxLength={2000} />}
        </FormField>
      </>}
      <FormField id="case-close-note" label={type === 'NO_REPLY_NEEDED' ? '종료 사유' : '종결 메모'}
        required={type === 'NO_REPLY_NEEDED'} error={errors.note?.message}>
        {(props) => <Textarea {...props} {...register('note')} required={type === 'NO_REPLY_NEEDED'} maxLength={2000} />}
      </FormField>
      {errors.root?.message && <Notice tone="danger" announce>{errors.root.message}</Notice>}
      <div className={styles.formActions}><Button onClick={onClose} disabled={isSubmitting}>취소</Button>
        <Button type="submit" variant="primary" busy={isSubmitting}>종결 확정</Button></div>
    </form>
  </Dialog>
}

function DeliveredReferencePicker({ session, onSelect }: { session: Session; onSelect: (version: string) => void }) {
  const query = useInfiniteQuery({
    queryKey: [...workspaceKey(session), 'department-inbox'],
    queryFn: ({ pageParam, signal }) => departmentInboxApi.list(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
  const items = query.isError ? [] : query.data?.pages.flatMap((page) => page.items) ?? []
  return <>
    {items.length > 0 && <FormField id="delivered-reference" label="부서 지식함에서 선택">
      {(props) => <Select {...props} defaultValue="" onChange={(event) => onSelect(event.target.value)}>
        <option value="">게시 지식 선택</option>
        {items.map((item) => <option key={item.id} value={item.versionId}>{item.title} · v{item.versionNumber}</option>)}
      </Select>}
    </FormField>}
    {!query.isError && query.hasNextPage && <div><Button busy={query.isFetchingNextPage}
      onClick={() => query.fetchNextPage()}>지식 더 보기</Button></div>}
  </>
}
