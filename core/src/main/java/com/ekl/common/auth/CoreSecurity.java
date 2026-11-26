package com.ekl.common.auth;

import java.util.Map;

import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
@EnableMethodSecurity
class CoreSecurity {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new DelegatingPasswordEncoder("bcrypt", Map.of("bcrypt", new BCryptPasswordEncoder()));
    }

    @Bean
    SecurityContextRepository securityContexts() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain webSecurity(HttpSecurity http, SecurityContextRepository securityContexts) throws Exception {
        return http.securityContext(context -> context.securityContextRepository(securityContexts))
                .requestCache(cache -> cache.disable())
                .logout(logout -> logout.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(EndpointRequest.to("health")).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/authentication/csrf",
                                "/api/v1/authentication/providers").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/sessions").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/me", "/api/v1/me/assignments").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/documents", "/api/v1/documents/{id}",
                                "/api/v1/document-folders", "/api/v1/document-library/capabilities").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/voices", "/api/v1/voices/capabilities",
                                "/api/v1/voices/{id}", "/api/v1/cases", "/api/v1/cases/{id}").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/documents", "/api/v1/documents/policy-preview",
                                "/api/v1/documents/{id}/versions",
                                "/api/v1/documents/{id}/versions/{version}/publish",
                                "/api/v1/documents/{id}/versions/{version}/unpublish", "/api/v1/documents/{id}/retire",
                                "/api/v1/document-folders", "/api/v1/voices/intake", "/api/v1/voices/{id}/triage",
                                "/api/v1/cases/{id}/close", "/api/v1/cases/{id}/decisions",
                                "/api/v1/knowledge", "/api/v1/knowledge/{id}/versions/{version}/retire",
                                "/api/v1/distributions", "/api/v1/distributions/{id}/acknowledgements",
                                "/api/v1/distributions/{id}/redeliver").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/document-folders/{id}",
                                "/api/v1/knowledge/{id}/versions/{version}").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/document-folders/{id}").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/sessions/current/assignment").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/sessions/current").authenticated()
                        .anyRequest().denyAll())
                .build();
    }
}
