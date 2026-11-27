from typing import Protocol


class TextGenerator(Protocol):
    def generate(self, context: list[str], source_map: dict[str, str], token_budget: int,
                 prompt_version_id: str) -> dict: ...


class DummyTextGenerator:
    def generate(self, context: list[str], source_map: dict[str, str], token_budget: int,
                 prompt_version_id: str) -> dict:
        citation = next(iter(source_map), None) if context else None
        return {
            "answer": "Dummy response" if token_budget >= 2 else "Dummy",
            "citation_keys": [citation] if citation is not None else [],
            "usage": {"input_tokens": 0, "output_tokens": 0},
            "mode": "DUMMY",
        }
