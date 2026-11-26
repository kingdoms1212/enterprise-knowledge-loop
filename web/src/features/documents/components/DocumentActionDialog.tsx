import { useRef, useState } from 'react'
import { z } from 'zod'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { Dialog } from '../../../common/components/Dialog'
import { Notice } from '../../../common/components/Feedback'
import { FormField, Textarea, TextInput } from '../../../common/components/Fields'
import type { Session } from '../../session/api/sessionApi'
import type { DocumentCommand, DocumentSummary, DocumentVersion } from '../api/documentsApi'
import { documentFile } from '../model/documentFile'
import { useDocumentCommand } from '../model/documents'
import styles from './Documents.module.css'

export type DocumentAction = ({ type: 'version' | 'retire' } | { type: 'publish' | 'unpublish'; version: DocumentVersion })
  & { revision: number }

const labels = { version: '새 버전 올리기', publish: '게시', unpublish: '게시 회수', retire: '폐기' }
const reasonSchema = z.string().trim().min(1, '폐기 사유를 입력해 주세요.').max(2000, '사유는 2,000자까지 입력해 주세요.')

export function DocumentActionDialog({ session, document, action, onClose, onDone, onRefresh }: {
  session: Session; document: DocumentSummary; action: DocumentAction | null
  onClose: () => void; onDone: (type: DocumentAction['type']) => void; onRefresh: () => void
}) {
  const [working, setWorking] = useState(false)
  return <Dialog open={action !== null} title={action ? labels[action.type] : '문서 작업'}
    onClose={() => { if (!working) onClose() }}>
    {action && <ActionForm session={session} document={document} action={action} onBusy={setWorking}
      onDone={onDone} onClose={onClose} onRefresh={onRefresh} />}
  </Dialog>
}

function ActionForm({ session, document, action, onClose, onDone, onRefresh, onBusy }: {
  session: Session; document: DocumentSummary; action: DocumentAction; onClose: () => void
  onDone: (type: DocumentAction['type']) => void; onRefresh: () => void; onBusy: (working: boolean) => void
}) {
  const mutation = useDocumentCommand(session, document.id, action.revision)
  const [file, setFile] = useState<File>()
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [requestError, setRequestError] = useState('')
  const key = useRef<string | undefined>(undefined)
  const pending = mutation.isPending

  async function submit() {
    let command: DocumentCommand
    switch (action.type) {
      case 'version': {
        const result = documentFile.safeParse(file)
        if (!result.success) { setFieldError(result.error.issues[0].message); return }
        command = { type: 'version', file: result.data }
        break
      }
      case 'retire': {
        const result = reasonSchema.safeParse(reason)
        if (!result.success) { setFieldError(result.error.issues[0].message); return }
        command = { type: 'retire', reason: result.data }
        break
      }
      default: command = { type: action.type, version: action.version.id }
    }
    key.current ??= crypto.randomUUID()
    setRequestError('')
    onBusy(true)
    try {
      await mutation.mutateAsync({ command, key: key.current })
      onDone(action.type)
    } catch (error) {
      setRequestError(apiErrorMessage(error, '작업 조건이 바뀌었거나 같은 파일의 버전이 있습니다. 상세를 다시 조회해 주세요.'))
    } finally {
      onBusy(false)
    }
  }

  return <form className={styles.form} noValidate onSubmit={(event) => { event.preventDefault(); void submit() }}>
    <p className={styles.title}>{document.title}{'version' in action && ' · v' + action.version.versionNumber}</p>
    {action.type === 'version' && <FormField id="new-version-file" label="파일" required error={fieldError} hint="PDF, DOCX, TXT · 최대 10 MiB">
      {(props) => <TextInput {...props} type="file" accept=".pdf,.docx,.txt" disabled={pending} required
        onChange={(event) => { key.current = undefined; setFile(event.target.files?.[0]); setFieldError('') }} />}
    </FormField>}
    {action.type === 'publish' && <Notice>이 버전을 게시하고 색인 작업을 요청합니다.</Notice>}
    {action.type === 'unpublish' && <Notice>게시를 회수하면 이 버전을 검색할 수 없습니다.</Notice>}
    {action.type === 'retire' && <>
      <Notice tone="warning">문서가 목록과 검색에서 제외됩니다.</Notice>
      <FormField id="document-retirement-reason" label="폐기 사유" required error={fieldError}>
        {(props) => <Textarea {...props} maxLength={2000} value={reason} disabled={pending} required
          onChange={(event) => { setReason(event.target.value); setFieldError('') }} />}
      </FormField>
    </>}
    {requestError && <>
      <Notice tone="danger" announce>{requestError}</Notice>
      <Button onClick={onRefresh}>상세 다시 조회</Button>
    </>}
    <div className={styles.actions}>
      <Button disabled={pending} onClick={onClose}>취소</Button>
      <Button type="submit" variant={action.type === 'retire' ? 'danger' : 'primary'} busy={pending}>
        {labels[action.type]}
      </Button>
    </div>
  </form>
}
