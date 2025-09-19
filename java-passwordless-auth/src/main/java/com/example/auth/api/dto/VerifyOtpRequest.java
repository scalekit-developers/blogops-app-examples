package com.example.auth.api.dto;

public record VerifyOtpRequest(String code, String authRequestId) {}
