package com.acme.investment.interfaces.api;

import com.acme.investment.application.intelligence.ResearchIntelligenceService;
import com.acme.investment.application.intelligence.ResearchRunPersistenceService;
import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/research/{symbol}")
public class ResearchController {
    private final ResearchIntelligenceService service;
    private final ResearchRunPersistenceService runPersistenceService;
    private final UserJpaRepository userRepository;

    public ResearchController(ResearchIntelligenceService service, ResearchRunPersistenceService runPersistenceService,
                              UserJpaRepository userRepository) {
        this.service = service;
        this.runPersistenceService = runPersistenceService;
        this.userRepository = userRepository;
    }

    @GetMapping("/profile")
    public ResearchIntelligenceService.ResearchResponse profile(@PathVariable String symbol) { return service.analyze(symbol); }

    @GetMapping("/parameters")
    public ResearchIntelligenceService.ResearchResponse parameters(@PathVariable String symbol) { return service.analyze(symbol); }

    @GetMapping("/score")
    public ResearchIntelligenceService.ResearchResponse score(@PathVariable String symbol) { return service.analyze(symbol); }

    @PostMapping("/runs")
    public RecordedResearchRun record(@PathVariable String symbol, Authentication authentication) {
        ResearchIntelligenceService.ResearchResponse response = service.analyze(symbol);
        UUID runId = runPersistenceService.record(currentUserId(authentication), response);
        return new RecordedResearchRun(runId, response);
    }

    @GetMapping("/runs/latest")
    public ResearchRunPersistenceService.PersistedResearchRun latest(@PathVariable String symbol, Authentication authentication) {
        return runPersistenceService.latest(currentUserId(authentication), symbol.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No saved research run exists for this symbol."));
    }

    private UUID currentUserId(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user no longer exists."))
                .getId();
    }

    public record RecordedResearchRun(UUID runId, ResearchIntelligenceService.ResearchResponse response) { }
}
