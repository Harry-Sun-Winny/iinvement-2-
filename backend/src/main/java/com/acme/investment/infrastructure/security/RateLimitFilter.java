package com.acme.investment.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Per-instance fixed-window request limiter. Edge/WAF rate limiting remains required in production
 * because this local limiter intentionally does not coordinate between application instances.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final int authLimit;
    private final int apiLimit;
    private final Clock clock;

    @Autowired
    public RateLimitFilter(@Value("${security.rate-limit.auth-per-minute:10}") int authLimit,
                           @Value("${security.rate-limit.api-per-minute:120}") int apiLimit) {
        this(authLimit, apiLimit, Clock.systemUTC());
    }

    RateLimitFilter(int authLimit, int apiLimit, Clock clock) {
        if (authLimit < 1 || apiLimit < 1) throw new IllegalArgumentException("Rate limits must be positive.");
        this.authLimit = authLimit;
        this.apiLimit = apiLimit;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs") || "/error".equals(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean authRequest = path.startsWith("/api/v1/auth/");
        int limit = authRequest ? authLimit : apiLimit;
        long now = clock.millis();
        long windowStart = now - now % 60_000;
        String key = request.getRemoteAddr() + ':' + (authRequest ? "auth" : "api");
        Window window = windows.compute(key, (ignored, current) -> current == null || current.startedAt != windowStart
                ? new Window(windowStart, 1) : new Window(windowStart, current.requests + 1));

        if (window.requests > limit) {
            long retryAfterSeconds = Math.max(1, (windowStart + 60_000 - now + 999) / 1_000);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", Long.toString(retryAfterSeconds));
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"rate_limit_exceeded\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private record Window(long startedAt, int requests) { }
}
