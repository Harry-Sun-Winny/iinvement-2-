package com.acme.investment.infrastructure.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null
                && header.startsWith(BEARER_PREFIX)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            authenticateRequest(header.substring(BEARER_PREFIX.length()), request);
        }

        filterChain.doFilter(request, response);
    }

    private void authenticateRequest(String token, HttpServletRequest request) {
        try {
            String subject = jwtService.parseSubject(token);
            UserDetails user = userDetailsService.loadUserByUsername(subject);

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (ExpiredJwtException exception) {
            SecurityContextHolder.clearContext();
            log.warn("JWT expired for request {} {}: expired at {}",
                    request.getMethod(), request.getRequestURI(), exception.getClaims().getExpiration());
        } catch (SignatureException exception) {
            SecurityContextHolder.clearContext();
            log.warn("JWT signature is invalid for request {} {}",
                    request.getMethod(), request.getRequestURI());
        } catch (MalformedJwtException exception) {
            SecurityContextHolder.clearContext();
            log.warn("JWT is malformed for request {} {}: {}",
                    request.getMethod(), request.getRequestURI(), exception.getMessage());
        } catch (JwtException exception) {
            SecurityContextHolder.clearContext();
            log.warn("JWT validation failed with {} for request {} {}: {}",
                    exception.getClass().getSimpleName(), request.getMethod(), request.getRequestURI(),
                    exception.getMessage());
        } catch (Exception exception) {
            SecurityContextHolder.clearContext();
            log.warn("JWT authentication failed with {} for request {} {}: {}",
                    exception.getClass().getSimpleName(), request.getMethod(), request.getRequestURI(),
                    exception.getMessage());
        }
    }
}
