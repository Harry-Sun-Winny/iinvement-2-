package com.acme.investment.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import jakarta.servlet.FilterChain;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitFilterTest {

    @Test
    void rejectsAuthRequestAfterConfiguredQuota() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(1, 2,
                Clock.fixed(Instant.parse("2026-07-23T00:00:00Z"), ZoneOffset.UTC));
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.setRemoteAddr("127.0.0.1");
        FilterChain chain = org.mockito.Mockito.mock(FilterChain.class);

        filter.doFilter(request, new MockHttpServletResponse(), chain);
        MockHttpServletResponse limited = new MockHttpServletResponse();
        filter.doFilter(request, limited, chain);

        assertEquals(429, limited.getStatus());
        assertEquals("60", limited.getHeader("Retry-After"));
        verify(chain, never()).doFilter(request, limited);
    }

    @Test
    void keepsAuthAndApiQuotasSeparate() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(1, 1,
                Clock.fixed(Instant.parse("2026-07-23T00:00:00Z"), ZoneOffset.UTC));
        MockHttpServletRequest auth = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        MockHttpServletRequest api = new MockHttpServletRequest("GET", "/api/v1/portfolios");
        auth.setRemoteAddr("127.0.0.1");
        api.setRemoteAddr("127.0.0.1");
        FilterChain chain = org.mockito.Mockito.mock(FilterChain.class);

        filter.doFilter(auth, new MockHttpServletResponse(), chain);
        MockHttpServletResponse apiResponse = new MockHttpServletResponse();
        filter.doFilter(api, apiResponse, chain);

        assertEquals(200, apiResponse.getStatus());
    }
}
