# EKL 내부 AI 서비스

Python 3.12가 필요합니다. 아래 명령은 `ai/`에서 실행합니다.

```sh
python -m venv .venv
```

PowerShell에서는 `.venv\Scripts\Activate.ps1`, Bash에서는 `source .venv/bin/activate`로 가상 환경을 활성화합니다.

```sh
python -m pip install -r requirements.lock
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --no-access-log
```

서비스 시작 전에 `EKL_AI_SERVICE_TOKEN`을 설정하고 Core에도 같은 값을 전달합니다. Core에는 `EKL_AI_ENABLED=true`를 설정합니다.

- `GET /health`는 서비스 인증 설정과 생성 모드를 확인합니다.
- `POST /internal/parse`는 PDF·DOCX·UTF-8 TXT에서 페이지 또는 문단 위치가 있는 텍스트를 추출합니다.
- `POST /internal/generate`는 LLM 연결 전에 동일한 HTTP 계약으로 `DUMMY` 응답을 반환합니다.

공유 계약은 [Core–AI OpenAPI](../contracts/core-ai.openapi.json)에 있습니다. `python -m pytest -q tests`는 인증·nonce·파싱·더미 생성·계약을 확인합니다.
