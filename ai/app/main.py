import base64
import binascii
from datetime import UTC, datetime
from hmac import compare_digest
import json
import os
import subprocess
import sys
from threading import Lock, BoundedSemaphore
from typing import Literal
from uuid import UUID

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import AwareDatetime, BaseModel, Field

from .generation import DummyTextGenerator, TextGenerator
from .parsing import MAX_INPUT

MAX_REQUEST = ((MAX_INPUT + 2) // 3) * 4 + 65_536


class InternalRequest(BaseModel):
    request_id: UUID
    schema_version: Literal["1"]
    deadline: AwareDatetime
    nonce: UUID


class ParseRequest(InternalRequest):
    task_id: UUID
    artifact_id: UUID
    config_version: Literal["document-parser-v1"]
    mime: Literal[
        "application/pdf", "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    content_base64: str = Field(min_length=4, max_length=((MAX_INPUT + 2) // 3) * 4)


class Segment(BaseModel):
    page: int | None
    paragraph: int | None
    text: str


class ParseResponse(BaseModel):
    status: Literal["PARSED", "OCR_REQUIRED", "QUALITY_FAILED"]
    segments: list[Segment]


class GenerateRequest(InternalRequest):
    context: list[str] = Field(max_length=100)
    source_map: dict[str, str] = Field(max_length=100)
    token_budget: int = Field(ge=1, le=8192)
    prompt_version_id: str = Field(min_length=1, max_length=100)


class Usage(BaseModel):
    input_tokens: int
    output_tokens: int


class GenerateResponse(BaseModel):
    answer: str
    citation_keys: list[str]
    usage: Usage
    mode: Literal["DUMMY", "MODEL"]


def create_app(service_token: str, generator: TextGenerator | None = None) -> FastAPI:
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    generator = generator if generator is not None else DummyTextGenerator()
    nonces: dict[UUID, datetime] = {}
    nonce_lock = Lock()
    parser_slots = BoundedSemaphore(2)

    @app.middleware("http")
    async def limit_internal_requests(request: Request, call_next):
        if request.url.path.startswith("/internal/"):
            expected = f"Bearer {service_token}".encode()
            supplied = request.headers.get("authorization", "").encode()
            if not service_token or not compare_digest(supplied, expected):
                return JSONResponse({"detail": "UNAUTHORIZED"}, 401)
            length = request.headers.get("content-length", "")
            if not length.isascii() or not length.isdecimal() or len(length) > 10:
                return JSONResponse({"detail": "CONTENT_LENGTH_REQUIRED"}, 411)
            if int(length) > MAX_REQUEST or "transfer-encoding" in request.headers:
                return JSONResponse({"detail": "PAYLOAD_TOO_LARGE"}, 413)
        return await call_next(request)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, error):
        return JSONResponse({"detail": "INVALID_REQUEST"}, 422)

    def validate_envelope(payload: InternalRequest):
        now = datetime.now(UTC)
        remaining = (payload.deadline - now).total_seconds()
        if remaining <= 0 or remaining > 60:
            raise HTTPException(408, "INVALID_DEADLINE")
        with nonce_lock:
            for nonce in [key for key, expiry in nonces.items() if expiry <= now]:
                del nonces[nonce]
            if payload.nonce in nonces:
                raise HTTPException(409, "REPLAYED_NONCE")
            if len(nonces) >= 10_000:
                raise HTTPException(503, "BUSY")
            nonces[payload.nonce] = payload.deadline
        return remaining

    @app.get("/health")
    def health():
        if not service_token:
            raise HTTPException(503, "SERVICE_TOKEN_REQUIRED")
        return {"status": "UP", "generation_mode": "DUMMY"}

    @app.post("/internal/parse", response_model=ParseResponse)
    def parse(payload: ParseRequest):
        remaining = validate_envelope(payload)
        try:
            content = base64.b64decode(payload.content_base64, validate=True)
        except (ValueError, binascii.Error):
            raise HTTPException(422, "INVALID_CONTENT") from None
        if not content or len(content) > MAX_INPUT:
            raise HTTPException(413, "PAYLOAD_TOO_LARGE")
        if not parser_slots.acquire(blocking=False):
            raise HTTPException(503, "PARSER_BUSY")
        try:
            result = subprocess.run(
                [sys.executable, "-m", "app.parsing", payload.mime],
                input=payload.content_base64.encode("ascii"), capture_output=True, check=True,
                timeout=min(remaining, 15),
            )
            return ParseResponse.model_validate_json(result.stdout)
        except subprocess.TimeoutExpired:
            raise HTTPException(504, "PARSE_TIMEOUT") from None
        except (OSError, ValueError, subprocess.CalledProcessError):
            raise HTTPException(503, "PARSER_ERROR") from None
        finally:
            parser_slots.release()

    @app.post("/internal/generate", response_model=GenerateResponse)
    def generate(payload: GenerateRequest):
        validate_envelope(payload)
        return generator.generate(payload.context, payload.source_map, payload.token_budget,
                                  payload.prompt_version_id)

    return app


app = create_app(os.environ.get("EKL_AI_SERVICE_TOKEN", ""))
