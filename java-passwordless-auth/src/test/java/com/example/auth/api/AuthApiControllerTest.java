package com.example.auth.api;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.example.auth.AuthService;
import com.example.auth.PasswordlessResult;
import com.example.auth.api.dto.SendRequest;

class AuthApiControllerTest {

    static class StubAuthService extends AuthService {
        public StubAuthService() { super(null); }
        @Override
        public PasswordlessResult sendPasswordlessLinkOrOtp(String email) {
            return new PasswordlessResult("sent", "req-123");
        }
    }

    @Test
    void sendReturnsOkWithAuthRequestId() {
        AuthApiController controller = new AuthApiController(new StubAuthService());
    var resp = controller.send(new SendRequest("test@example.com")).block();
    assertTrue(resp != null);
    assertTrue(resp.success());
    }
}
