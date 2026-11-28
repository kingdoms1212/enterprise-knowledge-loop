package com.ekl.core.distribution.controller;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CursorPage;
import com.ekl.core.distribution.DistributionInbox;
import com.ekl.core.distribution.service.DistributionInboxService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
class DistributionInboxController {
    private final DistributionInboxService inbox;

    DistributionInboxController(DistributionInboxService inbox) {
        this.inbox = inbox;
    }

    @GetMapping("/api/v1/distributions/inbox")
    @PreAuthorize("isAuthenticated()")
    public CursorPage<DistributionInbox.Item> list(HttpServletRequest request, Authentication authentication,
                                                   @RequestParam(required = false) String cursor,
                                                   @RequestParam(defaultValue = "20") int limit) {
        return inbox.list(RequestActor.from(request, authentication), cursor, limit);
    }
}
