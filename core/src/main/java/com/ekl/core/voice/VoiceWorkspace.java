package com.ekl.core.voice;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class VoiceWorkspace {
    private VoiceWorkspace() {
    }

    public record Row(UUID id, String title, String channel, String piiStatus, String triageStatus,
                      OffsetDateTime receivedAt) {
    }

    public record Detail(Row voice, String cleanText, String productCode, String urgencyHint,
                         long rowVersion, boolean canTriage) {
    }

    public record Capabilities(boolean intake) {
    }
}
