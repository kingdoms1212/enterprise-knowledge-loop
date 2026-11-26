package com.ekl.common.acl;

import java.util.List;

public record RegistrationPolicyPreview(String origin, String sourceName, int classificationLevel,
                                        String sharingScope, List<RuleSummary> rules) {
    public RegistrationPolicyPreview {
        rules = List.copyOf(rules);
    }

    public record RuleSummary(String action, String effect) {
    }
}
