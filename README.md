# Enterprise Knowledge Loop

**Enterprise Knowledge Loop**는 사내 문서와 VOC 처리 과정에서 발생하는
의견, 판단, 조치, 결과를 사람이 검증한 기업 지식으로 전환하고,
사용자의 권한 범위 안에서 AI가 안전하게 검색·활용하도록 하는
Human-Verified Enterprise AI Knowledge Platform입니다.

단순한 문서 RAG나 VOC 분석 시스템을 목표로 하지 않습니다.

기존 기업 문서와 업무 과정에서 새롭게 발생하는 경험을 하나의
Knowledge Lifecycle로 연결하여,

**Document / VOC → AI Assist → Human Decision → Outcome → Knowledge → RAG → Reuse**

의 순환 구조를 구현하는 것이 프로젝트의 핵심입니다.

AI는 업무를 지원하지만 최종 판단을 대신하지 않습니다.
AI의 추천과 사람의 실제 결정은 분리하며,
실제 업무 결과가 검증된 이후에만 공식 Knowledge로 전환합니다.

또한 Enterprise 환경을 고려하여 문서와 지식의 접근 권한을
UI 수준에서만 제한하지 않고 검색 단계부터 적용하는 것을 기본 원칙으로 합니다.

## Core Concept

- Human-Verified Knowledge
- Enterprise RAG
- VOC / Case Workflow
- Human-in-the-loop AI
- ACL-aware Retrieval
- Knowledge Lifecycle & Versioning
- Department Collaboration
- Local AI / Private AI
- Knowledge Reuse & Feedback

## Project Status

현재 단계는 **Concept & Composition / Prototype Planning**입니다.

현재 Repository에는 프로젝트의 컨셉과 구성안을 우선 공개하며,
DB Schema, ERD, 상세 API, 내부 ACL 모델과 같은 구현 세부사항은
개발 단계에서 별도 설계·관리할 예정입니다.

## Documents

- [Concept & Composition](./docs/Enterprise_Knowledge_Loop_Concept_and_Composition_v1.md)
- DOCX: `docs/Enterprise_Knowledge_Loop_Concept_and_Composition_v1.docx`