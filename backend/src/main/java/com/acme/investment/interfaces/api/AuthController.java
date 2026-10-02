package com.acme.investment.interfaces.api;

import com.acme.investment.application.audit.AuditLogService;
import com.acme.investment.application.security.RefreshTokenService;
import com.acme.investment.infrastructure.persistence.UserEntity;
import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import com.acme.investment.infrastructure.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private static final String REFRESH_COOKIE = "investment_refresh";
    private final UserJpaRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuditLogService auditLogService;
    private final long refreshTokenTtlDays;
    private final boolean secureRefreshCookie;

    public AuthController(UserJpaRepository users, PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager, JwtService jwtService,
                          RefreshTokenService refreshTokenService, AuditLogService auditLogService,
                          @Value("${security.refresh-token.ttl-days:30}") long refreshTokenTtlDays,
                          @Value("${security.refresh-token.cookie-secure:false}") boolean secureRefreshCookie) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.auditLogService = auditLogService;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
        this.secureRefreshCookie = secureRefreshCookie;
    }

    @PostMapping("/register")
    ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (users.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
        UserEntity user = users.save(new UserEntity(
                request.email().toLowerCase(),
                passwordEncoder.encode(request.password()),
                request.fullName()));
        return sessionFor(user, "LOGIN");
    }

    @PostMapping("/login")
    ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        UserEntity user = users.findByEmail(request.email().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return sessionFor(user, "LOGIN");
    }

    @PostMapping("/refresh")
    ResponseEntity<AuthResponse> refresh(@RequestBody(required = false) RefreshRequest request,
                                         @CookieValue(name = REFRESH_COOKIE, required = false) String refreshCookie) {
        String refreshToken = request != null && request.refreshToken() != null && !request.refreshToken().isBlank()
                ? request.refreshToken() : refreshCookie;
        UserEntity user = refreshTokenService.rotate(refreshToken);
        auditLogService.log(user.getId(), "AUTH_SESSION", user.getId(), "REFRESH", null, null);
        return sessionFor(user, null);
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(@AuthenticationPrincipal UserDetails principal) {
        UserEntity user = users.findByEmail(principal.getUsername()).orElseThrow();
        refreshTokenService.revokeAll(user.getId());
        auditLogService.log(user.getId(), "AUTH_SESSION", user.getId(), "LOGOUT", null, null);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredRefreshCookie().toString())
                .build();
    }

    private ResponseEntity<AuthResponse> sessionFor(UserEntity user, String action) {
        String refreshToken = refreshTokenService.issue(user);
        if (action != null) {
            auditLogService.log(user.getId(), "AUTH_SESSION", user.getId(), action, null, null);
        }
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(secureRefreshCookie)
                .sameSite("Strict")
                .path("/")
                .maxAge(java.time.Duration.ofDays(refreshTokenTtlDays))
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new AuthResponse(jwtService.createToken(user.getEmail()), "Bearer"));
    }

    private ResponseCookie expiredRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(secureRefreshCookie)
                .sameSite("Strict")
                .path("/")
                .maxAge(java.time.Duration.ZERO)
                .build();
    }

    record RegisterRequest(@Email String email, @Size(min = 12, max = 128) String password,
                           @NotBlank @Size(min = 2, max = 160) String fullName) {
    }

    record LoginRequest(@Email String email, @NotBlank String password) {
    }

    record RefreshRequest(String refreshToken) { }

    record AuthResponse(String token, String tokenType) {
    }
}

