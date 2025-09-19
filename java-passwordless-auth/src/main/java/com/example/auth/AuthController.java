package com.example.auth;

import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    // Common attribute and view names
    private static final String ATTR_SUCCESS = "success";
    private static final String ATTR_MESSAGE = "message";
    private static final String ATTR_USER = "user";
    private static final String VIEW_DASHBOARD = "dashboard";
    private static final String VIEW_VERIFY = "verify";

    // Keys for user map
    private static final String KEY_EMAIL = "email";
    private static final String KEY_NAME = "name";
    private static final String KEY_ID = "id";

    private final AuthService authService;

    @Autowired
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Magic link callback endpoint (configured in SendPasswordlessOptions.magiclinkAuthUri)
    // Scalekit will redirect here with query params like state, token, auth_request_id depending on configuration
    @GetMapping("/callback")
    public String magicLinkCallback(
            @RequestParam(required = false, name = "state") String state,
            @RequestParam(required = false, name = "token") String token,
            @RequestParam(required = false, name = "link_token") String linkToken,
            @RequestParam(required = false, name = "auth_request_id") String authRequestId,
            @RequestParam(required = false, name = "authRequestId") String authRequestIdAlt,
            @RequestParam(required = false, name = "request_id") String requestId,
            Model model) {
        String resolvedToken = (token != null) ? token : linkToken;
        String resolvedAuthRequestId = authRequestId;
        if (resolvedAuthRequestId == null) {
            resolvedAuthRequestId = authRequestIdAlt;
        }
        if (resolvedAuthRequestId == null) {
            resolvedAuthRequestId = requestId;
        }
        logger.info("Magic link callback received. state={}, token_present={}, auth_request_id={}", state, resolvedToken != null, resolvedAuthRequestId);
        // If no query params provided, return a page that parses URL fragment and posts to backend
        if (resolvedToken == null) {
            return "callback"; // renders a small page with JS to parse location.hash
        }
        // If auth request id is missing, try to resolve using state mapping
        if ((resolvedAuthRequestId == null || resolvedAuthRequestId.isBlank()) && state != null) {
            resolvedAuthRequestId = authService.resolveAuthRequestIdByState(state);
        }
    String email = authService.verifyMagicLink(resolvedToken, resolvedAuthRequestId);
    boolean ok = (email != null && !email.isBlank());
    if (ok) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            email, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
    }
        model.addAttribute(ATTR_SUCCESS, ok);
        int idVal = Objects.hashCode(email);
        model.addAttribute(ATTR_USER, ok ? java.util.Map.of(
                KEY_EMAIL, email,
                KEY_NAME, "Magic Link User",
                KEY_ID, idVal
        ) : null);
        return VIEW_DASHBOARD;
    }

    // POST endpoint to receive fragment-parsed values from the callback page
    @PostMapping("/callback/verify")
    public String magicLinkCallbackVerify(
            @RequestParam(name = "token") String token,
            @RequestParam(name = "auth_request_id", required = false) String authRequestId,
            @RequestParam(name = "authRequestId", required = false) String authRequestIdAlt,
            Model model) {
        String resolvedAuthRequestId = authRequestId != null ? authRequestId : authRequestIdAlt;
        logger.info("Magic link callback POST verify. token_present={}, auth_request_id={}", token != null, resolvedAuthRequestId);
        if ((resolvedAuthRequestId == null || resolvedAuthRequestId.isBlank())) {
            // No state on POST; rely on prior GET mapping or fail gracefully.
            logger.warn("Magic link POST verify missing auth_request_id");
        }
    String email = authService.verifyMagicLink(token, resolvedAuthRequestId);
    boolean ok = (email != null && !email.isBlank());
    if (ok) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            email, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
    }
        model.addAttribute(ATTR_SUCCESS, ok);
        int idVal = Objects.hashCode(email);
        model.addAttribute(ATTR_USER, ok ? java.util.Map.of(
                KEY_EMAIL, email,
                KEY_NAME, "Magic Link User",
                KEY_ID, idVal
        ) : null);
        return VIEW_DASHBOARD;
    }

    // Show login page
    @GetMapping("/login")
    public String showLogin() {
        return "login";
    }

    // Handle login form POST
    @PostMapping("/login")
    public String login(@RequestParam String email, RedirectAttributes redirectAttributes, HttpSession session) {
        logger.info("Login initiated for {}", email);
        PasswordlessResult result = authService.sendPasswordlessLinkOrOtp(email);
        logger.info("Auth request sent. email={}, authRequestId={}", email, result.authRequestId);
        if (result.authRequestId == null || result.authRequestId.isBlank()) {
            // Send failed (e.g., timeout). Stay on login with a friendly message.
            redirectAttributes.addFlashAttribute(ATTR_MESSAGE, result.message);
            return "redirect:/auth/login";
        }
        session.setAttribute("authRequestId", result.authRequestId);
        session.setAttribute(KEY_EMAIL, email);
        redirectAttributes.addFlashAttribute(ATTR_MESSAGE, result.message);
        return "redirect:/auth/verify";
    }

    // Show verify page
    @GetMapping("/verify")
    public String showVerify(@ModelAttribute("message") String message, Model model) {
        model.addAttribute(ATTR_MESSAGE, message);
        return VIEW_VERIFY;
    }

    // Handle verify form POST
    @PostMapping("/verify")
    public String verify(@RequestParam String code, Model model, HttpSession session) {
        String authRequestId = (String) session.getAttribute("authRequestId");
    String email = (String) session.getAttribute(KEY_EMAIL);
        logger.info("Verifying code. email={}, authRequestId={}", email, authRequestId);
        boolean isVerified = authService.verifyCodeOrLink(code, authRequestId);
        if (isVerified) {
            logger.info("User {} successfully authenticated.", email);
        // Set Spring Security Authentication for the session
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            email, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
            model.addAttribute(ATTR_SUCCESS, true);
            int idVal = Objects.hashCode(email);
            model.addAttribute(ATTR_USER, java.util.Map.of(
                    KEY_EMAIL, email,
                    KEY_NAME, "Authenticated User",
                    KEY_ID, idVal
            ));
            return VIEW_DASHBOARD;
        } else {
            logger.info("Invalid OTP for user: {} (authRequestId: {})", email, authRequestId);
            // Stay on the verify page and show a friendly error message to retry
            model.addAttribute(ATTR_MESSAGE, "Invalid or expired code. Please try again.");
            return VIEW_VERIFY;
        }
    }

    // Dashboard page (GET, after POST-redirect-GET)
    @GetMapping("/dashboard")
    public String dashboard(@RequestParam(required = false) Boolean success, Model model) {
        model.addAttribute(ATTR_SUCCESS, success);
        // User details would be set in session or via redirect attributes in a real app
        return VIEW_DASHBOARD;
    }
}
