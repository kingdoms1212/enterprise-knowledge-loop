package com.ekl.common.acl.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourcePolicyRegistration;

public interface PolicyRegistrationDao {
    boolean activeDepartment(UUID organizationId, UUID departmentId);
    boolean denyEnabled(UUID organizationId);
    Optional<UUID> departmentPrincipal(UUID organizationId, UUID departmentId);
    Optional<Template> template(ResourcePolicyRegistration registration);
    List<Rule> rules(ResourcePolicyRegistration registration, UUID template);
    Optional<FolderPolicy> inheritedPolicy(ResourcePolicyRegistration registration);
    List<Rule> currentRules(UUID acl);
    UUID acl(ResourcePolicyRegistration registration, String canonical, byte[] hash);
    void insertRule(ResourcePolicyRegistration registration, UUID acl, Rule rule);
    void registerResource(ResourcePolicyRegistration registration);
    boolean inherit(ResourcePolicyRegistration registration);
    void assignTemplate(ResourcePolicyRegistration registration, Template template, UUID acl, byte[] hash);

    record Template(UUID id, long revision, String sharing, String departmentMode, String customerMode,
                    String projectMode, boolean inherit, String name) {
    }

    record FolderPolicy(UUID acl, String name, int classification, String sharing) {
    }

    record Rule(UUID principal, String action, String effect) {
    }
}
