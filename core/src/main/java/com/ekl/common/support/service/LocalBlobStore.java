package com.ekl.common.support.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class LocalBlobStore {
    private static final Logger LOGGER = LogManager.getLogger(LocalBlobStore.class);
    private final Path root;

    LocalBlobStore(@Value("${ekl.blob-root:./var/blobs}") String root) {
        this.root = Path.of(root).toAbsolutePath().normalize();
    }

    public String store(byte[] bytes) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Blob storage requires transaction synchronization");
        }
        String key = UUID.randomUUID().toString();
        Path path = root.resolve(key);
        try {
            Files.createDirectories(root);
            try (var output = Files.newOutputStream(path, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status == STATUS_ROLLED_BACK) {
                            try {
                                Files.deleteIfExists(path);
                            } catch (IOException exception) {
                                LOGGER.warn("Blob rollback cleanup failed");
                            }
                        }
                    }
                });
                output.write(bytes);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Blob storage failed", exception);
        }
        return key;
    }

    public byte[] read(String key, int maxBytes) throws IOException {
        var path = root.resolve(UUID.fromString(key).toString());
        try (var stream = Files.newInputStream(path, LinkOption.NOFOLLOW_LINKS)) {
            var bytes = stream.readNBytes(maxBytes + 1);
            if (bytes.length > maxBytes) {
                throw new IOException("Blob exceeds the read limit");
            }
            return bytes;
        }
    }

    public static byte[] sha256(byte[] bytes) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(bytes);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
