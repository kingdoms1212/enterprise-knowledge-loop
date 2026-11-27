package com.ekl.core.ai;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.ekl.common.document.port.DocumentParsingPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.json.JsonMapper;

@Component
@ConditionalOnProperty(name = "ekl.ai.enabled", havingValue = "true")
class InternalAiClient implements DocumentParsingPort, GenerationPort {
    public static final Duration DEADLINE = Duration.ofSeconds(20);

    private final RestClient client;
    private final JsonMapper json;

    InternalAiClient(@Value("${ekl.ai.base-url}") String url, @Value("${ekl.ai.service-token}") String token,
                     JsonMapper json) {
        if (token.isBlank()) {
            throw new IllegalArgumentException("EKL_AI_SERVICE_TOKEN is required");
        }
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(DEADLINE);
        this.client = RestClient.builder().baseUrl(url).requestFactory(factory)
                .defaultHeaders(headers -> headers.setBearerAuth(token)).build();
        this.json = json;
    }

    @Override
    public ParsedDocument parse(ParseRequest request) {
        var data = envelope(request.requestId(), request.schemaVersion(), request.deadline(), request.nonce());
        data.put("task_id", request.taskId());
        data.put("artifact_id", request.artifactId());
        data.put("config_version", request.configVersion());
        data.put("mime", request.mime());
        data.put("content_base64", request.content());
        return send("/internal/parse", data, ParsedDocument.class);
    }

    @Override
    public GeneratedAnswer generate(List<String> context, Map<String, String> sourceMap, int tokenBudget,
                                    String promptVersionId) {
        var data = envelope(UUID.randomUUID(), "1", Instant.now().plus(DEADLINE), UUID.randomUUID());
        data.put("context", context);
        data.put("source_map", sourceMap);
        data.put("token_budget", tokenBudget);
        data.put("prompt_version_id", promptVersionId);
        var result = send("/internal/generate", data, GeneratedAnswer.class);
        if (result.citationKeys() == null || !sourceMap.keySet().containsAll(result.citationKeys())) {
            throw new AiCallFailure("AI_INVALID_RESPONSE", false);
        }
        return result;
    }

    private Map<String, Object> envelope(UUID id, String version, Instant deadline, UUID nonce) {
        var data = new LinkedHashMap<String, Object>();
        data.put("request_id", id);
        data.put("schema_version", version);
        data.put("deadline", deadline.toString());
        data.put("nonce", nonce);
        return data;
    }

    private <T> T send(String path, Map<String, Object> payload, Class<T> type) {
        try {
            var response = client.post().uri(path).contentType(MediaType.APPLICATION_JSON)
                    .body(json.writeValueAsBytes(payload)).retrieve().body(type);
            if (response == null) {
                throw new AiCallFailure("AI_INVALID_RESPONSE", false);
            }
            return response;
        } catch (RestClientResponseException failure) {
            int status = failure.getStatusCode().value();
            boolean retryable = status == 408 || status == 429 || status >= 500;
            throw new AiCallFailure(retryable ? "AI_UNAVAILABLE" : "AI_REQUEST_REJECTED", retryable);
        } catch (RestClientException failure) {
            throw new AiCallFailure("AI_UNAVAILABLE", true);
        }
    }
}
