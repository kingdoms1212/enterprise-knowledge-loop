import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../common/api/client'
import { Button } from '../../common/components/Button'
import { Badge, Notice } from '../../common/components/Feedback'
import { FormField, TextInput } from '../../common/components/Fields'
import workspace from '../../common/components/Workspace.module.css'
import { queryDocuments } from '../../features/retrieval/api/documentQueryApi'
import styles from './DocumentQueryPage.module.css'

export function DocumentQueryPage() {
  const [question, setQuestion] = useState('')
  const query = useMutation({ mutationFn: queryDocuments })
  const result = query.data

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = question.trim()
    if (input && !query.isPending) query.mutate(input)
  }

  return <div className={styles.page}>
    <header>
      <h1>문서·지식 질의(AI)</h1>
      <p className={workspace.intro}>현재 권한으로 검색할 수 있는 게시 문서를 근거로 답합니다.</p>
    </header>
    <form className={styles.form} onSubmit={submit}>
      <FormField id="document-question" label="질문" required>
        {(props) => <TextInput {...props} value={question} maxLength={1000} required
          placeholder="문서에서 확인하고 싶은 내용을 입력하세요" onChange={(event) => setQuestion(event.target.value)} />}
      </FormField>
      <Button variant="primary" type="submit" disabled={!question.trim()} busy={query.isPending}>질문하기</Button>
    </form>
    {query.isError && <Notice tone="danger" announce>{apiErrorMessage(query.error)}</Notice>}
    {result?.status === 'ANSWERED' && <section className={styles.answer} aria-labelledby="query-answer" aria-live="polite">
      <h2 id="query-answer">내부 AI 답변</h2>
      {result.generation_mode === 'DUMMY' && <div><Badge tone="ai">테스트 답변</Badge></div>}
      <p>{result.answer}</p>
    </section>}
    {result?.status === 'NO_EVIDENCE' && <Notice tone="neutral" announce>확인된 근거가 없습니다.</Notice>}
    {result?.outcome_reason === 'ACL_CHANGED' && <Notice tone="warning" announce>검색 권한이 바뀌었습니다. 다시 질문해 주세요.</Notice>}
    {result && result.status !== 'ANSWERED' && result.status !== 'NO_EVIDENCE' && result.outcome_reason !== 'ACL_CHANGED'
      && <Notice tone="warning" announce>답변을 준비할 수 없습니다. 잠시 후 다시 질문해 주세요.</Notice>}
    {result?.status === 'ANSWERED' && result.sources.length > 0 && <section className={styles.sources} aria-labelledby="query-sources">
      <h2 id="query-sources">근거 자료</h2>
      <ol>{result.sources.map((source) => <li key={source.citation_key}>
        <Link to={'/documents?document=' + encodeURIComponent(source.document_id)}>{source.title}</Link>
        <span>v{source.version_number}{source.page != null && ' · ' + source.page + '쪽'}
          {source.paragraph != null && ' · 문단 ' + source.paragraph}</span>
      </li>)}</ol>
    </section>}
  </div>
}
