package com.ekl.core.ai;

public class AiCallFailure extends RuntimeException {
    private final boolean retryable;

    AiCallFailure(String code, boolean retryable) {
        super(code);
        this.retryable = retryable;
    }

    public boolean retryable() {
        return retryable;
    }
}
