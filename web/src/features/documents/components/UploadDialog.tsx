import { zodResolver } from '@hookform/resolvers/zod'
import { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { Dialog } from '../../../common/components/Dialog'
import { Notice } from '../../../common/components/Feedback'
import { FormField, Select, TextInput } from '../../../common/components/Fields'
import type { Session } from '../../session/api/sessionApi'
import { documentFile } from '../model/documentFile'
import { usePolicyPreview, useUploadDocument } from '../model/documents'
import styles from './Documents.module.css'

const uploadSchema = z.object({
  title: z.string().trim().min(1, '문서 제목을 입력해 주세요.').max(255, '제목은 255자까지 입력할 수 있습니다.'),
  classification: z.enum(['0', '1', '2', '3']),
  files: z.custom<FileList>((value) => value instanceof FileList, '파일을 선택해 주세요.')
    .superRefine((files, context) => {
      const result = documentFile.safeParse(files[0])
      if (!result.success) context.addIssue({ code: 'custom', message: result.error.issues[0].message })
    }),
})
type UploadValues = z.infer<typeof uploadSchema>

type UploadProps = { session: Session; department: { id: string; name: string }; folder: string;
  onClose: () => void; onUploaded: (id: string) => void }

export function UploadDialog({ open, ...props }: UploadProps & { open: boolean }) {
  return <Dialog open={open} title="문서 업로드" onClose={props.onClose}>
    <UploadForm {...props} />
  </Dialog>
}

function UploadForm({ session, department, folder, onClose, onUploaded }: UploadProps) {
  const mutation = useUploadDocument(session)
  const lastRequest = useRef<{ signature: string; file: File; key: string } | null>(null)
  const { control, register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { title: '', classification: '1' },
  })
  const classification = useWatch({ control, name: 'classification' })
  const preview = usePolicyPreview(session, department.id, Number(classification), folder)
  const ready = preview.isSuccess && !preview.isFetching

  async function upload(values: UploadValues) {
    if (!ready) return
    const file = values.files[0]
    const signature = JSON.stringify([values.title, values.classification, folder, department.id])
    if (lastRequest.current?.signature !== signature || lastRequest.current?.file !== file) {
      lastRequest.current = { signature, file, key: crypto.randomUUID() }
    }
    try {
      const result = await mutation.mutateAsync({
        key: lastRequest.current.key,
        input: { title: values.title, departmentId: department.id, classification: Number(values.classification), folderId: folder, file },
      })
      onUploaded(result.document_id)
    } catch (error) {
      setError('root', { message: apiErrorMessage(error, '등록 조건이 충돌했습니다. 폴더와 적용할 권한 정책을 확인해 주세요.') })
    }
  }

  return <form className={styles.form} noValidate onSubmit={handleSubmit(upload)}>
    <FormField label="파일" id="document-file" required hint="PDF, DOCX, TXT · 최대 10 MiB" error={errors.files?.message}>
      {(props) => <TextInput {...props} {...register('files')} type="file" accept=".pdf,.docx,.txt" required />}
    </FormField>
    <FormField label="제목" id="document-title" required error={errors.title?.message}>
      {(props) => <TextInput {...props} {...register('title')} maxLength={255} required />}
    </FormField>
    <FormField label="소유 부서" id="document-department">
      {(props) => <TextInput {...props} value={department.name} readOnly />}
    </FormField>
    <FormField label="보안 등급" id="document-classification" required error={errors.classification?.message}>
      {(props) => <Select {...props} {...register('classification')} required>
        <option value="0">0 · 공개</option><option value="1">1 · 사내</option>
        <option value="2">2 · 대외비</option><option value="3">3 · 제한</option>
      </Select>}
    </FormField>
    <section aria-labelledby="upload-preview-title" className={styles.preview}>
      <h3 id="upload-preview-title">적용될 권한 미리보기</h3>
      {preview.isFetching && <p role="status">적용될 권한을 확인하는 중입니다.</p>}
      {preview.isError && <>
        <Notice tone="warning" announce>{apiErrorMessage(preview.error, '적용할 문서 정책을 찾을 수 없습니다.')}</Notice>
        <Button onClick={() => preview.refetch()}>다시 확인</Button>
      </>}
      {ready && <>
        <strong>{preview.data.sourceName ?? '부서 기본 정책'}</strong>
        <p>{preview.data.origin === 'INHERITED' ? '폴더 권한 상속' : '템플릿 적용'}
          {' · '}{sharingLabels[preview.data.sharingScope] ?? '공유 범위 미지정'}</p>
        {preview.data.rules.length > 0 && <ul>
          {preview.data.rules.map(({ action, effect }) => <li key={action + effect}>
            {actionLabels[action] ?? action} {effect === 'DENY' ? '제외' : '허용'}
          </li>)}
        </ul>}
      </>}
    </section>
    <Notice>등록한 문서는 파싱 대기 상태로 표시됩니다.</Notice>
    {errors.root?.message && <Notice tone="danger" announce>{errors.root.message}</Notice>}
    <div className={styles.actions}>
      <Button onClick={onClose} disabled={isSubmitting}>취소</Button>
      <Button variant="primary" type="submit" disabled={!ready} busy={isSubmitting} busyLabel="등록 중"
        aria-describedby={!ready ? 'upload-preview-title' : undefined}>등록</Button>
    </div>
  </form>
}

const sharingLabels: Record<string, string> = { ORGANIZATION: '전사', DEPARTMENT: '부서', STAKEHOLDERS: '관계자' }
const actionLabels: Record<string, string> = {
  READ: '열람', SEARCH: '검색', DOWNLOAD: '다운로드', WRITE: '편집',
  DOCUMENT_UPLOAD: '업로드', DOCUMENT_MANAGE: '문서 관리', MANAGE_ACL: '권한 관리',
}
