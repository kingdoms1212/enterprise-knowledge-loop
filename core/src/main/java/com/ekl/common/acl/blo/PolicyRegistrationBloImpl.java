package com.ekl.common.acl.blo;

import java.util.stream.Collectors;
import java.util.List;

import com.ekl.common.acl.ResourcePolicyRegistration;
import com.ekl.common.acl.RegistrationPolicyPreview;
import com.ekl.common.acl.dao.PolicyRegistrationDao;
import com.ekl.common.acl.dao.PolicyRegistrationDao.Rule;
import com.ekl.common.support.CommandRules;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class PolicyRegistrationBloImpl implements PolicyRegistrationBlo {
    private final PolicyRegistrationDao dao;

    PolicyRegistrationBloImpl(PolicyRegistrationDao dao) {
        this.dao = dao;
    }

    @Override
    public void register(ResourcePolicyRegistration registration) {
        requireDepartment(registration);
        dao.registerResource(registration);
        if (registration.parentId() != null) {
            if (!dao.inherit(registration)) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
            }
            return;
        }
        var selected = selectTemplate(registration);
        var template = selected.template();
        var rules = selected.rules();
        var canonical = rules.stream().map(rule -> "[\"" + rule.principal() + "\",\"" + rule.action() + "\",\""
                + rule.effect() + "\"]").collect(Collectors.joining(",", "[", "]"));
        var hash = CommandRules.digest("ACL-v1", canonical);
        var acl = dao.acl(registration, canonical, hash);
        rules.forEach(rule -> dao.insertRule(registration, acl, rule));
        dao.assignTemplate(registration, template, acl, CommandRules.digest(hash, template.id(), template.revision(),
                registration.departmentId(), registration.classification()));
    }

    @Override
    public RegistrationPolicyPreview preview(ResourcePolicyRegistration registration) {
        requireDepartment(registration);
        if (registration.parentId() != null) {
            var parent = dao.inheritedPolicy(registration)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT));
            return new RegistrationPolicyPreview("INHERITED", parent.name(), parent.classification(),
                    parent.sharing(), summarize(dao.currentRules(parent.acl())));
        }
        var selected = selectTemplate(registration);
        var template = selected.template();
        return new RegistrationPolicyPreview("TEMPLATE", template.name(), registration.classification(),
                template.sharing(), summarize(selected.rules()));
    }

    private void requireDepartment(ResourcePolicyRegistration registration) {
        if (registration.departmentId() == null
                || !dao.activeDepartment(registration.organizationId(), registration.departmentId())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
    }

    private SelectedTemplate selectTemplate(ResourcePolicyRegistration registration) {
        var level = registration.classification();
        if (level == null || level < 0 || level > 3) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var template = dao.template(registration).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT));
        var rules = dao.rules(registration, template.id());
        if (rules.isEmpty() || !"NOT_APPLICABLE".equals(template.customerMode())
                || !"NOT_APPLICABLE".equals(template.projectMode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        validateRules(registration, rules);
        return new SelectedTemplate(template, rules);
    }

    private List<RegistrationPolicyPreview.RuleSummary> summarize(List<Rule> rules) {
        return rules.stream().map(rule -> new RegistrationPolicyPreview.RuleSummary(rule.action(), rule.effect()))
                .distinct().toList();
    }

    private record SelectedTemplate(PolicyRegistrationDao.Template template, List<Rule> rules) {
    }

    private void validateRules(ResourcePolicyRegistration registration, List<Rule> rules) {
        if (rules.stream().anyMatch(rule -> "DENY".equals(rule.effect()))
                && !dao.denyEnabled(registration.organizationId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        if ("DOCUMENT".equals(registration.resourceType()) || "FOLDER".equals(registration.resourceType())) {
            var department = dao.departmentPrincipal(registration.organizationId(), registration.departmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT));
            var departmentRules = rules.stream().filter(rule -> department.equals(rule.principal())).toList();
            boolean canRead = departmentRules.stream().anyMatch(rule ->
                    "ALLOW".equals(rule.effect()) && "READ".equals(rule.action()));
            boolean explicitlyDenied = departmentRules.stream().anyMatch(rule ->
                    "DENY".equals(rule.effect()) && ("READ".equals(rule.action()) || "SEARCH".equals(rule.action())));
            if (!canRead || explicitlyDenied) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
        }
    }
}
