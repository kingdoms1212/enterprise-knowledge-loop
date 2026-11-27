package com.ekl.core.ai;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

class InternalAiClientTest {
    @Test
    void sendsTheGenerationContractAndReadsDummyCitations() throws IOException {
        var json = JsonMapper.builder().build();
        var request = new AtomicReference<JsonNode>();
        var bearer = new AtomicReference<String>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/internal/generate", exchange -> {
            try (exchange) {
                bearer.set(exchange.getRequestHeaders().getFirst("Authorization"));
                request.set(json.readTree(exchange.getRequestBody()));
                byte[] reply = """
                        {"answer":"Dummy response","citation_keys":["s1"],
                         "usage":{"input_tokens":0,"output_tokens":0},"mode":"DUMMY"}
                        """.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, reply.length);
                exchange.getResponseBody().write(reply);
            }
        });
        server.start();
        try {
            var client = new InternalAiClient("http://127.0.0.1:" + server.getAddress().getPort(), "test-token", json);
            var answer = client.generate(List.of("Sample context"), Map.of("s1", "Sample reference"), 16, "demo");
            assertThat(bearer.get()).isEqualTo("Bearer test-token");
            assertThat(request.get().get("schema_version").asString()).isEqualTo("1");
            assertThat(request.get().get("nonce").asString()).isNotBlank();
            assertThat(request.get().get("context").get(0).asString()).isEqualTo("Sample context");
            assertThat(request.get().get("source_map").get("s1").asString()).isEqualTo("Sample reference");
            assertThat(answer.mode()).isEqualTo("DUMMY");
            assertThat(answer.citationKeys()).containsExactly("s1");
        } finally {
            server.stop(0);
        }
    }
}
