# EKL 업무 서버

Java 21과 Spring Boot로 실행하는 업무 Core입니다. 부팅 시 Flyway로 DB 스키마를 적용하고 `GET /actuator/health`로 연결 상태를 확인할 수 있습니다. 서버에는 사번 로그인과 업무 소속 선택 API가 있습니다. 문서와 폴더의 내부 단건 조회는 이미 허용된 자원·ACL·정책 revision을 PostgreSQL의 현재 상태와 대조합니다.

## Java 소스 구조

프레임워크, 공통 서버 기능, EKL 업무를 같은 `core/src/main/java` 소스셋에 둡니다. `core/gradle/libs.versions.toml`에서 Java·Spring Boot 버전과 의존성 별칭을 관리합니다. Spring Boot BOM이 Spring·Flyway·PostgreSQL·테스트 라이브러리의 버전을 정합니다.

## 패키지와 트랜잭션

`EklCoreApplication`은 `com.ekl` 아래의 컴포넌트를 탐색합니다. 트랜잭션 설정은 `com.ekl.framework.db`에 있습니다.

```text
com.ekl
├─ framework/         공통 JDBC·트랜잭션·Service·BLO·DAO 기반
├─ common/            재사용하는 서버 기능
│  ├─ auth/           인증·세션
│  ├─ acl/            접근 권한
│  ├─ document/       문서 Service·BLO·DAO
│  └─ folder/         폴더 Service·BLO·DAO
└─ core/              VOC·Case·지식 등 EKL 업무 (구현 예정)
```

- 폴더 이동과 상속 ACL 갱신처럼 여러 기능을 함께 실행하는 명령은 하나의 Service 트랜잭션으로 묶습니다.
- MVC 요청은 `Controller → Service → BLO → DAO`로 흐릅니다. 기능별 Service, BLO, DAO는 인터페이스이며, `*Impl`이 인터페이스를 구현하고 공통 `BaseService`, `BaseBlo`, `BaseDao`를 상속합니다. 다른 기능은 Service 인터페이스를 통해 호출합니다.
- Service의 공개 업무 메서드에 `@Transactional`을 붙이면 Spring AOP가 트랜잭션을 엽니다. 조회는 `readOnly = true`를 지정합니다. BLO와 DAO는 같은 트랜잭션에 참여하고, 예외가 Service 밖으로 전달되면 체크 예외도 롤백합니다.
- Service를 다른 빈에서 호출해야 트랜잭션 프록시가 적용됩니다. 커넥션 풀은 Spring Boot가 관리하며 DAO는 Spring이 주입하는 JDBC 컴포넌트를 사용합니다.
- `framework.logging`의 Spring AOP advisor는 Log4j 2로 공개 Service 호출의 메서드·성공 여부·소요 시간을 기록합니다. 실패 시 예외 타입만 남기며 인자와 반환값은 기록하지 않습니다.

## 인증 API

| 메서드와 경로 | 요청 또는 역할 |
|---|---|
| `GET /api/v1/authentication/providers` | 로컬 인증 공급자 조회 |
| `GET /api/v1/authentication/csrf` | 현재 세션의 CSRF 헤더 이름과 토큰 조회 |
| `POST /api/v1/sessions` | `organization_id`, 문자열 `employee_number`, `password`로 로그인 |
| `GET /api/v1/me` | 현재 계정과 선택한 발령 조회 |
| `GET /api/v1/me/assignments` | 로그인한 재직의 유효한 발령 조회 |
| `PUT /api/v1/sessions/current/assignment` | `assignment_id`와 `expected_revision`으로 업무 소속 선택 |
| `DELETE /api/v1/sessions/current` | 현재 세션 로그아웃 |

로컬 인증 계정의 `iam.users.login`은 재직의 `employee_no`와 일치해야 합니다. 비밀번호는 `iam.account_credentials`에 `{bcrypt}` 해시로 저장합니다. 변경 요청에는 세션 쿠키와 CSRF 헤더가 필요합니다. 로그인으로 세션이 바뀌면 새 CSRF 토큰을 조회합니다. 클라이언트는 HTTPS에서 Secure 세션 쿠키를 전송합니다.

문서 파싱은 `common.document.port.DocumentParsingPort`의 HTTP 어댑터로 [내부 AI 서비스](../ai/README.md)에 연결됩니다. `EKL_AI_ENABLED=true`와 AI 서비스와 같은 `EKL_AI_SERVICE_TOKEN`을 설정하면 Core의 작업자가 업로드 outbox를 처리합니다. 기본 AI 주소는 `http://127.0.0.1:8001`이며 `EKL_AI_BASE_URL`로 바꿀 수 있습니다. 생성 인터페이스는 현재 더미 응답을 받습니다.

## 업무 쓰기 API

모든 경로는 `/api/v1`로 시작하며 세션 쿠키, CSRF 헤더, 현재 업무 소속이 필요합니다. 생성·게시·배포·재전달 요청에는 `Idempotency-Key` 헤더를 보냅니다. 수정 요청의 `expected_version`에는 현재 `row_version`을 사용합니다.

| 업무 | 쓰기 경로 |
|---|---|
| 폴더 | `POST /document-folders`, 이름 변경 `PATCH /document-folders/{id}`, 빈 폴더 보관 `DELETE /document-folders/{id}` |
| 문서 | `POST /documents`, `POST /documents/{id}/versions`, 버전 게시·회수 `POST /documents/{id}/versions/{version}/publish` 및 `/unpublish`, `POST /documents/{id}/retire` |
| VOC·Case | `POST /voices/intake`, 새 Case로 분류하는 `POST /voices/{id}/triage`, `POST /cases/{id}/decisions`, `POST /cases/{id}/close` |
| 지식 | 원본 근거를 지정하는 `POST /knowledge`, 초안 본문을 수정하는 `PATCH /knowledge/{id}/versions/{version}`, `POST /knowledge/{id}/versions/{version}/retire` |
| 배포 | 기존 공유 범위 내 수동 배포 `POST /distributions`, 실패 건 재전달 요청 `POST /distributions/{id}/redeliver`, `POST /distributions/{id}/acknowledgements` |

웹 작업 공간에서 `GET /documents`, `GET /document-folders`, `GET /voices`, `GET /cases`로 현재 업무 소속에서 열람할 수 있는 목록을 조회합니다. 문서 업로드 전에 `POST /documents/policy-preview`로 적용할 템플릿 또는 폴더 상속 규칙을 확인합니다. VOC 상세는 정제가 완료된 본문만 반환합니다.

등록 전에 조직 또는 소유 부서의 활성 정책 템플릿이 필요합니다. 하위 폴더와 그 안의 문서는 부모 폴더의 정책을 상속할 수 있습니다. 문서 업로드는 PDF·DOCX·UTF-8 TXT를 파일당 10 MiB까지 받습니다. 원본과 VOC 원문은 `EKL_BLOB_ROOT`로 지정한 로컬 디렉터리에 보관합니다. 기본 경로는 실행 디렉터리의 `var/blobs`입니다. 파싱·색인·배포·재전달 요청의 `job_id`는 DB outbox의 작업 ID입니다.

### 문서 유형 확장

`com.ekl.common.document`는 문서 등록·버전·게시, `com.ekl.common.folder`는 폴더 생성·이동·보관 같은 공통 동작을 맡습니다. 계약서의 검토 조건처럼 업무별로 달라지는 규칙은 `com.ekl.contract.document` 같은 패키지에 두고 공통 Service를 재사용합니다. 유형별 규칙이 필요하면 공개 확장 인터페이스를 구현하거나 제공된 기반 클래스를 상속합니다.

## 로컬 실행

Java 21, Docker Compose, 그리고 이전 프로젝트에서 복원한 `db/migration/`이 필요합니다. `core/`의 Gradle Wrapper가 Gradle 8.14.3을 사용하며, 빌드에서 원본 V1~V21 SQL과 Core에 포함된 V22 파싱 결과 마이그레이션을 적용합니다.

아래 명령은 저장소 루트에서 실행합니다. `EKL_DB_ADMIN_PASSWORD`, `EKL_DB_OWNER_PASSWORD`, `EKL_DB_APP_PASSWORD`를 셸 환경에 각각 설정한 뒤 시작합니다. PostgreSQL 초기화는 새 데이터 볼륨에서 실행됩니다. 기본 DB 포트가 사용 중이면 `EKL_DB_PORT`와 `EKL_DB_URL`을 같은 포트로 설정합니다.

```sh
docker compose -f infra/compose.core.yaml up -d --wait
cd core
sh ./gradlew bootRun
```

Windows PowerShell에서는 `core/`에서 `.\gradlew.bat bootRun`을 사용합니다. 기본 주소는 `http://127.0.0.1:8080/actuator/health`입니다. PostgreSQL 초기화에는 관리자 계정을 사용하고, Flyway는 `ekl_owner`, 애플리케이션은 `ekl_app`으로 연결합니다.

Windows용 JDK 압축본을 `core/.jdk/`에 푼 경우 아래처럼 현재 PowerShell에서 `JAVA_HOME`을 지정합니다. DB만 WSL Docker에서 실행해도 Windows에서 Core를 실행할 수 있습니다.

```powershell
# 저장소 루트에서 실행
$env:JAVA_HOME = (Get-ChildItem -Path core/.jdk/jdk-* -Directory | Select-Object -First 1).FullName
Set-Location core
.\gradlew.bat bootRun
```

WSL에 Docker만 설치된 경우에는 위 Compose 명령을 실행한 뒤 저장소 루트에서 다음 명령으로 Core를 시작할 수 있습니다.

```sh
docker run --rm --network host \
  -e EKL_DB_OWNER_PASSWORD -e EKL_DB_APP_PASSWORD -e EKL_DB_URL \
  -v ekl-core-gradle-cache:/home/gradle/.gradle \
  -v "$PWD:/workspace" -w /workspace/core \
  gradle:8.14.3-jdk21 sh ./gradlew bootRun
```

## 테스트

Docker 데몬에 접근할 수 있는 환경에서 `core/`로 이동해 `sh ./gradlew test`를 실행합니다. 테스트는 별도의 PostgreSQL 16·pgvector 컨테이너를 시작해 V1~V22 적용, 복원한 SQL 스모크 테스트, 서비스 트랜잭션, 문서·폴더 조회, 헬스 응답 및 기본 API 차단을 확인합니다. 스모크 테스트는 복원한 `db/`에 있어야 합니다.

실행 가능한 JAR은 `core/`에서 `sh ./gradlew bootJar`로 빌드하며 `core/build/libs/`에 생성됩니다.
