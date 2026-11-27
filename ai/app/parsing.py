import base64
import io
import json
import sys
from xml.etree import ElementTree
from zipfile import ZipFile

from pypdf import PdfReader

MAX_INPUT = 10 * 1024 * 1024
MAX_TEXT = 1_000_000
WORD_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
WORD_XML = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def parse_document(content: bytes, mime: str) -> dict:
    try:
        if not content or len(content) > MAX_INPUT:
            return {"status": "QUALITY_FAILED", "segments": []}
        if mime == "application/pdf":
            pdf = PdfReader(io.BytesIO(content))
            if pdf.is_encrypted or len(pdf.pages) > 300:
                return {"status": "QUALITY_FAILED", "segments": []}
            segments = []
            total = 0
            for number, page in enumerate(pdf.pages, 1):
                text = (page.extract_text() or "").strip()
                total += len(text)
                if total > MAX_TEXT:
                    return {"status": "QUALITY_FAILED", "segments": []}
                if text:
                    segments.append({"page": number, "paragraph": None, "text": text})
            if not segments:
                return {"status": "OCR_REQUIRED", "segments": []}
        else:
            if mime == WORD_MIME:
                with ZipFile(io.BytesIO(content)) as archive:
                    with archive.open("word/document.xml") as entry:
                        xml = entry.read(MAX_INPUT + 1)
                if len(xml) > MAX_INPUT:
                    return {"status": "QUALITY_FAILED", "segments": []}
                xml_text = xml.decode("utf-8-sig")
                if "<!DOCTYPE" in xml_text.upper() or "<!ENTITY" in xml_text.upper():
                    return {"status": "QUALITY_FAILED", "segments": []}
                root = ElementTree.fromstring(xml_text)
                paragraphs = (
                    "".join(node.text or "" for node in paragraph.iter(WORD_XML + "t"))
                    for paragraph in root.iter(WORD_XML + "p")
                )
            elif mime == "text/plain":
                paragraphs = iter(content.decode("utf-8-sig").splitlines())
            else:
                return {"status": "QUALITY_FAILED", "segments": []}
            segments = []
            total = 0
            for number, paragraph in enumerate(paragraphs, 1):
                text = paragraph.strip()
                total += len(text)
                if total > MAX_TEXT or len(segments) >= 10_000 or "\x00" in text:
                    return {"status": "QUALITY_FAILED", "segments": []}
                if text:
                    segments.append({"page": None, "paragraph": number, "text": text})
        if any("\x00" in segment["text"] for segment in segments):
            return {"status": "QUALITY_FAILED", "segments": []}
        return {"status": "PARSED" if segments else "QUALITY_FAILED", "segments": segments}
    except Exception:
        return {"status": "QUALITY_FAILED", "segments": []}


if __name__ == "__main__":
    mime = sys.argv[1]
    content = base64.b64decode(sys.stdin.buffer.read(), validate=True)
    sys.stdout.write(json.dumps(parse_document(content, mime)))
