package com.acme.investment.application.security;

import com.acme.investment.application.audit.AuditLogService;
import com.acme.investment.infrastructure.persistence.UserEntity;
import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates or promotes the first local administrator only when explicitly enabled through environment variables.
 * There is deliberately no public Admin registration endpoint.
 */
@Service
@ConditionalOnProperty(prefix = "security.bootstrap-admin", name = "enabled", havingValue = "true")
public class AdminBootstrapService implements ApplicationRunner {
    private static final Logger LOG = LoggerFactory.getLogger(AdminBootstrapService.class);
    private static final int MIN_PASSWORD_LENGTH = 12;

    private final UserJpaRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final String email;
    private final String password;
    private final String fullName;

    public AdminBootstrapService(UserJpaRepository users, PasswordEncoder passwordEncoder,
                                 AuditLogService auditLogService,
                                 @Value("${security.bootstrap-admin.email:}") String email,
                                 @Value("${security.bootstrap-admin.password:}") String password,
                                 @Value("${security.bootstrap-admin.full-name:Local Administrator}") String fullName) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String normalizedEmail = normalizeEmail(email, "SECURITY_BOOTSTRAP_ADMIN_EMAIL");
        Optional<UserEntity> existing = users.findByEmail(normalizedEmail);
        if (existing.isPresent()) {
            UserEntity admin = existing.get();
            String previousRole = admin.getRole();
            if (!admin.promoteToAdmin()) {
                LOG.warn("Bootstrap administrator configuration is enabled. Set SECURITY_BOOTSTRAP_ADMIN_ENABLED=false after this startup.");
                return;
            }
            users.save(admin);
            auditLogService.log(admin.getId(), "USER", admin.getId(), "BOOTSTRAP_PROMOTE_ADMIN",
                    Map.of("role", previousRole), Map.of("role", "ADMIN"));
        } else {
            createAdmin(normalizedEmail);
        }
        LOG.warn("Bootstrap administrator configuration is enabled. Set SECURITY_BOOTSTRAP_ADMIN_ENABLED=false after this startup.");
    }

    private UserEntity createAdmin(String normalizedEmail) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException("SECURITY_BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters when creating an administrator.");
        }
        String normalizedFullName = requireValue(fullName, "SECURITY_BOOTSTRAP_ADMIN_FULL_NAME");
        UserEntity admin = new UserEntity(normalizedEmail, passwordEncoder.encode(password), normalizedFullName);
        admin.promoteToAdmin();
        UserEntity saved = users.save(admin);
        auditLogService.log(saved.getId(), "USER", saved.getId(), "BOOTSTRAP_CREATE_ADMIN", null,
                Map.of("role", "ADMIN"));
        return saved;
    }

    private String normalizeEmail(String value, String property) {
        return requireValue(value, property).toLowerCase(Locale.ROOT);
    }

    private String requireValue(String value, String property) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(property + " must be set when admin bootstrap is enabled.");
        }
        return value.trim();
    }
}
