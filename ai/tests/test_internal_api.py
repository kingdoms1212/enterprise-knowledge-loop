import base64
from datetime import UTC, datetime, timedelta
from io import BytesIO
import json
from pathlib import Path
from uuid import uuid4
from zipfile import ZipFile

from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
import pytest

from app.main import create_app


@pytest.fixture
def client():
    return TestClient(create_app("test-token"), headers={"Authorization": "Bearer test-token"})


def envelope():
    return {"request_id": str(uuid4()), "schema_version": "1", "nonce": str(uuid4()),
            "deadline": (datetime.now(UTC) + timedelta(seconds=20)).isoformat()}


def document(content, mime):
    return {**envelope(), "task_id": str(uuid4()), "artifact_id": str(uuid4()),
            "config_version": "document-parser-v1", "mime": mime,
            "content_base64": base64.b64encode(content).decode("ascii")}


def test_text_parse_and_nonce_replay(client):
    payload = document("첫 문단\n\n두 번째".encode(), "text/plain")
    response = client.post("/internal/parse", json=payload)
    assert response.json() == {
        "status": "PARSED",
        "segments": [{"page": None, "paragraph": 1, "text": "첫 문단"},
                     {"page": None, "paragraph": 3, "text": "두 번째"}],
    }
    assert client.post("/internal/parse", json=payload).status_code == 409


def test_word_paragraph_and_pdf_without_text(client):
    docx = BytesIO()
    with ZipFile(docx, "w") as archive:
        archive.writestr("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/'
                         'wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Policy</w:t></w:r>'
                         '</w:p></w:body></w:document>')
    word = client.post("/internal/parse", json=document(
        docx.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
    assert word.json()["segments"] == [{"page": None, "paragraph": 1, "text": "Policy"}]

    pdf = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(100, 100)
    writer.write(pdf)
    assert client.post("/internal/parse", json=document(pdf.getvalue(), "application/pdf")).json() == {
        "status": "OCR_REQUIRED", "segments": [],
    }


def test_pdf_text_has_a_page_reference(client):
    pdf = BytesIO()
    writer = PdfWriter()
    page = writer.add_blank_page(300, 300)
    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/Font"): DictionaryObject({
            NameObject("/F1"): DictionaryObject({
                NameObject("/Type"): NameObject("/Font"),
                NameObject("/Subtype"): NameObject("/Type1"),
                NameObject("/BaseFont"): NameObject("/Helvetica"),
            }),
        }),
    })
    stream = DecodedStreamObject()
    stream.set_data(b"BT /F1 12 Tf 10 20 Td (Policy text) Tj ET")
    page.replace_contents(stream)
    writer.write(pdf)
    assert client.post("/internal/parse", json=document(pdf.getvalue(), "application/pdf")).json() == {
        "status": "PARSED",
        "segments": [{"page": 1, "paragraph": None, "text": "Policy text"}],
    }


def test_dummy_generation_and_service_auth(client):
    payload = {**envelope(), "context": ["private content"], "source_map": {"s1": "document"},
               "token_budget": 10, "prompt_version_id": "demo"}
    assert client.post("/internal/generate", json=payload, headers={"Authorization": ""}).status_code == 401
    assert client.post("/internal/generate", json=payload).json() == {
        "answer": "Dummy response", "citation_keys": ["s1"], "usage": {
            "input_tokens": 0, "output_tokens": 0,
        }, "mode": "DUMMY",
    }
    payload["deadline"] = (datetime.now(UTC) - timedelta(seconds=1)).isoformat()
    assert client.post("/internal/generate", json=payload).status_code == 408


def test_shared_contract_matches_service_models():
    contract = json.loads((Path(__file__).resolve().parents[2] / "contracts" / "core-ai.openapi.json")
                          .read_text(encoding="utf-8"))
    generated = create_app("test-token").openapi()
    for path in ("/internal/parse", "/internal/generate"):
        expected = contract["paths"][path]["post"]
        actual = generated["paths"][path]["post"]
        assert expected["requestBody"] == actual["requestBody"]
        assert expected["responses"]["200"] == actual["responses"]["200"]
    assert contract["components"]["schemas"] == generated["components"]["schemas"]
