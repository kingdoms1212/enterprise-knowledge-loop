package com.ekl.core.ai;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

public interface GenerationPort {
    GeneratedAnswer generate(List<String> context, Map<String, String> sourceMap, int tokenBudget,
                             String promptVersionId);

    record GeneratedAnswer(String answer, @JsonProperty("citation_keys") List<String> citationKeys,
                           Usage usage, String mode) {
    }

    record Usage(@JsonProperty("input_tokens") int inputTokens, @JsonProperty("output_tokens") int outputTokens) {
    }
}
