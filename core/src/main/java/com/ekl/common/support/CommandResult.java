package com.ekl.common.support;

import java.util.UUID;

public record CommandResult(UUID id, UUID jobId, Long rowVersion) {
}
