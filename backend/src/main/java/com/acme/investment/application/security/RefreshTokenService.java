package com.acme.investment.application.security;

import com.acme.investment.infrastructure.persistence.UserEntity;
import com.acme.investment.infrastructure.persistence.security.RefreshTokenEntity;
import com.acme.investment.infrastructure.persistence.security.RefreshTokenJpaRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RefreshTokenService {
    private final RefreshTokenJpaRepository tokenRepo;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long ttlDays;

    public RefreshTokenService(RefreshTokenJpaRepository tokenRepo,
                               @Value("${security.refresh-token.ttl-days:30}") long ttlDays) {
        this.tokenRepo = tokenRepo;
        this.ttlDays = ttlDays;
    }

    @Transactional
    public String issue(UserEntity user) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        RefreshTokenEntity token = new RefreshTokenEntity();
        token.setUser(user);
        token.setTokenHash(hash(raw));
        token.setCreatedAt(OffsetDateTime.now());
        token.setExpiresAt(OffsetDateTime.now().plusDays(ttlDays));
        tokenRepo.save(token);
        return raw;
    }

    @Transactional
    public UserEntity rotate(String rawToken) {
        RefreshTokenEntity token = tokenRepo.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token."));
        if (token.getRevokedAt() != null || !token.getExpiresAt().isAfter(OffsetDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Expired or revoked refresh token.");
        }
        token.setRevokedAt(OffsetDateTime.now());
        return token.getUser();
    }

    @Transactional
    public void revokeAll(UUID userId) {
        tokenRepo.revokeActiveByUserId(userId, OffsetDateTime.now());
    }

    private String hash(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is required.");
        }
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash refresh token", exception);
        }
    }
}
