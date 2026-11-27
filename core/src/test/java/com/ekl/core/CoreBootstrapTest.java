package com.ekl.core;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

import com.ekl.common.document.service.DocumentService;
import com.ekl.common.folder.service.FolderService;
import com.ekl.common.acl.ResourceReadScope;
import com.ekl.common.acl.ResourceSearchScope;
import com.ekl.common.acl.service.AclService;
import com.ekl.common.auth.service.AuthService;
import com.ekl.common.group.service.GroupService;
import com.ekl.common.support.service.IdempotencyService;
import com.ekl.common.user.service.UserService;
import com.ekl.core.audit.service.AuditService;
import com.ekl.core.casework.service.CaseService;
import com.ekl.core.distribution.service.DistributionService;
import com.ekl.core.job.service.JobService;
import com.ekl.core.job.service.DocumentParseJobService;
import com.ekl.common.document.port.DocumentParsingPort.ParseStatus;
import com.ekl.common.document.port.DocumentParsingPort.ParsedDocument;
import com.ekl.common.document.port.DocumentParsingPort.ParsedSegment;
import com.ekl.core.knowledge.service.KnowledgeService;
import com.ekl.core.retrieval.service.RetrievalService;
import com.ekl.core.voice.service.VoiceService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.Logger;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.Property;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(CoreBootstrapTest.TransactionProbeService.class)
class CoreBootstrapTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Path ROOT = Path.of("..").toAbsolutePath().normalize();
    private static final String SMOKE_DATABASE = "ekl_sql_smoke";

    @TempDir
    private static Path blobRoot;

    @Container
    private static final GenericContainer<?> DATABASE = new GenericContainer<>(
            DockerImageName.parse("pgvector/pgvector:0.8.1-pg16"))
            .withExposedPorts(5432)
            .withEnv("POSTGRES_DB", "ekl")
            .withEnv("POSTGRES_PASSWORD", "test-admin")
            .withEnv("EKL_DB_OWNER_PASSWORD", "test-owner")
            .withEnv("EKL_DB_APP_PASSWORD", "test-app")
            .withCopyFileToContainer(MountableFile.forHostPath(ROOT.resolve("infra/db/init-ekl.sh")),
                    "/docker-entrypoint-initdb.d/10-ekl.sh");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> jdbcUrl("ekl"));
        registry.add("spring.datasource.username", () -> "ekl_app");
        registry.add("spring.datasource.password", () -> "test-app");
        registry.add("spring.flyway.user", () -> "ekl_owner");
        registry.add("spring.flyway.password", () -> "test-owner");
        registry.add("ekl.blob-root", () -> blobRoot.toString());
    }

    private static String jdbcUrl(String database) {
        return "jdbc:postgresql://%s:%d/%s".formatted(DATABASE.getHost(), DATABASE.getMappedPort(5432), database);
    }

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private TransactionProbeService transactionProbe;

    @Autowired
    private DocumentService documents;

    @Autowired
    private FolderService folders;

    @Autowired
    private AclService policies;

    @Autowired
    private AuthService auth;

    @Autowired
    private GroupService groups;

    @Autowired
    private IdempotencyService idempotency;

    @Autowired
    private UserService users;

    @Autowired
    private AuditService audit;

    @Autowired
    private CaseService cases;

    @Autowired
    private DistributionService distributions;

    @Autowired
    private JobService jobs;

    @Autowired
    private DocumentParseJobService parseJobs;

    @Autowired
    private KnowledgeService knowledge;

    @Autowired
    private RetrievalService retrieval;

    @Autowired
    private VoiceService voices;

    @Autowired
    private PasswordEncoder passwords;

    @LocalServerPort
    private int port;

    @Test
    void migrationsProvisionTheSchemaAndTheAppUsesItsOwnRole() throws Exception {
        var history = DATABASE.execInContainer("psql", "-U", "postgres", "-d", "ekl", "-Atc",
                "select version from public.flyway_schema_history where success order by installed_rank");
        assertThat(history.getExitCode()).as(history.getStderr()).isZero();
        assertThat(history.getStdout().lines().toList()).containsExactlyElementsOf(
                java.util.stream.IntStream.rangeClosed(1, 22).mapToObj(Integer::toString).toList());
        assertThat(jdbc.queryForObject("select current_user", String.class)).isEqualTo("ekl_app");
        assertThat(jdbc.queryForObject("select has_schema_privilege(current_user, 'iam', 'CREATE')",
                Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("select count(*) from pg_extension where extname = 'vector'",
                Integer.class)).isEqualTo(1);
    }

    @Test
    void restoredSqlSmokeTestsPass() throws Exception {
        var created = DATABASE.execInContainer("createdb", "-U", "postgres", "-O", "ekl_owner", SMOKE_DATABASE);
        assertThat(created.getExitCode()).as(created.getStderr()).isZero();
        var vector = DATABASE.execInContainer("psql", "-U", "postgres", "-d", SMOKE_DATABASE,
                "-c", "create extension vector with schema public");
        assertThat(vector.getExitCode()).as(vector.getStderr()).isZero();
        Flyway.configure().dataSource(jdbcUrl(SMOKE_DATABASE), "ekl_owner", "test-owner")
                .load().migrate();

        List<Path> scripts;
        try (var files = Files.list(ROOT.resolve("db"))) {
            scripts = files.filter(path -> path.getFileName().toString().matches("smoke_test(_v\\d+)?\\.sql"))
                    .sorted().toList();
        }
        assertThat(scripts).hasSize(12);
        for (var script : scripts) {
            var containerPath = "/tmp/" + script.getFileName();
            DATABASE.copyFileToContainer(MountableFile.forHostPath(script), containerPath);
            var result = DATABASE.execInContainer("psql", "-X", "-U", "postgres", "-d", SMOKE_DATABASE,
                    "-v", "ON_ERROR_STOP=1", "-Atf", containerPath);
            assertThat(result.getExitCode()).as("%s: %s", script.getFileName(), result.getStderr()).isZero();
            assertThat(result.getStdout()).as(script.getFileName().toString()).contains("PASS|")
                    .doesNotContain("\nFAIL|");
        }
    }

    @Test
    void healthIsAvailableAndBusinessRoutesAreClosedByDefault() throws Exception {
        var client = HttpClient.newHttpClient();
        var health = client.send(request("/actuator/health"), HttpResponse.BodyHandlers.ofString());
        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(health.body()).contains("\"status\":\"UP\"");

        var documents = client.send(request("/api/v1/documents"), HttpResponse.BodyHandlers.ofString());
        assertThat(documents.statusCode()).isEqualTo(403);
    }

    @Test
    void serviceAopRollsBackCheckedExceptionsAndSupportsReadOnlyQueries() {
        assertThat(transactionProbe.databaseReadOnlyMode()).isEqualTo("on");

        assertThatThrownBy(transactionProbe::writeThenFail).isExactlyInstanceOf(ProbeFailure.class);

        assertThat(jdbc.queryForObject("""
                select count(*) from ops.scheduled_locks where name = 'transaction-probe'
                """, Integer.class)).isZero();
    }

    @Test
    @Sql("/document-library.sql")
    @Transactional
    void readsDocumentsAndFoldersThroughTheirServiceInterfaces() {
        var organizationId = fixtureId(1);
        var departmentId = fixtureId(2);
        var aclId = fixtureId(4);
        var folderId = fixtureId(5);
        var documentId = fixtureId(6);
        var documentScope = new ResourceReadScope(organizationId, documentId, aclId, 1);
        var folderScope = new ResourceReadScope(organizationId, folderId, aclId, 1);

        assertThat(AopUtils.isAopProxy(documents)).isTrue();
        assertThat(AopUtils.isAopProxy(folders)).isTrue();
        assertThat(documents.findReadable(documentId, documentScope)).hasValueSatisfying(document -> {
            assertThat(document.title()).isEqualTo("Search runbook");
            assertThat(document.folderId()).isEqualTo(folderId);
            assertThat(document.currentVersionId()).isEqualTo(fixtureId(7));
            assertThat(document.versionNumber()).isEqualTo(1);
            assertThat(document.parseStatus()).isEqualTo("PARSED");
        });
        assertThat(folders.findReadable(folderId, folderScope)).hasValueSatisfying(folder -> {
            assertThat(folder.name()).isEqualTo("Runbooks");
            assertThat(folder.ownerDepartmentId()).isEqualTo(departmentId);
        });

        assertThat(documents.findReadable(documentId, null)).isEmpty();
        assertThat(documents.findReadable(documentId, folderScope)).isEmpty();
        assertThat(folders.findReadable(folderId,
                new ResourceReadScope(fixtureId(99), folderId, aclId, 1))).isEmpty();
        jdbc.update("update iam.resource_policies set policy_revision = 2 where resource_id = ?", documentId);
        assertThat(documents.findReadable(documentId, documentScope)).isEmpty();
        jdbc.update("update intake.document_folders set archived_at = now(), archived_by = ? where id = ?",
                fixtureId(3), folderId);
        assertThat(folders.findReadable(folderId, folderScope)).isEmpty();
    }

    @Test
    @Sql({"/document-library.sql", "/core-layer-fixtures.sql"})
    @Transactional
    void queriesCommonAndEklPackagesThroughTheirServiceInterfaces() {
        var organizationId = fixtureId(1);
        var accountId = fixtureId(3);
        var documentId = fixtureId(6);

        assertThat(users.findActiveUser(organizationId, accountId)).hasValueSatisfying(user ->
                assertThat(user.displayName()).isEqualTo("Test user"));
        assertThat(users.findActiveUser(fixtureId(99), accountId)).isEmpty();
        assertThat(auth.findActiveAssignments(organizationId, accountId))
                .extracting(assignment -> assignment.id())
                .containsExactly(fixtureId(9), fixtureId(10));
        assertThat(groups.findActiveGroups(organizationId, fixtureId(9)))
                .extracting(group -> group.id())
                .containsExactly(fixtureId(11));
        assertThat(groups.findActiveGroups(organizationId, fixtureId(10))).isEmpty();

        assertThat(policies.findReadable(documentId, readScope(6))).hasValueSatisfying(policy ->
                assertThat(policy.classificationLevel()).isEqualTo(1));
        assertThat(policies.findReadable(documentId, readScope(5))).isEmpty();
        assertThat(voices.findReadable(fixtureId(13), readScope(13))).hasValueSatisfying(voice ->
                assertThat(voice.triageStatus()).isEqualTo("RECEIVED"));
        assertThat(cases.findReadable(fixtureId(14), readScope(14))).hasValueSatisfying(caseSummary ->
                assertThat(caseSummary.state()).isEqualTo("OPEN"));
        assertThat(knowledge.findReadable(fixtureId(16), readScope(16))).hasValueSatisfying(version ->
                assertThat(version.state()).isEqualTo("DRAFT"));
        assertThat(distributions.findReadable(fixtureId(16), readScope(16))).hasValueSatisfying(distribution ->
                assertThat(distribution.state()).isEqualTo("PLANNED"));
        assertThat(voices.findReadable(fixtureId(13), null)).isEmpty();
        assertThat(cases.findReadable(fixtureId(14), readScope(13))).isEmpty();

        var hash = jdbc.queryForObject("select sha256('library-request')", byte[].class);
        assertThat(idempotency.findMatchingResponseStatus(accountId, "POST /documents", "library-test-key", hash))
                .contains(202);
        assertThat(idempotency.findMatchingResponseStatus(accountId, "POST /documents", "library-test-key",
                new byte[] {1})).isEmpty();
        assertThat(jobs.findOutboxJob(documentId, fixtureId(18))).hasValueSatisfying(job ->
                assertThat(job.eventType()).isEqualTo("IndexRequested"));
        assertThat(jobs.findOutboxJob(fixtureId(99), fixtureId(18))).isEmpty();
        var occurredAt = OffsetDateTime.parse("2026-01-04T10:00:00Z");
        assertThat(audit.findEvent(organizationId, fixtureId(19), occurredAt)).hasValueSatisfying(event ->
                assertThat(event.decision()).isEqualTo("ALLOW"));
        assertThat(audit.findEvent(fixtureId(99), fixtureId(19), occurredAt)).isEmpty();

        var searchScope = new ResourceSearchScope(organizationId, documentId, fixtureId(4), 1);
        assertThat(retrieval.searchKeywords(searchScope, "runbook", 10)).isEmpty();
        jdbc.update("""
                update intake.document_versions set publish_state = 'PUBLISHED', published_by = ?, published_at = now()
                where id = ?
                """, accountId, fixtureId(7));
        jdbc.update("""
                update intake.documents set published_version_id = ?, active_index_revision_id = ? where id = ?
                """, fixtureId(7), fixtureId(28), documentId);
        assertThat(retrieval.searchKeywords(searchScope, "runbook", 10)).singleElement().satisfies(hit -> {
            assertThat(hit.chunkId()).isEqualTo(fixtureId(29));
            assertThat(hit.versionId()).isEqualTo(fixtureId(7));
            assertThat(hit.sourceLocator()).isEqualTo("{\"page\": 3}");
        });
        assertThat(retrieval.searchKeywords(new ResourceSearchScope(organizationId, documentId, fixtureId(4), 2),
                "runbook", 10)).isEmpty();
        assertThat(retrieval.searchKeywords(searchScope, " ", 10)).isEmpty();
    }

    @Test
    @Sql({"/login-fixtures.sql", "/document-access-fixtures.sql"})
    void localSessionsPersistAndServiceLogsOmitInputData() throws Exception {
        var organizationId = loginFixtureId(1);
        var accountId = loginFixtureId(21);
        var password = "test-only-credential-canary";
        var encoderHash = passwords.encode(password);
        jdbc.update("""
                insert into iam.account_credentials(account_id, credential_type, password_hash)
                values (?, 'LOCAL_PASSWORD', ?), (?, 'LOCAL_PASSWORD', ?)
                """, accountId, encoderHash, loginFixtureId(22), encoderHash);

        var client = HttpClient.newHttpClient();
        var documentId = loginFixtureId(54);
        var documentPath = "/api/v1/documents/" + documentId;
        assertThat(authRequest(client, "GET", documentPath, null, null, null).statusCode()).isIn(401, 403);
        var loginJson = """
                {"organization_id":"%s","employee_number":"00042","password":"%s"}
                """.formatted(organizationId, password);
        var preLogin = csrf(client, null);
        try (var logs = new ServiceLogCapture()) {
            assertThat(authRequest(client, "POST", "/api/v1/sessions", loginJson, preLogin.cookie(), null)
                    .statusCode()).isEqualTo(403);
            assertThat(authRequest(client, "POST", "/api/v1/sessions",
                    loginJson.replace(password, "wrong-credential-canary"), preLogin.cookie(), preLogin)
                    .statusCode()).isEqualTo(401);

            var login = authRequest(client, "POST", "/api/v1/sessions", loginJson, preLogin.cookie(), preLogin);
            assertThat(login.statusCode()).as(login.body()).isEqualTo(200);
            var loginBody = JSON.readTree(login.body());
            assertThat(loginBody.get("employeeNumber").asString()).isEqualTo("00042");
            assertThat(loginBody.get("assignmentId").isNull()).isTrue();
            var authenticatedCookie = cookie(login);
            assertThat(authenticatedCookie).isNotEqualTo(preLogin.cookie());
            assertThat(login.headers().allValues("Set-Cookie")).anyMatch(value ->
                    value.contains("Secure") && value.contains("HttpOnly"));
            assertThat(authRequest(client, "GET", "/api/v1/me", null, preLogin.cookie(), null)
                    .statusCode()).isIn(401, 403);
            assertThat(authRequest(client, "GET", "/api/v1/me/assignments", null, authenticatedCookie, null)
                    .body()).contains(loginFixtureId(41).toString(), loginFixtureId(42).toString())
                    .doesNotContain(loginFixtureId(43).toString());
            assertThat(authRequest(client, "GET", documentPath, null, authenticatedCookie, null)
                    .statusCode()).isEqualTo(404);

            var authenticatedCsrf = csrf(client, authenticatedCookie);
            var assignmentBody = """
                    {"assignment_id":"%s","expected_revision":1}
                    """;
            assertThat(authRequest(client, "PUT", "/api/v1/sessions/current/assignment",
                    assignmentBody.formatted(loginFixtureId(43)), authenticatedCookie, authenticatedCsrf)
                    .statusCode()).isEqualTo(403);
            var selected = authRequest(client, "PUT", "/api/v1/sessions/current/assignment",
                    assignmentBody.formatted(loginFixtureId(42)), authenticatedCookie, authenticatedCsrf);
            assertThat(selected.statusCode()).as(selected.body()).isEqualTo(200);
            assertThat(JSON.readTree(selected.body()).get("contextRevision").asLong()).isEqualTo(2L);
            assertThat(authRequest(client, "PUT", "/api/v1/sessions/current/assignment",
                    assignmentBody.formatted(loginFixtureId(41)), authenticatedCookie, authenticatedCsrf)
                    .statusCode()).isEqualTo(409);
            assertThat(jdbc.queryForObject("select assignment_id from iam.session_contexts where account_id = ?",
                    UUID.class, accountId)).isEqualTo(loginFixtureId(42));

            var noRole = authRequest(client, "GET", documentPath, null, authenticatedCookie, null);
            assertThat(noRole.statusCode()).isEqualTo(404);
            assertThat(noRole.body()).doesNotContain("ACL-filtered operating manual");
            var noList = authRequest(client, "GET", "/api/v1/documents", null, authenticatedCookie, null);
            assertThat(noList.statusCode()).isEqualTo(200);
            assertThat(JSON.readTree(noList.body()).get("items").size()).isZero();
            var switchToPrimary = authRequest(client, "PUT", "/api/v1/sessions/current/assignment",
                    assignmentBody.formatted(loginFixtureId(41)).replace(":1", ":2"),
                    authenticatedCookie, authenticatedCsrf);
            assertThat(switchToPrimary.statusCode()).as(switchToPrimary.body()).isEqualTo(200);
            var detail = authRequest(client, "GET", documentPath, null, authenticatedCookie, null);
            assertThat(detail.statusCode()).as(detail.body()).isEqualTo(200);
            var detailJson = JSON.readTree(detail.body());
            assertThat(detailJson.get("document").get("title").asString()).isEqualTo("ACL-filtered operating manual");
            assertThat(detailJson.get("versions").get(0).get("versionNumber").asInt()).isEqualTo(2);
            assertThat(detailJson.get("versions").get(1).get("parseStatus").asString()).isEqualTo("PARSED");
            assertThat(detailJson.get("policy").get("classificationLevel").asInt()).isEqualTo(1);
            var visible = authRequest(client, "GET", "/api/v1/documents?view=RECENT", null, authenticatedCookie, null);
            assertThat(visible.statusCode()).as(visible.body()).isEqualTo(200);
            assertThat(visible.body()).contains("ACL-filtered operating manual").doesNotContain(loginFixtureId(57).toString());
            assertThat(jdbc.queryForObject("""
                    select count(*) from audit.audit_events
                    where actor_id = ? and target_resource_id = ? and decision = 'ALLOW' and action = 'READ'
                    """, Integer.class, accountId, documentId)).isEqualTo(1);

            jdbc.update("""
                    insert into iam.resource_dependencies(resource_id, depends_on_resource_id) values (?, ?)
                    """, documentId, loginFixtureId(57));
            assertThat(authRequest(client, "GET", documentPath, null, authenticatedCookie, null)
                    .statusCode()).isEqualTo(404);
            var restricted = authRequest(client, "GET", "/api/v1/documents?view=RECENT", null, authenticatedCookie, null);
            assertThat(restricted.statusCode()).isEqualTo(200);
            assertThat(JSON.readTree(restricted.body()).get("items").size()).isZero();
            assertThat(jdbc.queryForObject("""
                    select count(*) from audit.audit_events where actor_id = ? and target_resource_id = ?
                    and decision = 'DENY' and reason_code = 'SOURCE_READ_REQUIRED'
                    """, Integer.class, accountId, documentId)).isEqualTo(1);

            exerciseWriteFlows(client, authenticatedCookie, authenticatedCsrf);

            jdbc.update("update iam.users set auth_version = auth_version + 1 where id = ?", accountId);
            assertThat(authRequest(client, "GET", "/api/v1/me", null, authenticatedCookie, null)
                    .statusCode()).isEqualTo(401);
            assertThat(authRequest(client, "DELETE", "/api/v1/sessions/current", null,
                    authenticatedCookie, authenticatedCsrf).statusCode()).isEqualTo(204);
            assertThat(jdbc.queryForObject("select count(*) from iam.session_contexts where account_id = ?",
                    Integer.class, accountId)).isZero();

            var secondCsrf = csrf(client, null);
            var autoSelected = authRequest(client, "POST", "/api/v1/sessions", loginJson.replace("00042", "00043"),
                    secondCsrf.cookie(), secondCsrf);
            assertThat(autoSelected.statusCode()).as(autoSelected.body()).isEqualTo(200);
            assertThat(JSON.readTree(autoSelected.body()).get("assignmentId").asString())
                    .isEqualTo(loginFixtureId(43).toString());
            var secondCookie = cookie(autoSelected);
            assertThat(authRequest(client, "DELETE", "/api/v1/sessions/current", null,
                    secondCookie, csrf(client, secondCookie)).statusCode()).isEqualTo(204);
            assertThat(jdbc.queryForObject("select count(*) from iam.session_contexts where account_id = ?",
                    Integer.class, loginFixtureId(22))).isZero();

            assertThat(documents.findReadable(loginFixtureId(1), null)).isEmpty();
            assertThat(logs.messages).anyMatch(line -> line.contains("method=authenticate outcome=SUCCESS")
                    && line.contains("duration_ms="));
            assertThat(logs.messages).anyMatch(line -> line.contains("method=authenticate outcome=FAILURE")
                    && line.contains("error_type=ResponseStatusException"));
            assertThat(logs.messages).anyMatch(line ->
                    line.contains("service=DocumentServiceImpl method=findReadable outcome=SUCCESS"));
            assertThat(logs.messages).noneMatch(line -> line.contains(password)
                    || line.contains("wrong-credential-canary") || line.contains(accountId.toString())
                    || line.contains("Document contents canary") || line.contains("VOC body canary"));
        }
    }

    private void exerciseWriteFlows(HttpClient client, String cookie, Csrf token) throws Exception {
        var department = loginFixtureId(2);
        var actor = loginFixtureId(21);
        var folderBody = """
                {"owner_department_id":"%s","name":"Write test folder","classification_level":2}
                """.formatted(department);
        var createFolder = keyedRequest(client, "/api/v1/document-folders", folderBody, cookie, token, "folder-1");
        assertThat(createFolder.statusCode()).as(createFolder.body()).isEqualTo(201);
        var folder = UUID.fromString(JSON.readTree(createFolder.body()).get("folder_id").asString());
        var duplicate = keyedRequest(client, "/api/v1/document-folders", folderBody, cookie, token, "folder-1");
        assertThat(duplicate.statusCode()).isEqualTo(201);
        assertThat(duplicate.body()).contains(folder.toString());
        assertThat(keyedRequest(client, "/api/v1/document-folders", folderBody.replace("Write test", "Different"),
                cookie, token, "folder-1").statusCode()).isEqualTo(409);
        var folderPath = "/api/v1/document-folders/" + folder;
        assertThat(authRequest(client, "PATCH", folderPath, """
                {"name":"Renamed folder","expected_version":0}
                """, cookie, token).statusCode()).isEqualTo(200);
        assertThat(authRequest(client, "PATCH", folderPath, """
                {"name":"Stale rename","expected_version":0}
                """, cookie, token).statusCode()).isEqualTo(409);
        var secondFolder = keyedRequest(client, "/api/v1/document-folders",
                folderBody.replace("Write test folder", "Second test folder"), cookie, token, "folder-2");
        assertThat(secondFolder.statusCode()).as(secondFolder.body()).isEqualTo(201);
        var foldersPath = "/api/v1/document-folders?owner_department_id=" + department + "&limit=1";
        var firstPage = authRequest(client, "GET", foldersPath, null, cookie, null);
        assertThat(firstPage.statusCode()).as(firstPage.body()).isEqualTo(200);
        var firstFolders = JSON.readTree(firstPage.body());
        assertThat(firstFolders.get("items").size()).isEqualTo(1);
        assertThat(firstFolders.get("nextCursor").isNull()).isFalse();
        var nextPage = authRequest(client, "GET", foldersPath + "&cursor=" + firstFolders.get("nextCursor").asString(),
                null, cookie, null);
        assertThat(nextPage.statusCode()).as(nextPage.body()).isEqualTo(200);
        var nextFolders = JSON.readTree(nextPage.body());
        assertThat(nextFolders.get("items").size()).isEqualTo(1);
        assertThat(nextFolders.get("nextCursor").isNull()).isTrue();
        assertThat(nextFolders.get("items").get(0)).isNotEqualTo(firstFolders.get("items").get(0));

        var previewBody = """
                {"owner_department_id":"%s","classification_level":2,"folder_id":"%s"}
                """.formatted(department, folder);
        var preview = authRequest(client, "POST", "/api/v1/documents/policy-preview", previewBody, cookie, token);
        assertThat(preview.statusCode()).as(preview.body()).isEqualTo(200);
        assertThat(preview.body()).contains("INHERITED", "Renamed folder", "READ").doesNotContain(loginFixtureId(52).toString());
        assertThat(authRequest(client, "POST", "/api/v1/documents/policy-preview",
                previewBody.replace(folder.toString(), UUID.randomUUID().toString()), cookie, token).statusCode()).isEqualTo(404);

        var upload = uploadTextDocument(client, cookie, token, folder, department);
        assertThat(upload.statusCode()).as(upload.body()).isEqualTo(202);
        var document = UUID.fromString(JSON.readTree(upload.body()).get("document_id").asString());
        var folderDocuments = authRequest(client, "GET", "/api/v1/documents?folder_id=" + folder, null, cookie, null);
        assertThat(folderDocuments.statusCode()).as(folderDocuments.body()).isEqualTo(200);
        assertThat(folderDocuments.body()).contains(document.toString());
        var version = jdbc.queryForObject("select current_version_id from intake.documents where id = ?", UUID.class,
                document);
        assertThat(jdbc.queryForObject("""
                select p.acl_id = f.acl_id and p.acl_origin = 'INHERITED'
                from iam.resource_policies p join iam.resource_policies f on f.resource_id = p.parent_resource_id
                where p.resource_id = ?
                """, Boolean.class, document)).isTrue();
        assertThat(authRequest(client, "DELETE", folderPath, null, cookie, token).statusCode()).isEqualTo(409);
        var documentPath = "/api/v1/documents/" + document;
        var publish = documentPath + "/versions/" + version + "/publish";
        var versionOne = "{\"expected_version\":1}";
        assertThat(keyedRequest(client, publish, versionOne, cookie, token, "publish-1").statusCode()).isEqualTo(409);
        var originalJob = parseJobs.claim().orElseThrow();
        assertThat(originalJob.version()).isEqualTo(version);
        assertThat(parseJobs.input(originalJob).orElseThrow().mime()).isEqualTo("text/plain");
        parseJobs.fail(originalJob, "AI_UNAVAILABLE", true);
        assertThat(jdbc.queryForObject("select state from ops.outbox where event_id = ?",
                String.class, originalJob.id())).isEqualTo("RETRY_WAIT");
        jdbc.update("update ops.outbox set available_at = now() where event_id = ?", originalJob.id());
        var retry = parseJobs.claim().orElseThrow();
        assertThat(retry.id()).isEqualTo(originalJob.id());
        assertThat(retry.lease()).isNotEqualTo(originalJob.lease());
        var parsed = new ParsedDocument(ParseStatus.PARSED,
                List.of(new ParsedSegment(null, 1, "Document contents canary")));
        parseJobs.succeed(originalJob, parsed);
        assertThat(jdbc.queryForObject("select parse_status from intake.document_versions where id = ?",
                String.class, version)).isEqualTo("PENDING");
        parseJobs.succeed(retry, parsed);
        assertThat(jdbc.queryForObject("""
                select parse_result -> 0 ->> 'text' from intake.document_versions where id = ?
                """, String.class, version)).isEqualTo("Document contents canary");
        assertThat(jdbc.queryForObject("select state from ops.outbox where event_id = ?",
                String.class, retry.id())).isEqualTo("SUCCEEDED");
        var published = keyedRequest(client, publish, versionOne, cookie, token, "publish-1");
        assertThat(published.statusCode()).as(published.body()).isEqualTo(202);
        assertThat(keyedRequest(client, publish, versionOne, cookie, token, "publish-1").body())
                .isEqualTo(published.body());
        exerciseKnowledgeAndDistribution(client, cookie, token, version, department, actor);
        var versionsPath = documentPath + "/versions";
        var documentBlob = jdbc.queryForObject("select blob_key from intake.document_versions where id = ?",
                String.class, version);
        assertThat(Files.readString(blobRoot.resolve(documentBlob))).isEqualTo("Document contents canary");
        assertThat(uploadTextVersion(client, cookie, token, versionsPath, "Document contents canary").statusCode())
                .isEqualTo(409);
        var appended = uploadTextVersion(client, cookie, token, versionsPath, "Second version canary");
        assertThat(appended.statusCode()).as(appended.body()).isEqualTo(202);
        var nextVersion = jdbc.queryForObject("select current_version_id from intake.documents where id = ?",
                UUID.class, document);
        assertThat(nextVersion).isNotEqualTo(version);
        jdbc.update("update intake.document_versions set parse_status = 'PARSED' where id = ?", nextVersion);
        var replacement = keyedRequest(client, versionsPath + "/" + nextVersion + "/publish",
                "{\"expected_version\":3}", cookie, token, "publish-2");
        assertThat(replacement.statusCode()).as(replacement.body()).isEqualTo(202);
        assertThat(jdbc.queryForObject("select publish_state from intake.document_versions where id = ?",
                String.class, version)).isEqualTo("RETIRED");
        var withdrawal = authRequest(client, "POST", versionsPath + "/" + nextVersion + "/unpublish",
                "{\"expected_version\":4}", cookie, token);
        assertThat(withdrawal.statusCode()).as(withdrawal.body()).isEqualTo(200);
        assertThat(jdbc.queryForObject("select published_version_id from intake.documents where id = ?", UUID.class,
                document)).isNull();
        assertThat(authRequest(client, "GET", documentPath, null, cookie, null).statusCode()).isEqualTo(200);
        assertThat(authRequest(client, "POST", documentPath + "/retire", """
                {"reason":"Test disposal","expected_version":5}
                """, cookie, token).statusCode()).isEqualTo(200);
        assertThat(authRequest(client, "GET", documentPath, null, cookie, null).statusCode()).isEqualTo(404);
        assertThat(authRequest(client, "DELETE", folderPath, null, cookie, token).statusCode()).isEqualTo(204);

        var intake = keyedRequest(client, "/api/v1/voices/intake", """
                {"title":"Manual VOC","body":"VOC body canary","product_code":"TEST",
                 "received_at":"2026-01-01T00:00:00Z"}
                """, cookie, token, "voice-1");
        assertThat(intake.statusCode()).as(intake.body()).isEqualTo(202);
        var voice = UUID.fromString(JSON.readTree(intake.body()).get("voice_id").asString());
        var triage = "/api/v1/voices/" + voice + "/triage";
        var triageBody = """
                {"type_final":"INQUIRY","urgency_final":"NORMAL","primary_department_id":"%s","handler_id":"%s",
                 "expected_version":0}
                """.formatted(department, actor);
        jdbc.update("update iam.employments set clearance_level = 3 where id = ?", loginFixtureId(31));
        var voicePath = "/api/v1/voices/" + voice;
        var unclean = authRequest(client, "GET", voicePath, null, cookie, null);
        assertThat(unclean.statusCode()).as(unclean.body()).isEqualTo(200);
        assertThat(JSON.readTree(unclean.body()).get("cleanText").isNull()).isTrue();
        assertThat(unclean.body()).doesNotContain("VOC body canary");
        assertThat(authRequest(client, "GET", "/api/v1/voices", null, cookie, null).body())
                .contains(voice.toString()).doesNotContain("VOC body canary");
        assertThat(keyedRequest(client, triage, triageBody, cookie, token, "triage-1").statusCode()).isEqualTo(409);
        jdbc.update("""
                update intake.voices set pii_status = 'CLEANED', clean_text = 'Cleaned test input',
                    triage_status = 'ANALYSIS_FAILED' where id = ?
                """, voice);
        var cleaned = authRequest(client, "GET", voicePath, null, cookie, null);
        assertThat(cleaned.statusCode()).as(cleaned.body()).isEqualTo(200);
        assertThat(cleaned.body()).contains("Cleaned test input").doesNotContain("VOC body canary");
        assertThat(JSON.readTree(cleaned.body()).get("canTriage").asBoolean()).isTrue();
        var triaged = keyedRequest(client, triage, triageBody, cookie, token, "triage-1");
        assertThat(triaged.statusCode()).as(triaged.body()).isEqualTo(201);
        var caseId = UUID.fromString(JSON.readTree(triaged.body()).get("case_id").asString());
        var openedCase = authRequest(client, "GET", "/api/v1/cases/" + caseId, null, cookie, null);
        assertThat(openedCase.statusCode()).as(openedCase.body()).isEqualTo(200);
        assertThat(JSON.readTree(openedCase.body()).get("canDecide").asBoolean()).isTrue();
        assertThat(authRequest(client, "GET", "/api/v1/cases", null, cookie, null).body()).contains(caseId.toString());
        var close = "/api/v1/cases/" + caseId + "/close";
        var closed = keyedRequest(client, close, """
                {"close_type":"NO_REPLY_NEEDED","close_note":"No reply required","expected_version":0}
                """, cookie, token, "close-1");
        assertThat(closed.statusCode()).as(closed.body()).isEqualTo(200);
        var closedCase = authRequest(client, "GET", "/api/v1/cases/" + caseId, null, cookie, null);
        assertThat(closedCase.statusCode()).as(closedCase.body()).isEqualTo(200);
        assertThat(closedCase.body()).contains("NO_REPLY_NEEDED", "No reply required");
        assertThat(JSON.readTree(closedCase.body()).get("canDecide").asBoolean()).isFalse();
        assertThat(jdbc.queryForObject("select close_type from casework.cases where id = ?", String.class, caseId))
                .isEqualTo("NO_REPLY_NEEDED");
        assertThat(jdbc.queryForObject("select count(*) from casework.outcomes where case_id = ?", Integer.class,
                caseId)).isZero();
    }

    private void exerciseKnowledgeAndDistribution(HttpClient client, String cookie, Csrf token, UUID source,
                                                  UUID department, UUID actor) throws Exception {
        var draft = keyedRequest(client, "/api/v1/knowledge", """
                {"title":"Write test knowledge","body":"Reference summary",
                 "source_refs":[{"source_role":"PRIMARY","document_version_id":"%s","source_locator":"p. 1"}]}
                """.formatted(source), cookie, token, "knowledge-1");
        assertThat(draft.statusCode()).as(draft.body()).isEqualTo(201);
        var payload = JSON.readTree(draft.body());
        var knowledgeId = UUID.fromString(payload.get("knowledge_id").asString());
        var version = UUID.fromString(payload.get("version_id").asString());
        assertThat(jdbc.queryForObject("select state from knowledge.knowledge_versions where id = ?", String.class,
                version)).isEqualTo("DRAFT");
        var knowledgePath = "/api/v1/knowledge/" + knowledgeId + "/versions/" + version;
        var editBody = """
                {"body":"Updated draft","expected_version":0}
                """;
        var edited = authRequest(client, "PATCH", knowledgePath, editBody, cookie, token);
        assertThat(edited.statusCode()).as(edited.body()).isEqualTo(200);
        assertThat(authRequest(client, "PATCH", knowledgePath, editBody, cookie, token).statusCode()).isEqualTo(409);
        assertThat(jdbc.queryForObject("select body from knowledge.knowledge_version_edits where version_id = ?",
                String.class, version)).isEqualTo("Updated draft");

        var distributionBody = """
                {"version_id":"%s","department_ids":["%s"],"reason":"Command test","ack_required":true}
                """.formatted(version, department);
        var distributionPath = "/api/v1/distributions";
        assertThat(keyedRequest(client, distributionPath, distributionBody, cookie, token, "distribution-1")
                .statusCode()).isEqualTo(404);
        jdbc.update("update knowledge.knowledge_versions set state = 'PUBLISHED', published_at = now() where id = ?",
                version);
        var queued = keyedRequest(client, distributionPath, distributionBody, cookie, token, "distribution-1");
        assertThat(queued.statusCode()).as(queued.body()).isEqualTo(202);
        var distribution = UUID.fromString(JSON.readTree(queued.body()).get("distribution_id").asString());
        assertThat(jdbc.queryForObject("select state from distribution.distributions where id = ?", String.class,
                distribution)).isEqualTo("QUEUED");
        assertThat(keyedRequest(client, distributionPath, distributionBody, cookie, token, "distribution-duplicate")
                .statusCode()).isEqualTo(409);
        var acknowledge = distributionPath + "/" + distribution + "/acknowledgements";
        assertThat(authRequest(client, "POST", acknowledge, null, cookie, token).statusCode()).isEqualTo(404);

        var index = loginFixtureId(68);
        jdbc.update("""
                insert into knowledge.index_revisions(id, version_id, pipeline_version_id, policy_revision,
                    effective_policy_hash, security_metadata, vector_state, keyword_state)
                values (?, ?, ?, 1, sha256('test index'), '{}', 'READY', 'READY')
                """, index, version, loginFixtureId(67));
        jdbc.update("update knowledge.knowledge set active_version_id = ?, active_index_revision_id = ? where id = ?",
                version, index, knowledgeId);
        jdbc.update("update distribution.distributions set state = 'PARTIAL_FAILED', delivered_at = now() where id = ?",
                distribution);
        var redeliver = distributionPath + "/" + distribution + "/redeliver";
        assertThat(keyedRequest(client, redeliver, "{}", cookie, token, "redelivery-1").statusCode()).isEqualTo(409);
        jdbc.update("""
                insert into distribution.distribution_deliveries(distribution_id, user_id, department_id,
                    state, attempts, last_error) values (?, ?, ?, 'FAILED', 1, 'TEST')
                """, distribution, loginFixtureId(22), loginFixtureId(3));
        var redelivery = keyedRequest(client, redeliver, "{}", cookie, token, "redelivery-1");
        assertThat(redelivery.statusCode()).as(redelivery.body()).isEqualTo(202);
        assertThat(keyedRequest(client, redeliver, "{}", cookie, token, "redelivery-1").body())
                .isEqualTo(redelivery.body());
        assertThat(keyedRequest(client, redeliver, "{}", cookie, token, "redelivery-2").statusCode()).isEqualTo(409);
        jdbc.update("""
                insert into distribution.receipts(distribution_id, user_id, department_id, version_id)
                values (?, ?, ?, ?)
                """, distribution, actor, department, version);
        jdbc.update("""
                insert into distribution.receipt_bases(distribution_id, user_id, assignment_id, department_id,
                    assignment_type) values (?, ?, ?, ?, 'PRIMARY')
                """, distribution, actor, loginFixtureId(41), department);
        var acknowledged = authRequest(client, "POST", acknowledge, null, cookie, token);
        assertThat(acknowledged.statusCode()).as(acknowledged.body()).isEqualTo(200);
        assertThat(authRequest(client, "POST", acknowledge, null, cookie, token).body())
                .isEqualTo(acknowledged.body());

        var retire = knowledgePath + "/retire";
        var retired = authRequest(client, "POST", retire, """
                {"reason":"Knowledge workflow test","expected_version":1}
                """, cookie, token);
        assertThat(retired.statusCode()).as(retired.body()).isEqualTo(200);
        assertThat(jdbc.queryForObject("select state from distribution.distributions where id = ?", String.class,
                distribution)).isEqualTo("WITHDRAWN");
        assertThat(authRequest(client, "POST", acknowledge, null, cookie, token).statusCode()).isEqualTo(404);
    }

    private HttpResponse<String> uploadTextDocument(HttpClient client, String cookie, Csrf token, UUID folder,
                                                    UUID department) throws Exception {
        var boundary = "ekl-test-boundary";
        var body = """
                --%1$s
                Content-Disposition: form-data; name="title"

                Write test document
                --%1$s
                Content-Disposition: form-data; name="owner_department_id"

                %2$s
                --%1$s
                Content-Disposition: form-data; name="folder_id"

                %3$s
                --%1$s
                Content-Disposition: form-data; name="classification_level"

                2
                --%1$s
                Content-Disposition: form-data; name="file"; filename="sample.txt"
                Content-Type: text/plain

                Document contents canary
                --%1$s--
                """.formatted(boundary, department, folder).replace("\n", "\r\n");
        return uploadMultipart(client, cookie, token, "/api/v1/documents", "document-1", boundary, body);
    }

    private HttpResponse<String> uploadTextVersion(HttpClient client, String cookie, Csrf token, String path,
                                                   String contents) throws Exception {
        var boundary = "ekl-test-boundary";
        var body = """
                --%1$s
                Content-Disposition: form-data; name="expected_version"

                2
                --%1$s
                Content-Disposition: form-data; name="file"; filename="revision.txt"
                Content-Type: text/plain

                %2$s
                --%1$s--
                """.formatted(boundary, contents).replace("\n", "\r\n");
        return uploadMultipart(client, cookie, token, path, "version-2", boundary, body);
    }

    private HttpResponse<String> uploadMultipart(HttpClient client, String cookie, Csrf token, String path,
                                                 String key, String boundary, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary).header("Cookie", cookie)
                .header(token.header(), token.value()).header("Idempotency-Key", key)
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> keyedRequest(HttpClient client, String path, String body, String cookie, Csrf token,
                                               String key) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .header("Content-Type", "application/json").header("Cookie", cookie)
                .header(token.header(), token.value()).header("Idempotency-Key", key)
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private Csrf csrf(HttpClient client, String sessionCookie) throws Exception {
        var response = authRequest(client, "GET", "/api/v1/authentication/csrf", null, sessionCookie, null);
        assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        var token = JSON.readTree(response.body());
        return new Csrf(sessionCookie == null ? cookie(response) : sessionCookie,
                token.get("headerName").asString(), token.get("token").asString());
    }

    private HttpResponse<String> authRequest(HttpClient client, String method, String path, String json,
                                             String sessionCookie, Csrf csrf) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
        if (sessionCookie != null) {
            builder.header("Cookie", sessionCookie);
        }
        if (csrf != null) {
            builder.header(csrf.header(), csrf.value());
        }
        if (json != null) {
            builder.header("Content-Type", "application/json");
        }
        var body = json == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json);
        return client.send(builder.method(method, body).build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String cookie(HttpResponse<String> response) {
        return response.headers().allValues("Set-Cookie").getLast().split(";", 2)[0];
    }

    private static UUID loginFixtureId(int suffix) {
        return UUID.fromString("82000000-0000-0000-0000-%012d".formatted(suffix));
    }

    private record Csrf(String cookie, String header, String value) {
    }

    private static final class ServiceLogCapture extends AbstractAppender implements AutoCloseable {
        private final Logger serviceLog = (Logger) LogManager.getLogger("com.ekl.framework.logging.service");
        private final List<String> messages = new CopyOnWriteArrayList<>();

        ServiceLogCapture() {
            super("ServiceLogCapture", null, null, true, Property.EMPTY_ARRAY);
            start();
            serviceLog.addAppender(this);
        }

        @Override
        public void append(LogEvent event) {
            messages.add(event.getMessage().getFormattedMessage());
        }

        @Override
        public void close() {
            serviceLog.removeAppender(this);
            stop();
        }
    }

    private static ResourceReadScope readScope(int resourceSuffix) {
        return new ResourceReadScope(fixtureId(1), fixtureId(resourceSuffix), fixtureId(4), 1);
    }

    private static UUID fixtureId(int suffix) {
        return UUID.fromString("81000000-0000-0000-0000-%012d".formatted(suffix));
    }

    private HttpRequest request(String path) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).build();
    }

    static class TransactionProbeService {
        private final JdbcTemplate jdbc;

        TransactionProbeService(JdbcTemplate jdbc) {
            this.jdbc = jdbc;
        }

        @Transactional(readOnly = true)
        public String databaseReadOnlyMode() {
            return jdbc.queryForObject("show transaction_read_only", String.class);
        }

        @Transactional
        public void writeThenFail() throws ProbeFailure {
            jdbc.update("""
                    insert into ops.scheduled_locks (name, lock_until, locked_at, locked_by)
                    values ('transaction-probe', now(), now(), 'test')
                    """);
            throw new ProbeFailure();
        }
    }

    static class ProbeFailure extends Exception {
    }
}
