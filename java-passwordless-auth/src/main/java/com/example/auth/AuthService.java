

package com.example.auth;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.example.auth.user.UserAccount;
import com.scalekit.ScalekitClient;
import com.scalekit.api.PasswordlessClient;
import com.scalekit.grpc.scalekit.v1.auth.passwordless.SendPasswordlessResponse;
import com.scalekit.grpc.scalekit.v1.auth.passwordless.TemplateType;
import com.scalekit.grpc.scalekit.v1.auth.passwordless.VerifyPasswordLessResponse;
import com.scalekit.internal.http.SendPasswordlessOptions;
import com.scalekit.internal.http.VerifyPasswordlessOptions;

@Service
public class AuthService {
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private static final String ACTION_SEND = "sendPasswordlessEmail";
    private static final String ACTION_VERIFY = "verifyPasswordlessEmail";
    private static final String ERR_DEADLINE = "DEADLINE_EXCEEDED";
    private static final String ERR_TIMEOUT = "timeout";
    private static final String ERR_DEADLINE_WORD = "deadline";

    private PasswordlessClient passwordlessClient;
    private final ConcurrentHashMap<String, String> stateToAuthRequestId = new ConcurrentHashMap<>();

    // Where Scalekit should redirect users after they click the magic link
    @Value("${scalekit.magiclink_auth_uri:http://localhost:8080/auth/callback}")
    private String magiclinkAuthUri;

    // For logging request/response payloads
    private void logScalekitRequest(String action, Object payload) {
        logger.debug("[Scalekit][Request][{}] Payload: {}", action, payload);
    }
    private void logScalekitResponse(String action, Object response) {
        logger.debug("[Scalekit][Response][{}] Payload: {}", action, response);
    }

    private final com.example.auth.user.UserAccountRepository userRepo;

    public AuthService(com.example.auth.user.UserAccountRepository userRepo) {
        // Initialization moved to a separate method to allow @Value injection
        this.userRepo = userRepo;
    }

    // Use @PostConstruct to initialize after Spring constructs the service
    @javax.annotation.PostConstruct
    public void init() {
        // Read secrets from system properties (set via JVM args)
        final String environmentUrl = System.getProperty("scalekit.environment_url");
        final String clientId = System.getProperty("scalekit.client_id");
        final String clientSecret = System.getProperty("scalekit.client_secret");

        if (environmentUrl == null || environmentUrl.isBlank() || clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            logger.error("Scalekit configuration is missing. environmentUrl={}, clientId={}, clientSecret set? {}",
                    environmentUrl, clientId, (clientSecret != null && !clientSecret.isBlank()));
            throw new IllegalStateException("Missing Scalekit configuration. Ensure -Dscalekit.environment_url, -Dscalekit.client_id, and -Dscalekit.client_secret are set.");
        }

        // Initialize the high-level SDK client (recommended)
        ScalekitClient scalekitClient = new ScalekitClient(environmentUrl, clientId, clientSecret);
        this.passwordlessClient = scalekitClient.passwordless();
        logger.info("Scalekit client initialized for env: {}", environmentUrl);
    }

    public PasswordlessResult sendPasswordlessLinkOrOtp(String email) {
        logger.info("[Scalekit] Sending OTP/Magic Link to {}", email);
        try {
            SendPasswordlessOptions options = new SendPasswordlessOptions();
            // Generate a correlation state so we can recover auth_request_id on callback
            String state = UUID.randomUUID().toString();
            options.setState(state);
            // Provide required magic link callback URI (append our state to ensure it's returned to us)
            String separator = magiclinkAuthUri.contains("?") ? "&" : "?";
            String callbackWithState = magiclinkAuthUri + separator + "state=" + state;
            options.setMagiclinkAuthUri(callbackWithState);
            // Optional: choose a template (defaults to SIGNIN/SIGNUP behavior server-side)
            options.setTemplate(TemplateType.SIGNIN);
            logScalekitRequest(ACTION_SEND, options);
            SendPasswordlessResponse response = passwordlessClient.sendPasswordlessEmail(email, options);
            logScalekitResponse(ACTION_SEND, response);
            String authRequestId = response.getAuthRequestId();
            if (authRequestId != null && !authRequestId.isEmpty()) {
                stateToAuthRequestId.put(state, authRequestId);
                return new PasswordlessResult("OTP/Magic Link sent successfully. Please check your email.", authRequestId);
            } else {
                return new PasswordlessResult("Failed to send OTP/Magic Link: No request ID returned.", null);
            }
        } catch (Exception ex) {
            String msg = ex.getMessage() != null ? ex.getMessage() : "";
            // Treat network timeouts as expected transient failures: avoid stack traces
            if (msg.contains(ERR_DEADLINE) || msg.toLowerCase().contains(ERR_TIMEOUT) || msg.toLowerCase().contains(ERR_DEADLINE_WORD)) {
                logger.warn("[Scalekit] Send timed out for {}. reason={}", email, msg);
                return new PasswordlessResult("Service timeout while sending. Please try again.", null);
            }
            logger.error("[Scalekit] Exception sending OTP/Magic Link to {}: {}", email, msg, ex);
            return new PasswordlessResult("Failed to send OTP/Magic Link: " + msg, null);
        }
    }


    public boolean verifyCodeOrLink(String code, String authRequestId) {
        logger.info("[Scalekit] Verifying code for authRequestId: {}", authRequestId);
        try {
            VerifyPasswordlessOptions options = new VerifyPasswordlessOptions();
            options.setCode(code);
            logScalekitRequest(ACTION_VERIFY, options);
            VerifyPasswordLessResponse response = passwordlessClient.verifyPasswordlessEmail(options, authRequestId);
            logScalekitResponse(ACTION_VERIFY, response);
            String state = response.hasState() ? response.getState() : null;
            String email = response.getEmail();
            // Treat presence of an email in the response as a successful verification.
            if ((state != null && (state.equalsIgnoreCase("VERIFIED") || state.equalsIgnoreCase("SUCCESS")))
                    || (email != null && !email.isBlank())) {
                logger.info("[Scalekit] Verification successful for email: {} (state: {})", email, state);
                if (email != null && !email.isBlank()) {
                    upsertUser(email, "Authenticated User");
                }
                return true;
            }
            logger.warn("Verification did not indicate success. State: {}, Email present: {}", state, email != null && !email.isBlank());
            return false;
        } catch (Exception ex) {
            // Avoid noisy stack traces for expected invalid/transient scenarios
            String msg = ex.getMessage() != null ? ex.getMessage() : "";
        if (msg.contains("INVALID_CODE") || msg.toLowerCase().contains("invalid") || msg.toLowerCase().contains("expired")
            || msg.contains(ERR_DEADLINE) || msg.toLowerCase().contains(ERR_TIMEOUT) || msg.toLowerCase().contains(ERR_DEADLINE_WORD)) {
                logger.debug("[Scalekit] Verification failed (recoverable). authRequestId={}, reason={}", authRequestId, msg);
                return false;
            }
            logger.error("[Scalekit] Exception verifying code for authRequestId {}: {}", authRequestId, msg, ex);
            return false;
        }
    }

    /**
     * Verify a magic link callback using the provided token and auth request id.
     * @return the verified email if successful, otherwise null
     */
    public String verifyMagicLink(String linkToken, String authRequestId) {
        logger.info("[Scalekit] Verifying magic link for authRequestId: {}", authRequestId);
        try {
            VerifyPasswordlessOptions options = new VerifyPasswordlessOptions();
            options.setLinkToken(linkToken);
        logScalekitRequest(ACTION_VERIFY, options);
            VerifyPasswordLessResponse response = (authRequestId != null && !authRequestId.isBlank())
                    ? passwordlessClient.verifyPasswordlessEmail(options, authRequestId)
                    : passwordlessClient.verifyPasswordlessEmail(options);
        logScalekitResponse(ACTION_VERIFY, response);
            String email = response.getEmail();
            if (email != null && !email.isBlank()) {
                logger.info("[Scalekit] Magic link verification successful for email: {}", email);
                upsertUser(email, "Magic Link User");
                return email;
            }
            String state = response.hasState() ? response.getState() : null;
            logger.warn("Magic link verification did not indicate success. State: {}, Email present: {}", state, email != null && !email.isBlank());
            return null;
        } catch (Exception ex) {
            // Suppress stack trace for expected invalid/expired/timeouts
            String msg = ex.getMessage() != null ? ex.getMessage() : "";
        if (msg.toLowerCase().contains("invalid") || msg.toLowerCase().contains("expired")
            || msg.contains(ERR_DEADLINE) || msg.toLowerCase().contains(ERR_TIMEOUT) || msg.toLowerCase().contains(ERR_DEADLINE_WORD)) {
                logger.debug("[Scalekit] Magic link verification failed (recoverable). authRequestId={}, reason={}", authRequestId, msg);
                return null;
            }
            logger.error("[Scalekit] Exception verifying magic link for authRequestId {}: {}", authRequestId, msg, ex);
            return null;
        }
    }

    public String resolveAuthRequestIdByState(String state) {
        if (state == null || state.isBlank()) return null;
        String id = stateToAuthRequestId.get(state);
        logger.debug("[Scalekit] Resolved auth_request_id by state: {} -> {}", state, id);
        return id;
    }

    private void upsertUser(String email, String displayName) {
        try {
            userRepo.findByEmail(email)
                .map(existing -> {
                    if (displayName != null && !displayName.equals(existing.getDisplayName())) {
                        existing.setDisplayName(displayName);
                        return userRepo.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> userRepo.save(new UserAccount(email, displayName)));
        } catch (Exception e) {
            logger.debug("User upsert skipped due to repository issue: {}", e.getMessage());
        }
    }
}
