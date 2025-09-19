package com.example.auth.api;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.auth.AuthService;
import com.example.auth.PasswordlessResult;
import com.example.auth.api.dto.ApiResponse;
import com.example.auth.api.dto.SendRequest;
import com.example.auth.api.dto.VerifyMagicRequest;
import com.example.auth.api.dto.VerifyOtpRequest;

import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController
@RequestMapping(path = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuthApiController {
    private final AuthService authService;

    public AuthApiController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping(path = "/send", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ApiResponse> send(@RequestBody SendRequest body) {
        return Mono.fromCallable(() -> {
            PasswordlessResult res = authService.sendPasswordlessLinkOrOtp(body.email());
            if (res.authRequestId == null || res.authRequestId.isBlank()) {
                return ApiResponse.fail(res.message);
            }
            return ApiResponse.ok(res.message, Map.of("authRequestId", res.authRequestId));
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping(path = "/verify/otp", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ApiResponse> verifyOtp(@RequestBody VerifyOtpRequest body) {
        return Mono.fromCallable(() -> {
            boolean ok = authService.verifyCodeOrLink(body.code(), body.authRequestId());
            return ok ? ApiResponse.ok("Verified", Map.of("email", "")) : ApiResponse.fail("Invalid or expired code");
        }).subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping(path = "/verify/magic", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ApiResponse> verifyMagic(@RequestBody VerifyMagicRequest body) {
        return Mono.fromCallable(() -> {
            String email = authService.verifyMagicLink(body.token(), body.authRequestId());
            return (email != null && !email.isBlank())
                    ? ApiResponse.ok("Verified", Map.of("email", email))
                    : ApiResponse.fail("Invalid or expired link");
        }).subscribeOn(Schedulers.boundedElastic());
    }

    // Current authenticated user information
    @org.springframework.web.bind.annotation.GetMapping("/me")
    public ResponseEntity<ApiResponse> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).body(ApiResponse.fail("Not authenticated"));
        }
        String name = auth.getName();
        return ResponseEntity.ok(ApiResponse.ok("Authenticated", Map.of("name", name)));
    }
}
