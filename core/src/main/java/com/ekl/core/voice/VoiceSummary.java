package com.ekl.core.voice;

import java.util.UUID;

public record VoiceSummary(UUID id, String kind, String channel, String piiStatus, String triageStatus) {
}
