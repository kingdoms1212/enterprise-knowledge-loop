package com.ekl.common.support;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class CommandRules {
    private CommandRules() {
    }

    public static String required(String text, int maximumLength) {
        if (text == null || text.isBlank() || text.length() > maximumLength) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        return text.strip();
    }

    public static void requireVersion(long actual, Long expected) {
        if (expected == null || expected < 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        if (actual != expected) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    public static byte[] digest(Object... fields) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            for (var field : fields) {
                byte[] value = field == null ? null : field instanceof byte[] bytes
                        ? bytes : field.toString().getBytes(StandardCharsets.UTF_8);
                digest.update(ByteBuffer.allocate(4).putInt(value == null ? -1 : value.length).array());
                if (value != null) {
                    digest.update(value);
                }
            }
            return digest.digest();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
