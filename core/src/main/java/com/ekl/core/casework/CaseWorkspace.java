package com.ekl.core.casework;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class CaseWorkspace {
    private CaseWorkspace() {
    }

    public record Row(UUID id, String title, String state, String closeType, OffsetDateTime createdAt) {
    }

    public record Decision(String description, String reason, OffsetDateTime decidedAt) {
    }

    public record Outcome(String result, String summary, String state) {
    }

    public record Detail(Row work, String department, String type, String urgency, String closeNote,
                         long rowVersion, Decision decision, Outcome outcome, boolean canDecide, boolean pendingTasks) {
    }
}
