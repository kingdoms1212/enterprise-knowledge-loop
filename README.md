# enterprise-knowledge-loop

> **Human-Verified Enterprise AI Knowledge Platform**

`enterprise-knowledge-loop`는 사내 문서와 VOC 처리 과정에서 발생하는 의견, 판단, 조치, 결과를
사람이 검증한 기업 지식으로 전환하고, 사용자의 권한 범위 안에서 AI가 안전하게 검색·활용하도록 하는
Enterprise AI Knowledge Platform 프로젝트입니다.

사내 문서에 바로 묻는 **문서 LLM**과 **VOC RAG 파이프라인**을 하나의 로컬 RAG·LLM 기반 위에 구축하고,
기업의 권한(ACL)을 검색과 AI 답변까지 그대로 적용합니다. 권한이 바뀌면 재색인 없이 다음 질문부터 반영됩니다.

단순 문서 RAG나 VOC 분석 대시보드를 목표로 하지 않습니다.

**Document / VOC → AI Assist → Human Decision → Outcome → Knowledge → ACL-aware RAG → Reuse**

의 순환을 구현하는 것이 핵심입니다.

## Current Status

현재 단계는 **Concept & Composition / UI Prototype**입니다.

이 저장소에서는 프로젝트의 문제 정의, 핵심 업무 흐름, 시스템 구성, 보안 원칙, MVP 및 포트폴리오 시연 범위를 공개합니다.

DB Schema, ER Model, 상세 API, ACL 내부 모델과 같은 구현 종속적인 상세 모델링은 개발 단계에서 별도 문서로 관리할 예정입니다.

## Quick Links

- [Concept & Composition — Markdown](./docs/Enterprise_Knowledge_Loop_Concept_and_Composition_v1.md)
- [Concept & Composition — DOCX](./docs/Enterprise_Knowledge_Loop_Concept_and_Composition_v1.docx)
- [UI Prototype — 업무 흐름 시안 (단일 HTML)](./prototype/enterprise-knowledge-loop-workflow.html)
- [Architecture](./architecture/)

## Core Concept

- Human-Verified Knowledge
- Enterprise RAG (Document Q&A + VOC RAG)
- VOC / Case Workflow
- Human-in-the-loop AI
- ACL-aware Retrieval
- Knowledge Lifecycle & Versioning
- Department Collaboration
- Local / Private AI
- Knowledge Reuse & Feedback
- Evaluation Gate & Rollback
- Folder-based Document Permission

## Repository Structure

```text
enterprise-knowledge-loop/
├─ README.md
├─ docs/            # Concept & Composition 문서 (md, docx)
├─ prototype/       # UI 프로토타입 (단일 HTML, 브라우저에서 바로 열림)
├─ design/          # 시안 원본 (prototype.html, workflow-review의 CSS·JS, 로고)
└─ architecture/    # 시스템 구성도와 생성 스크립트
```

| 위치 | 내용 |
|---|---|
| `prototype/enterprise-knowledge-loop-workflow.html` | 업무 흐름 시안 (파일 하나, 브라우저에서 바로 열림) |
| `design/` | 시안 원본 (prototype.html, workflow-review/의 CSS·JS, 로고) |
| `architecture/` | 시스템 구성도(svg)와 생성 스크립트 |

시안의 데이터와 권한 동작은 모두 가상이며, 실제 권한 검증은 아래 Security Direction 원칙을 따라 서버에서 수행합니다.

## Tech Direction

| 영역 | 방향 |
|---|---|
| 업무 Core | Java / Spring (Modular Monolith). 권한 판단과 검색 실행을 맡음 |
| AI Service | Python / FastAPI, 내부 전용 (파싱·정제·임베딩·Reranker·생성) |
| 데이터·검색 | PostgreSQL 하나에 업무 원장 + pgvector 벡터 검색 + FTS 키워드 검색 (Hybrid, RRF, Reranker) |
| 파이프라인·평가 | outbox 실시간 처리 + Airflow 배치, 고정 평가셋·평가 관문·롤백, MLflow 로컬 기록 |
| AI 모델 | 로컬 생성 모델 + 로컬 임베딩 + 로컬 Reranker (외부 AI API 미사용) |
| 웹 | React / TypeScript |

## Prototype Scope

현재 프로토타입에서는 다음 흐름을 시연합니다.

1. 문서함에 문서 등록과 게시 (폴더 권한 상속)
2. 게시 문서 질의응답과 권한 변경 직후 답변 변화
3. VOC 운영 반입 또는 내부 테스트 접수
4. 개인정보 정제와 AI 분석
5. AI의 유형·긴급도·메인 부서 제안과 AI 지식화 추천
6. 사람의 확정과 Case 생성
7. 메인 부서 / 관련 부서 협업
8. 권한 범위 내 관련 문서·Knowledge 활용
9. 종결 유형 선택 (AI 지식 참조 / 일반 종결 / 종료)과 결정·결과 기록
10. AI 지식화 설정 (처리 중 또는 종결 후, 종결 유형과 별개) → AI 초안과 결재선 자동 구성
11. 초안·공식 근거·배포 대상 확인 후 상신 → 관련 부서 합의(동시 진행) → 최종 승인·게시 (최종 승인이 처리 결과 검증을 겸함, 보완 요청·반려는 VOC를 다시 열지 않음)
12. 게시 → 검색 준비 → 부서 지식함 전달 (단계별 상태와 실패 시 재시도를 따로 표시)
13. ACL-aware RAG 검색과 다음 유사 VOC에서 Knowledge 재사용
14. 평가 관문·롤백과 피드백 검토

## Security Direction

Enterprise 환경을 전제로 다음 원칙을 적용합니다.

- Default Deny
- Role / Department / Customer / Project / Security Level 기반 접근 제어
- Resource별 ACL
- Retrieval 이전 권한 사전 필터
- 권한 변경은 재색인 없이 다음 질문부터 반영
- 권한 판단은 업무 Core 서버가 수행 (AI 서비스와 DB는 판단하지 않음)
- 폴더 → 하위 폴더·문서 권한 상속, 사유가 있는 객체 예외, 넓히는 변경의 별도 승인
- Raw VOC와 정제 Knowledge의 권한 분리
- 관련 부서 협업과 문서 권한 확대의 분리
- 권한 없는 Source/Chunk의 AI Context 유입 차단 (제목·ID·건수도 비노출)
- 지식 기안자와 결재자 분리 (기안자는 어느 결재 단계도 결정하지 않음)
- 접근·변경·승인 이력 추적

## Project Message

> 기업 문서를 AI로 검색하는 데서 끝나지 않고,
> 업무 과정에서 새롭게 생긴 판단과 처리 결과까지 사람이 검증한 지식으로 만들고 다시 업무에 활용합니다.
>
> AI는 사용자의 현재 권한 안에서만 일하고,
> 판단은 사람이 확정하며,
> 검증된 결과만 기업의 공식 지식이 됩니다.
