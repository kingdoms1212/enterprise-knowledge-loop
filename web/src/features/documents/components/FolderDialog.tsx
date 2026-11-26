import { useRef, useState } from 'react'
import { z } from 'zod'
import { apiErrorMessage } from '../../../common/api/client'
import { Button } from '../../../common/components/Button'
import { Dialog } from '../../../common/components/Dialog'
import { Notice } from '../../../common/components/Feedback'
import { FormField, Select, TextInput } from '../../../common/components/Fields'
import type { Session } from '../../session/api/sessionApi'
import type { FolderCommand, FolderRow } from '../api/documentsApi'
import { useFolderCommand } from '../model/documents'
import styles from './Documents.module.css'

const names = z.string().trim().min(1, '폴더 이름을 입력해 주세요.').max(255, '폴더 이름은 255자까지 입력할 수 있습니다.')
type FolderMode = 'create' | 'rename' | 'archive'
const labels = { create: '폴더 생성', rename: '이름 변경', archive: '폴더 보관' }

export function FolderDialog({ session, department, target, onClose, onDone }: {
  session: Session; department: string; target: FolderRow | null
  onClose: () => void; onDone: (command: FolderCommand) => void
}) {
  const [mode, setMode] = useState<FolderMode>(target ? 'rename' : 'create')
  const [name, setName] = useState(target?.folder.name ?? '')
  const [classification, setClassification] = useState(1)
  const [fieldError, setFieldError] = useState('')
  const [requestError, setRequestError] = useState('')
  const lastCreation = useRef<{ signature: string; key: string } | null>(null)
  const mutation = useFolderCommand(session)

  function choose(next: FolderMode) {
    setMode(next)
    setName(next === 'rename' ? target?.folder.name ?? '' : '')
    setFieldError('')
    setRequestError('')
  }

  async function submit() {
    let command: FolderCommand
    if (mode === 'archive' && target) {
      command = { type: 'archive', target }
    } else {
      const result = names.safeParse(name)
      if (!result.success) { setFieldError(result.error.issues[0].message); return }
      command = mode === 'rename' && target ? { type: 'rename', target, name: result.data }
        : { type: 'create', department, name: result.data, parent: target?.folder.id ?? null,
          classification: target ? null : classification }
    }
    setRequestError('')
    const signature = JSON.stringify(command)
    if (lastCreation.current?.signature !== signature) {
      lastCreation.current = { signature, key: crypto.randomUUID() }
    }
    try {
      await mutation.mutateAsync({ command, key: lastCreation.current.key })
      onDone(command)
    } catch (error) {
      setRequestError(apiErrorMessage(error, command.type === 'archive'
        ? '활성 문서나 하위 폴더가 있는 폴더는 보관할 수 없습니다.'
        : '같은 이름의 폴더가 있거나 폴더 상태가 바뀌었습니다. 다시 조회해 주세요.'))
    }
  }

  return <Dialog open title={target ? target.folder.name + ' 관리' : '새 폴더'}
    onClose={() => { if (!mutation.isPending) onClose() }}>
    <form className={styles.form} noValidate onSubmit={(event) => { event.preventDefault(); void submit() }}>
      {target && <div role="group" aria-label="폴더 작업" className={styles.toolbar}>
        <Button disabled={mutation.isPending} aria-pressed={mode === 'rename'} onClick={() => choose('rename')}>이름 변경</Button>
        <Button disabled={mutation.isPending} aria-pressed={mode === 'create'} onClick={() => choose('create')}>하위 폴더 만들기</Button>
        <Button disabled={mutation.isPending} aria-pressed={mode === 'archive'} onClick={() => choose('archive')}>보관</Button>
      </div>}
      {mode === 'archive'
        ? <Notice tone="warning">문서와 하위 폴더가 없는 폴더를 보관합니다.</Notice>
        : <FormField id="folder-name" label="폴더 이름" required error={fieldError}>
          {(props) => <TextInput {...props} required maxLength={255} value={name} disabled={mutation.isPending}
            onChange={(event) => { setName(event.target.value); setFieldError('') }} />}
        </FormField>}
      {mode === 'create' && target && <Notice>상위 폴더의 권한과 보안 등급을 이어받습니다.</Notice>}
      {mode === 'create' && !target && <FormField id="folder-classification" label="보안 등급">
        {(props) => <Select {...props} value={classification} disabled={mutation.isPending}
          onChange={(event) => setClassification(Number(event.target.value))}>
          <option value="0">0 · 공개</option><option value="1">1 · 사내</option>
          <option value="2">2 · 대외비</option><option value="3">3 · 제한</option>
        </Select>}
      </FormField>}
      {requestError && <Notice tone="danger" announce>{requestError}</Notice>}
      <div className={styles.actions}>
        <Button onClick={onClose} disabled={mutation.isPending}>취소</Button>
        <Button type="submit" variant={mode === 'archive' ? 'danger' : 'primary'} busy={mutation.isPending}>{labels[mode]}</Button>
      </div>
    </form>
  </Dialog>
}
