package com.example.auth;

public class PasswordlessResult {
    public final String message;
    public final String authRequestId;
    public PasswordlessResult(String message, String authRequestId) {
        this.message = message;
        this.authRequestId = authRequestId;
    }
}
