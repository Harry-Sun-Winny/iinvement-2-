package com.acme.investment.interfaces.api;

import com.acme.investment.application.intelligence.ResearchCatalogImportService;
import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/research/catalog")
public class ResearchCatalogController {
    private final ResearchCatalogImportService importService;
    private final UserJpaRepository userRepository;

    public ResearchCatalogController(ResearchCatalogImportService importService, UserJpaRepository userRepository) {
        this.importService = importService;
        this.userRepository = userRepository;
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResearchCatalogImportService.CatalogImportSummary importCatalog(@RequestParam("file") MultipartFile file,
                                                                            Authentication authentication) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A non-empty DOCX catalog file is required.");
        }
        try {
            return importService.importDocument(file.getInputStream(), currentUserId(authentication));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The catalog cannot be imported.", exception);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The uploaded catalog cannot be read.", exception);
        }
    }

    private UUID currentUserId(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user no longer exists."))
                .getId();
    }
}
