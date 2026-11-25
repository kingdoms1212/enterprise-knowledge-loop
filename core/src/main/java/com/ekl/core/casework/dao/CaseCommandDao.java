package com.ekl.core.casework.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.core.casework.CaseChange;
import com.ekl.core.casework.TriagedVoice;

public interface CaseCommandDao {
    boolean handlerInDepartment(UUID organization, UUID department, UUID handler);
    void createFromTriage(SessionContext session, UUID id, TriagedVoice voice);
    Optional<LockedCase> lock(UUID organization, UUID id);
    boolean validAnalysis(UUID id, UUID analysis);
    boolean unfinishedTasks(UUID id);
    UUID addDecision(UUID id, UUID actor, UUID previous, UUID analysis, String decision, String reason);
    void recordDecision(UUID id, LockedCase row, UUID decision, UUID actor);
    void addOutcome(UUID id, UUID decision, CaseChange.Outcome outcome);
    Optional<PublishedSource> publishedSource(UUID organization, CaseChange.Reference reference);
    void recordReference(UUID id, UUID actor, UUID decision, CaseChange.Reference reference, PublishedSource source);
    void close(UUID id, LockedCase row, UUID actor, UUID decision, String type, String note);

    record LockedCase(UUID department, String state, UUID decision, boolean knowledgeRequested, long version) {
    }

    record PublishedSource(UUID resource, String type, byte[] policyHash) {
    }
}
