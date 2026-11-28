import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const organization = '82000000-0000-0000-0000-000000000001'
const documentId = '82000000-0000-0000-0000-000000000054'
const versionId = '82000000-0000-0000-0000-000000000055'
const folderId = '82000000-0000-0000-0000-000000000060'
const voiceId = '82000000-0000-0000-0000-000000000061'
const caseId = '82000000-0000-0000-0000-000000000062'
const draftId = '82000000-0000-0000-0000-000000000063'
const draftVersion = '82000000-0000-0000-0000-000000000064'
const approvalStep = '82000000-0000-0000-0000-000000000065'
const timestamp = '2026-01-15T08:00:00Z'
const assignments = [
  { id: 'a1', departmentId: 'd1', departmentName: '운영팀', assignmentType: 'PRIMARY' },
  { id: 'a2', departmentId: 'd2', departmentName: '품질팀', assignmentType: 'CONCURRENT' },
]

async function mockCore(page: Page) {
  const context = {
    organizationId: organization, accountId: 'actor', employmentId: 'employee', employeeNumber: '00042',
    displayName: '검증 사용자', assignmentId: null as string | null, contextRevision: 1,
  }
  let signedIn = false
  let uploaded = false
  let published = false
  let savedDraft: { body: string; revision: number; state: string } | null = null
  let received = false
  let triaged = false
  let decision: { description: string; reason: string; decidedAt: string } | null = null
  let outcome: { result: string; summary: string; state: string } | null = null
  const voiceRow = () => ({ id: voiceId, title: '문의 응답 지연', channel: 'MANUAL', piiStatus: 'CLEANED',
    triageStatus: triaged ? 'TRIAGED' : 'ANALYSIS_FAILED', receivedAt: timestamp })
  const caseRow = () => ({ id: caseId, title: '문의 응답 지연', state: outcome ? 'CLOSED' : decision ? 'DECIDED' : 'OPEN',
    closeType: outcome ? 'RESOLVED' : null, createdAt: timestamp })
  const document = {
    id: documentId, title: '운영 업무 매뉴얼', ownerDepartmentId: 'd1', folderId,
    currentVersionId: versionId, versionNumber: 1, parseStatus: 'PARSED', rowVersion: 1,
  }

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const method = request.method()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    if (path === '/authentication/csrf') {
      await route.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'test-csrf' } })
      return
    }
    if (method !== 'GET') expect(request.headers()['x-csrf-token']).toBe('test-csrf')
    if (path === '/sessions' && method === 'POST') {
      expect(request.postDataJSON()).toEqual({ organization_id: organization, employee_number: '00042', password: 'test-pass' })
      signedIn = true
      await route.fulfill({ json: context })
      return
    }
    if (!signedIn) {
      await route.fulfill({ status: 401 })
      return
    }
    if (path === '/me') {
      await route.fulfill({ json: context })
      return
    }
    if (path === '/me/assignments') {
      await route.fulfill({ json: assignments })
      return
    }
    if (path === '/sessions/current/assignment' && method === 'PUT') {
      const body = request.postDataJSON()
      expect(body.expected_revision).toBe(context.contextRevision)
      context.assignmentId = body.assignment_id
      context.contextRevision += 1
      await route.fulfill({ json: context })
      return
    }
    if (path === '/document-library/capabilities') {
      await route.fulfill({ json: { upload: context.assignmentId === 'a1', manageFolders: false } })
      return
    }
    if (path === '/voices/capabilities') {
      await route.fulfill({ json: { intake: context.assignmentId === 'a1' } })
      return
    }
    if (path === '/voices' && method === 'GET') {
      await route.fulfill({ json: { items: received ? [voiceRow()] : [], nextCursor: null } })
      return
    }
    if (path === '/voices/intake' && method === 'POST') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      expect(request.postDataJSON()).toMatchObject({ title: '문의 응답 지연', body: '원본 접수 문구',
        product_code: 'PORTAL', received_department_id: 'd1' })
      received = true
      await route.fulfill({ status: 202, json: { voice_id: voiceId, job_id: 'job' } })
      return
    }
    if (path === '/voices/' + voiceId && method === 'GET' && received) {
      await route.fulfill({ json: { voice: voiceRow(), cleanText: '정제된 문의 내용', productCode: 'PORTAL',
        urgencyHint: null, rowVersion: 4, canTriage: !triaged } })
      return
    }
    if (path === '/voices/' + voiceId + '/triage' && method === 'POST') {
      expect(request.postDataJSON()).toMatchObject({ type_final: 'INQUIRY', urgency_final: 'NORMAL',
        primary_department_id: 'd1', handler_id: 'actor', expected_version: 4 })
      triaged = true
      await route.fulfill({ status: 201, json: { case_id: caseId } })
      return
    }
    if (path === '/cases' && method === 'GET') {
      await route.fulfill({ json: { items: triaged ? [caseRow()] : [], nextCursor: null } })
      return
    }
    if (path === '/cases/' + caseId && method === 'GET' && triaged) {
      await route.fulfill({ json: { work: caseRow(), department: '운영팀', type: 'INQUIRY', urgency: 'NORMAL',
        closeNote: null, rowVersion: outcome ? 2 : decision ? 1 : 0, canDecide: !outcome, pendingTasks: false,
        decision, outcome } })
      return
    }
    if (path === '/cases/' + caseId + '/decisions' && method === 'POST') {
      const body = request.postDataJSON()
      expect(body.expected_version).toBe(0)
      decision = { description: body.decision, reason: body.reason, decidedAt: timestamp }
      await route.fulfill({ status: 201, json: { decision_id: 'decision', row_version: 1 } })
      return
    }
    if (path === '/cases/' + caseId + '/close' && method === 'POST') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      const body = request.postDataJSON()
      expect(body).toMatchObject({ close_type: 'RESOLVED', expected_version: 1, outcome: { result: 'SUCCESS' } })
      outcome = { ...body.outcome, state: 'DRAFT' }
      await route.fulfill({ json: { case_id: caseId, row_version: 2 } })
      return
    }
    if (path === '/document-folders') {
      const folders = context.assignmentId === 'a1' && !new URL(request.url()).searchParams.has('parent_id')
        ? [{ folder: { id: folderId, name: '운영 매뉴얼', ownerDepartmentId: 'd1', parentId: null }, rowVersion: 0 }]
        : []
      await route.fulfill({ json: { items: folders, nextCursor: null } })
      return
    }
    if (path === '/documents' && method === 'GET') {
      await route.fulfill({ json: { items: context.assignmentId === 'a1' && uploaded ?
        [{ document, classificationLevel: 1, policyOrigin: 'INHERITED', updatedAt: '2026-01-15T08:00:00Z' }] : [], nextCursor: null } })
      return
    }
    if (path === '/documents/policy-preview') {
      expect(request.postDataJSON().folder_id).toBe(folderId)
      await route.fulfill({ json: { origin: 'INHERITED', sourceName: '운영 매뉴얼', classificationLevel: 1,
        sharingScope: 'DEPARTMENT', rules: [{ action: 'READ', effect: 'ALLOW' }] } })
      return
    }
    if (path === '/documents' && method === 'POST') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      expect(request.headers()['content-type']).toMatch(/^multipart\/form-data;/)
      expect(request.postData()).toContain('운영 업무 매뉴얼')
      expect(request.postData()).toContain(folderId)
      uploaded = true
      await route.fulfill({ status: 202, json: { document_id: documentId, row_version: 0, job_id: 'job' } })
      return
    }
    if (path === '/documents/' + documentId && context.assignmentId === 'a1') {
      await route.fulfill({ json: { document, versions: [{ id: versionId, versionNumber: 1, parseStatus: 'PARSED',
        publishState: published ? 'PUBLISHED' : 'DRAFT', createdAt: timestamp }],
        policy: { origin: 'TEMPLATE', classificationLevel: 1 }, actions: { publish: true } } })
      return
    }
    if (path === '/documents/' + documentId + '/versions/' + versionId + '/publish' && method === 'POST') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      published = true
      await route.fulfill({ json: { document_id: documentId, row_version: 2, job_id: 'index-job' } })
      return
    }
    if (path === '/knowledge' && method === 'POST') {
      expect(published).toBe(true)
      expect(request.headers()['idempotency-key']).toBeTruthy()
      expect(request.postDataJSON()).toEqual({ title: '운영 업무 매뉴얼', kind: 'REFERENCE', body: '색인 작업을 확인합니다.',
        source_refs: [{ source_role: 'PRIMARY', document_version_id: versionId, source_locator: '4쪽' }] })
      savedDraft = { body: '색인 작업을 확인합니다.', revision: 0, state: 'DRAFT' }
      await route.fulfill({ status: 201, json: { knowledge_id: draftId, version_id: draftVersion, row_version: 0 } })
      return
    }
    if (path === '/knowledge/' + draftId + '/versions/' + draftVersion && method === 'PATCH' && savedDraft) {
      expect(request.postDataJSON()).toEqual({ body: '색인 작업 시간도 확인합니다.', expected_version: 0 })
      savedDraft.body = request.postDataJSON().body
      savedDraft.revision = 1
      await route.fulfill({ json: { version_id: draftVersion, row_version: 1 } })
      return
    }
    const draftRow = { id: draftVersion, knowledgeId: draftId, title: document.title,
      versionNumber: 1, kind: 'REFERENCE', state: savedDraft?.state }
    if (path === '/knowledge/drafts' && method === 'GET') {
      await route.fulfill({ json: { items: savedDraft && context.assignmentId === 'a1' ? [draftRow] : [], nextCursor: null } })
      return
    }
    if (path === '/knowledge/versions/' + draftVersion && method === 'GET' && savedDraft && context.assignmentId === 'a1') {
      const editable = savedDraft.state === 'DRAFT'
      await route.fulfill({ json: { version: draftRow, body: savedDraft.body, rowVersion: savedDraft.revision,
        canEdit: editable, canSubmit: editable, approval: editable ? null : { id: approvalStep, state: 'OPEN', rowVersion: 0, canDecide: false },
        sources: [{ documentId, title: document.title, versionNumber: 1, locator: '4쪽' }] } })
      return
    }
    if (path === '/knowledge/' + draftId + '/versions/' + draftVersion + '/submit' && method === 'POST' && savedDraft) {
      expect(request.postDataJSON()).toEqual({ reason: '게시 근거 확인 요청', expected_version: 1 })
      savedDraft.state = 'REVIEW'
      savedDraft.revision += 1
      await route.fulfill({ json: { step_id: approvalStep } })
      return
    }
    if (path === '/rag/queries' && method === 'POST') {
      expect(request.postDataJSON()).toEqual({ question: '검색 지연 점검 순서' })
      await route.fulfill({ json: context.assignmentId === 'a1'
        ? { status: 'ANSWERED', outcome_reason: null, generation_mode: 'DUMMY', answer: '색인 작업을 확인하세요.',
          sources: [{ citation_key: 's1', document_id: documentId, title: document.title, version_number: 1, page: 4, paragraph: null }] }
        : { status: 'NO_EVIDENCE', outcome_reason: 'NO_EVIDENCE', sources: [] } })
      return
    }
    if (path === '/sessions/current' && method === 'DELETE') {
      signedIn = false
      await route.fulfill({ status: 204 })
      return
    }
    await route.fulfill({ status: 404 })
  })
}

test('스타일 가이드의 반응형 배치와 키보드 상호작용', async ({ page }) => {
  await page.goto('/style-guide')
  await expect(page.getByRole('heading', { name: 'UI 스타일 가이드' })).toBeVisible()
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }

  const list = page.getByRole('tab', { name: '문서 목록' })
  await list.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: '다이얼로그' })).toBeFocused()
  const trigger = page.getByRole('button', { name: '다이얼로그 열기' })
  await trigger.click()
  await expect(page.getByRole('dialog', { name: '문서 등록 예시' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(audit.violations).toEqual([])
})

test('문서 등록·게시, 지식 초안, 권한 기반 문서 질의', async ({ page }) => {
  await mockCore(page)
  await page.goto('/documents')
  await expect(page.getByRole('heading', { name: '사번 로그인' })).toBeVisible()
  await page.getByLabel('조직 ID').fill(organization)
  await page.getByRole('textbox', { name: /^사번/ }).fill('00042')
  await page.getByLabel('비밀번호').fill('test-pass')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '업무 소속 선택' })).toBeVisible()
  await page.getByRole('radio', { name: /운영팀/ }).check()
  await page.getByRole('button', { name: '선택한 소속으로 시작' }).click()
  await expect(page.getByRole('heading', { name: '오늘 처리할 VOC' })).toBeVisible()
  const menu = page.getByRole('navigation', { name: '업무 메뉴' })
  await expect(menu.getByRole('link')).toHaveText(['내 VOC 업무', 'VOC 수신함', '지식 작성·결재', '부서 지식함', '문서·지식 질의(AI)', '문서함'])
  await page.getByRole('navigation', { name: '업무 메뉴' }).getByRole('link', { name: '문서함' }).click()
  await page.getByRole('button', { name: '운영 매뉴얼', exact: true }).click()
  await page.getByRole('button', { name: '업로드' }).click()
  const dialog = page.getByRole('dialog', { name: '문서 업로드' })
  await dialog.getByLabel('파일').setInputFiles({ name: 'guide.txt', mimeType: 'text/plain', buffer: Buffer.from('example') })
  await dialog.getByLabel('제목').fill('운영 업무 매뉴얼')
  await expect(dialog.getByText('열람 허용')).toBeVisible()
  await dialog.getByRole('button', { name: '등록', exact: true }).click()
  await expect(page.getByRole('heading', { name: '운영 업무 매뉴얼' })).toBeVisible()
  await expect(page.getByRole('button', { name: /운영 업무 매뉴얼/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: '열린 작업 탭' }).getByRole('link', { name: '문서함' })).toBeVisible()
  await page.getByRole('button', { name: '상세 닫기' }).click()
  await expect(page.getByRole('heading', { name: '문서 목록' })).toBeFocused()
  await page.getByRole('button', { name: /운영 업무 매뉴얼/ }).click()
  await expect(page.getByRole('heading', { name: '문서 상세' })).toBeFocused()
  await expect(page.getByRole('button', { name: '지식 초안 작성' })).toHaveCount(0)
  await page.getByRole('button', { name: '게시', exact: true }).click()
  await page.getByRole('dialog', { name: '게시', exact: true }).getByRole('button', { name: '게시', exact: true }).click()
  await page.getByRole('button', { name: '지식 초안 작성' }).click()
  const draft = page.getByRole('dialog', { name: '지식 초안 작성' })
  await draft.getByRole('button', { name: '초안 저장' }).click()
  await expect(draft.getByText('근거 위치를 입력해 주세요.')).toBeVisible()
  await draft.getByLabel('근거 위치').fill('4쪽')
  await draft.getByLabel('초안 본문').fill('색인 작업을 확인합니다.')
  await draft.getByRole('button', { name: '초안 저장' }).click()
  await expect(draft.getByText('지식 초안을 저장했습니다.')).toBeVisible()
  await draft.getByLabel('초안 본문').fill('색인 작업 시간도 확인합니다.')
  await draft.getByRole('button', { name: '본문 저장' }).click()
  await expect(draft.getByText('초안 본문을 저장했습니다.')).toBeVisible()
  await draft.getByRole('link', { name: '저장한 초안 열기' }).click()
  await expect(page.getByRole('textbox', { name: /^초안 본문/ })).toHaveValue('색인 작업 시간도 확인합니다.')
  await page.getByRole('button', { name: '상신', exact: true }).click()
  const review = page.getByRole('dialog', { name: '지식 상신' })
  await review.getByRole('textbox', { name: /^사유/ }).fill('게시 근거 확인 요청')
  await review.getByRole('button', { name: '지식 상신' }).click()
  await expect(page.getByText('결재 상태 · 최종 승인 대기')).toBeVisible()

  await menu.getByRole('link', { name: '문서·지식 질의(AI)' }).click()
  await page.getByRole('textbox', { name: /^질문/ }).fill('검색 지연 점검 순서')
  await page.getByRole('button', { name: '질문하기' }).click()
  await expect(page.getByText('테스트 답변')).toBeVisible()
  await expect(page.getByText('v1 · 4쪽')).toBeVisible()
  await page.getByRole('link', { name: '운영 업무 매뉴얼' }).click()
  await expect(page.getByRole('heading', { name: '운영 업무 매뉴얼' })).toBeVisible()

  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('link', { name: '업무 소속 변경' }).click()
  await page.getByRole('radio', { name: /품질팀/ }).check()
  await page.getByRole('button', { name: '선택한 소속으로 시작' }).click()
  await expect(page.getByRole('navigation', { name: '열린 작업 탭' }).getByRole('link', { name: '문서함' })).toHaveCount(0)
  await page.goto('/documents?document=' + documentId)
  await expect(page.getByRole('alert')).toHaveText('찾을 수 없음')
  await expect(page.getByText('운영 업무 매뉴얼')).toHaveCount(0)
  await menu.getByRole('link', { name: '문서·지식 질의(AI)' }).click()
  await expect(page.getByText('테스트 답변')).toHaveCount(0)
  await page.getByRole('textbox', { name: /^질문/ }).fill('검색 지연 점검 순서')
  await page.getByRole('button', { name: '질문하기' }).click()
  await expect(page.getByText('확인된 근거가 없습니다.')).toBeVisible()
  await expect(page.getByText('운영 업무 매뉴얼')).toHaveCount(0)
  await page.getByRole('button', { name: '로그아웃' }).click()
  await expect(page.getByRole('heading', { name: '사번 로그인' })).toBeVisible()
})

test('VOC 수동 접수, 분류, Case 결정과 종결', async ({ page }) => {
  await mockCore(page)
  await page.goto('/login')
  await page.getByLabel('조직 ID').fill(organization)
  await page.getByRole('textbox', { name: /^사번/ }).fill('00042')
  await page.getByLabel('비밀번호').fill('test-pass')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.getByRole('radio', { name: /운영팀/ }).check()
  await page.getByRole('button', { name: '선택한 소속으로 시작' }).click()
  await page.getByRole('navigation', { name: '업무 메뉴' }).getByRole('link', { name: 'VOC 수신함' }).click()
  await page.getByRole('button', { name: '새 VOC 접수' }).click()
  const intake = page.getByRole('dialog', { name: '새 VOC 접수' })
  await intake.getByLabel('제목').fill('문의 응답 지연')
  await intake.getByLabel('제품·서비스 코드').fill('PORTAL')
  await intake.getByLabel('VOC 원문').fill('원본 접수 문구')
  await intake.getByRole('button', { name: '접수', exact: true }).click()
  await expect(page.getByText('정제된 문의 내용')).toBeVisible()
  await expect(page.getByText('원본 접수 문구')).toHaveCount(0)
  await page.getByRole('button', { name: '분류 확정' }).click()
  await page.getByRole('button', { name: 'Case 만들기' }).click()
  await expect(page.getByRole('heading', { name: 'VOC 처리', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '결정 기록' }).click()
  await page.getByLabel('결정 내용').fill('응답 큐 설정을 조정합니다.')
  await page.getByLabel('결정 사유').fill('응답 지연을 줄이기 위해서입니다.')
  await page.getByRole('button', { name: '결정 저장' }).click()
  await expect(page.getByText('응답 큐 설정을 조정합니다.')).toBeVisible()
  await page.getByRole('button', { name: '종결', exact: true }).click()
  await page.getByLabel('결과 요약').fill('응답 지연이 해소되었습니다.')
  await page.getByRole('button', { name: '종결 확정' }).click()
  await expect(page.getByText('응답 지연이 해소되었습니다.')).toBeVisible()
  await expect(page.getByRole('button', { name: '종결', exact: true })).toHaveCount(0)
})

test('업무 소속 회수와 세션 만료 때 원래 화면에서 이동', async ({ page }) => {
  await mockCore(page)
  await page.goto('/login')
  await page.getByLabel('조직 ID').fill(organization)
  await page.getByRole('textbox', { name: /^사번/ }).fill('00042')
  await page.getByLabel('비밀번호').fill('test-pass')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.getByRole('radio', { name: /운영팀/ }).check()
  await page.getByRole('button', { name: '선택한 소속으로 시작' }).click()
  await expect(page.getByRole('heading', { name: '오늘 처리할 VOC' })).toBeVisible()

  let expired = false
  await page.route('**/api/v1/me', async (route) => {
    if (expired) {
      await route.fulfill({ status: 401, contentType: 'application/problem+json', body: '{"code":"SESSION_REQUIRED"}' })
      return
    }
    await route.fulfill({ json: { organizationId: organization, accountId: 'actor', employmentId: 'employee',
      employeeNumber: '00042', displayName: '검증 사용자', assignmentId: null, contextRevision: 2 } })
  })
  await page.route('**/api/v1/knowledge/drafts', (route) => route.fulfill({
    status: 403, contentType: 'application/problem+json', body: '{"code":"ASSIGNMENT_REQUIRED"}',
  }))
  await page.getByRole('navigation', { name: '업무 메뉴' }).getByRole('link', { name: '지식 작성·결재' }).click()
  await expect(page.getByRole('heading', { name: '업무 소속 선택' })).toBeVisible()
  expired = true
  await page.reload()
  await expect(page.getByRole('heading', { name: '사번 로그인' })).toBeVisible()
})
