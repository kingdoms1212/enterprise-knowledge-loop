package com.ekl.core.knowledge.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.support.CommandResult;
import com.ekl.common.support.service.CommandService;
import com.ekl.core.knowledge.KnowledgeReview;
import com.ekl.core.knowledge.blo.KnowledgeReviewBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class KnowledgeReviewServiceImpl implements KnowledgeReviewService {
    private final LoginService login;
    private final CommandService commands;
    private final KnowledgeReviewBlo review;

    KnowledgeReviewServiceImpl(LoginService login, CommandService commands, KnowledgeReviewBlo review) {
        this.login = login;
        this.commands = commands;
        this.review = review;
    }

    @Override
    @Transactional
    public UUID submit(RequestActor actor, UUID knowledge, UUID version, KnowledgeReview.Submit input) {
        return review.submit(lock(actor), knowledge, version, input);
    }

    @Override
    @Transactional
    public CommandResult decide(RequestActor actor, UUID step, String key, KnowledgeReview.Decision input) {
        return review.decide(lock(actor), step, key, input);
    }

    private SessionContext lock(RequestActor actor) {
        var initial = actor.context() == null ? login.current(actor) : actor.context();
        commands.lockOrganization(initial.organizationId());
        return login.current(actor);
    }
}
