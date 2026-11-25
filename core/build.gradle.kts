plugins {
    java
    alias(libs.plugins.spring.boot)
}

group = "com.ekl"
version = "0.1.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(libs.versions.java.get())
    }
}

dependencies {
    implementation(platform(libs.spring.boot.bom))
    implementation(libs.spring.boot.webmvc)
    implementation(libs.spring.boot.actuator)
    implementation(libs.spring.boot.log4j2)
    implementation(libs.spring.boot.security)
    implementation(libs.spring.boot.session.jdbc)
    implementation(libs.spring.boot.jdbc)
    implementation(libs.spring.boot.flyway)
    runtimeOnly(libs.flyway.postgresql)
    runtimeOnly(libs.postgresql)

    testImplementation(libs.spring.boot.test)
    testImplementation(libs.flyway.core)
    testImplementation(libs.testcontainers.junit)
    testRuntimeOnly(libs.junit.platform.launcher)
}

configurations.configureEach {
    exclude(group = "org.springframework.boot", module = "spring-boot-starter-logging")
}

val migrations = layout.projectDirectory.dir("../db/migration")
tasks.processResources {
    from(migrations) {
        include("V*__*.sql")
        into("db/migration")
    }
    doFirst {
        val versions = migrations.asFile.listFiles().orEmpty()
            .mapNotNull { Regex("V(\\d+)__.+\\.sql").matchEntire(it.name)?.groupValues?.get(1)?.toInt() }
            .toSet()
        check(versions.containsAll((1..21).toList())) {
            "The baseline V1–V21 migrations are required in ${migrations.asFile}."
        }
    }
}

tasks.test {
    useJUnitPlatform()
    inputs.files(fileTree("../db") { include("smoke_test*.sql") })
    inputs.file("../infra/db/init-ekl.sh")
}
