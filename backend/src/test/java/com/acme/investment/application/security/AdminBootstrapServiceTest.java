package com.acme.investment.application.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.acme.investment.application.audit.AuditLogService;
import com.acme.investment.infrastructure.persistence.UserEntity;
import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminBootstrapServiceTest {

    private final UserJpaRepository users = mock(UserJpaRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);

    @Test
    void createsAdminWhenConfiguredEmailDoesNotExist() {
        when(users.findByEmail("admin@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("unique-bootstrap-password")) .thenReturn("hash");
        when(users.save(org.mockito.ArgumentMatchers.any(UserEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service("admin@example.com", "unique-bootstrap-password", "Platform Admin")
                .run(new DefaultApplicationArguments());

        org.mockito.ArgumentCaptor<UserEntity> captured = org.mockito.ArgumentCaptor.forClass(UserEntity.class);
        verify(users).save(captured.capture());
        assertEquals("ADMIN", captured.getValue().getRole());
        verify(auditLogService).log(nullable(UUID.class), eq("USER"), nullable(UUID.class),
                eq("BOOTSTRAP_CREATE_ADMIN"), isNull(), eq(java.util.Map.of("role", "ADMIN")));
    }

    @Test
    void promotesExistingAccountWithoutChangingItsPassword() {
        UserEntity existing = new UserEntity("member@example.com", "existing-hash", "Member");
        when(users.findByEmail("member@example.com")).thenReturn(Optional.of(existing));
        when(users.save(existing)).thenReturn(existing);

        service("member@example.com", "", "unused")
                .run(new DefaultApplicationArguments());

        assertEquals("ADMIN", existing.getRole());
        verify(passwordEncoder, never()).encode(org.mockito.ArgumentMatchers.anyString());
        verify(auditLogService).log(nullable(UUID.class), eq("USER"), nullable(UUID.class),
                eq("BOOTSTRAP_PROMOTE_ADMIN"), eq(java.util.Map.of("role", "USER")),
                eq(java.util.Map.of("role", "ADMIN")));
    }

    @Test
    void rejectsBootstrapWithoutAnEmail() {
        AdminBootstrapService service = service("", "unique-bootstrap-password", "Platform Admin");

        assertThrows(IllegalStateException.class, () -> service.run(new DefaultApplicationArguments()));
        verify(users, never()).findByEmail(org.mockito.ArgumentMatchers.anyString());
    }

    private AdminBootstrapService service(String email, String password, String fullName) {
        return new AdminBootstrapService(users, passwordEncoder, auditLogService, email, password, fullName);
    }
}
