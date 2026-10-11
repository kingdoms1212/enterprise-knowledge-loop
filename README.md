# enterprise-knowledge-loop

> **Human-Verified Enterprise AI Knowledge Platform**

`enterprise-knowledge-loop`는 사내 문서와 VOC 처리 과정에서 발생하는 의견, 판단, 조치, 결과를
사람이 검증한 기업 지식으로 전환하고, 사용자의 권한 범위 안에서 AI가 안전하게 검색·활용하도록 하는
Enterprise AI Knowledge Platform 프로젝트입니다.

단순 문서 RAG나 VOC 분석 대시보드를 목표로 하지 않습니다.

**Document / VOC → AI Assist → Human Decision → Outcome → Knowledge → ACL-aware RAG → Reuse**

의 순환을 구현하는 것이 핵심입니다.

## Current Status

현재 단계는 **Concept & Composition / UI Prototype**입니다.

Git 1차 공개에서는 프로젝트의 문제 정의, 핵심 업무 흐름, 시스템 구성, 보안 원칙, MVP 및 포트폴리오 시연 범위를 공개합니다.

DB Schema, ER Model, 상세 API, ACL 내부 모델과 같은 구현 종속적인 상세 모델링은 개발 단계에서 별도 문서로 관리할 예정입니다.

## Quick Links

- [Concept & Composition — Markdown](./docs/Enterprise_Knowledge_Loop_Concept_and_Composition_v1.md)
- [Concept & Composition — DOCX](./docs/Enterprise_Knowledge_Loop_Concept_and_Composition_v1.docx)
- [UI Prototype](./prototype/enterprise-knowledge-loop-prototype.html)

## Core Concept

- Human-Verified Knowledge
- Enterprise RAG
- VOC / Case Workflow
- Human-in-the-loop AI
- ACL-aware Retrieval
- Knowledge Lifecycle & Versioning
- Department Collaboration
- Local / Private AI
- Knowledge Reuse & Feedback

## Repository Structure

```text
enterprise-knowledge-loop/
├─ README.md
├─ docs/
│  ├─ Enterprise_Knowledge_Loop_Concept_and_Composition_v1.md
│  └─ Enterprise_Knowledge_Loop_Concept_and_Composition_v1.docx
└─ prototype/
   └─ enterprise-knowledge-loop-prototype.html
```

## Prototype Scope

현재 프로토타입에서는 다음 흐름을 시연합니다.

1. VOC 운영 반입 또는 내부 테스트 접수
2. 개인정보 정제와 AI 분석
3. AI의 유형·긴급도·메인 부서·처리 경로 제안
4. 사람의 확정과 Case 생성
5. 메인 부서 / 관련 부서 협업
6. 권한 범위 내 관련 문서·Knowledge 활용
7. Human Decision / Action / Outcome 검증
8. Knowledge Draft / Review / Approval / Publish
9. ACL-aware RAG 검색
10. 다음 유사 VOC에서 Knowledge 재사용

## Security Direction

Enterprise 환경을 전제로 다음 원칙을 적용합니다.

- Default Deny
- Role / Department / Customer / Project / Security Level 기반 접근 제어
- Resource별 ACL
- Retrieval 이전 권한 사전 필터
- Raw VOC와 정제 Knowledge의 권한 분리
- 관련 부서 협업과 문서 권한 확대의 분리
- 권한 없는 Source/Chunk의 AI Context 유입 차단
- 접근·변경·승인 이력 추적

## Project Message

> 기업 문서를 AI로 검색하는 데서 끝나지 않고,
> 업무 과정에서 새롭게 생긴 판단과 처리 결과까지 사람이 검증한 지식으로 만들고 다시 업무에 활용합니다.
>
> AI는 사용자의 현재 권한 안에서만 일하고,
> 판단은 사람이 확정하며,
> 검증된 결과만 기업의 공식 지식이 됩니다.
