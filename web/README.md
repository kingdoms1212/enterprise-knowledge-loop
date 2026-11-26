# EKL Web

React와 TypeScript로 구현한 EKL 업무 화면입니다. Vite의 개발 서버에서 `/api/v1`을 Core로 프록시합니다.

## 로컬 실행

Core를 로컬에서 시작한 뒤 `web/`에서 실행합니다.

```powershell
npm.cmd ci
npm.cmd run dev
```

- 업무 화면은 `https://localhost:5173/`에서 엽니다.
- 공통 UI 스타일 가이드는 `https://localhost:5173/style-guide`에서 엽니다.
- 개발 서버는 Secure 세션 쿠키를 사용하기 위해 로컬 HTTPS로 실행합니다. 최초 접속에는 Vite의 로컬 인증서가 표시될 수 있습니다.
- Core 주소의 기본값은 `http://127.0.0.1:8080`입니다. 다르면 Vite를 실행하기 전에 `EKL_CORE_URL`을 지정합니다. `VITE_ORGANIZATION_ID`를 지정하면 로그인 폼의 조직 ID를 미리 채웁니다.

## 연결 범위

Core의 사번 로그인, 업무 소속 선택·변경과 로그아웃을 연결했습니다. 문서함에서는 읽을 수 있는 문서·폴더를 탐색하고, 업로드 전 권한을 확인하며, 허용된 문서·폴더 작업을 수행합니다. VOC는 수동 접수·정제된 내용 조회·분류 확정을 지원하고, Case에서는 결정과 종결 유형별 처리 결과를 기록합니다.

파싱과 VOC 정제·분석은 Core 작업 큐를 사용합니다. 실제 작업 실행 전까지는 해당 화면에 대기 상태가 표시됩니다. 폴더 이동·권한 변경 승인, CSV 반입, 협업 요청, 지식 결재는 별도 흐름입니다.

`npm.cmd run build`는 `dist/`에 배포 파일을 생성합니다. 운영에서는 같은 출처에서 정적 파일을 제공하고 `/api/v1`을 Core로 프록시합니다. 브라우저에서 직접 진입하는 `/style-guide`, `/documents` 같은 경로는 정적 서버에서 SPA 엔트리로 연결합니다.

`npm.cmd test`는 작업 탭의 상태 관리를 검증합니다. `npm.cmd run test:e2e`는 브라우저에서 스타일 가이드, 문서함, VOC 접수에서 Case 종결까지의 화면 흐름을 확인합니다. 업무 흐름 시험은 Core API 응답을 모의하고, Windows에서는 설치된 Edge를 씁니다.
