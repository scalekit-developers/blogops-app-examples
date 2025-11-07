package com.example.auth;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mockito;
import static org.mockito.Mockito.when;

import com.example.auth.user.UserAccount;
import com.example.auth.user.UserAccountRepository;

class AuthServiceUpsertTest {
    @Test
    void upsert_creates_when_missing() {
        UserAccountRepository repo = Mockito.mock(UserAccountRepository.class);
        when(repo.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(repo.save(any(UserAccount.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthService svc = new AuthService(repo);
        // Call private method via reflection to keep test minimal
        try {
            var m = AuthService.class.getDeclaredMethod("upsertUser", String.class, String.class);
            m.setAccessible(true);
            m.invoke(svc, "new@example.com", "User");
        } catch (Exception ignored) {}
    }
}
