package com.ekl.core.casework;

import java.util.UUID;

public record CaseSummary(UUID id, String title, String state, String closeType) {
}
