package com.ekl.core.job.blo;

import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.ekl.core.job.DocumentIndexJob.Chunk;
import com.ekl.core.job.DocumentIndexJob.Source;
import com.ekl.core.job.DocumentOutboxJob;
import com.ekl.core.job.dao.DocumentIndexDao;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
class DocumentIndexBloImpl implements DocumentIndexBlo {
    private static final int MAX_CHARS = 1000;
    private final DocumentIndexDao dao;
    private final JsonMapper json;

    DocumentIndexBloImpl(DocumentIndexDao dao, JsonMapper json) {
        this.dao = dao;
        this.json = json;
    }

    @Override
    public void write(DocumentOutboxJob job, Source source) {
        var revision = dao.createRevision(job.document(), source);
        var chunks = new ArrayList<Chunk>();
        for (var segment : json.readTree(source.parsedSegments())) {
            var text = segment.path("text").asString();
            var locator = new HashMap<String, Integer>();
            for (String key : List.of("page", "paragraph")) {
                if (segment.hasNonNull(key)) {
                    locator.put(key, segment.get(key).asInt());
                }
            }
            appendChunks(revision, chunks, text, locator);
        }
        if (chunks.isEmpty()) {
            throw new IllegalStateException("Current parse result has no searchable text");
        }
        dao.writeKeywordIndex(job, source, revision, chunks);
    }

    private void appendChunks(UUID revision, ArrayList<Chunk> chunks, String text, Map<String, Integer> locator) {
        for (int start = 0; start < text.length();) {
            int end = Math.min(start + MAX_CHARS, text.length());
            if (end < text.length()) {
                int lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > start + MAX_CHARS / 2) {
                    end = lastSpace;
                } else if (Character.isHighSurrogate(text.charAt(end - 1))) {
                    end--;
                }
            }
            String value = text.substring(start, end).strip();
            if (!value.isEmpty()) {
                int ordinal = chunks.size();
                chunks.add(new Chunk(chunkId(revision, ordinal), ordinal, value, Map.copyOf(locator)));
            }
            start = end;
        }
    }

    private UUID chunkId(UUID revision, int ordinal) {
        try {
            var input = ByteBuffer.allocate(20).putLong(revision.getMostSignificantBits())
                    .putLong(revision.getLeastSignificantBits()).putInt(ordinal).array();
            byte[] hash = MessageDigest.getInstance("SHA-1").digest(input);
            hash[6] = (byte) ((hash[6] & 0x0f) | 0x50);
            hash[8] = (byte) ((hash[8] & 0x3f) | 0x80);
            var bytes = ByteBuffer.wrap(hash);
            return new UUID(bytes.getLong(), bytes.getLong());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("UUID name hashing is unavailable", exception);
        }
    }
}
