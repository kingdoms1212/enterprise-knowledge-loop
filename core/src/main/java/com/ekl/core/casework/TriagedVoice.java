package com.ekl.core.casework;

import java.util.UUID;

public record TriagedVoice(UUID id, UUID department, UUID handler, String title, String product,
                           int classification, String type, String urgency, String overrideReason) {
}
