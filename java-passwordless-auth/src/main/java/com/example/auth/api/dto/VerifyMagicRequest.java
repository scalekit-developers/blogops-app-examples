package com.example.auth.api.dto;

public record VerifyMagicRequest(String token, String authRequestId) {}
