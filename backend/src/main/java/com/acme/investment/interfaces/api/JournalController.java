package com.acme.investment.interfaces.api;

import com.acme.investment.application.journal.JournalAttachmentStorageService;
import com.acme.investment.application.journal.JournalService;
import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import com.acme.investment.interfaces.api.journal.JournalDtos.JournalEntryRequest;
import com.acme.investment.interfaces.api.journal.JournalDtos.JournalEntryResponse;
import com.acme.investment.interfaces.api.journal.JournalDtos.JournalAttachmentUploadResponse;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class JournalController {

    private final JournalService journalService;
    private final JournalAttachmentStorageService journalAttachmentStorageService;
    private final UserJpaRepository userRepo;

    public JournalController(
            JournalService journalService,
            JournalAttachmentStorageService journalAttachmentStorageService,
            UserJpaRepository userRepo
    ) {
        this.journalService = journalService;
        this.journalAttachmentStorageService = journalAttachmentStorageService;
        this.userRepo = userRepo;
    }

    private UUID resolveUserId(UserDetails userDetails) {
        return userRepo.findByEmail(userDetails.getUsername())
                .orElseThrow().getId();
    }

    @GetMapping("/portfolios/{portfolioId}/journal")
    public ResponseEntity<List<JournalEntryResponse>> getJournal(
            @PathVariable UUID portfolioId,
            @RequestParam(required = false) String symbol,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = resolveUserId(userDetails);
        return ResponseEntity.ok(journalService.getByPortfolio(portfolioId, userId, symbol));
    }

    @PostMapping("/portfolios/{portfolioId}/journal")
    public ResponseEntity<JournalEntryResponse> createJournal(
            @PathVariable UUID portfolioId,
            @RequestBody JournalEntryRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = resolveUserId(userDetails);
        return ResponseEntity.ok(journalService.create(portfolioId, userId, request));
    }

    @PostMapping(value = "/journal/attachments/upload")
    public ResponseEntity<JournalAttachmentUploadResponse> uploadJournalAttachment(
            @RequestParam("file") MultipartFile file,
            @RequestParam("attachmentType") String attachmentType,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = resolveUserId(userDetails);
        var stored = journalAttachmentStorageService.store(userId, file, attachmentType);
        return ResponseEntity.ok(new JournalAttachmentUploadResponse(
                stored.storageKey(),
                stored.publicUrl(),
                stored.fileName(),
                stored.attachmentType(),
                stored.mimeType(),
                stored.sizeBytes()
        ));
    }

    @GetMapping("/journal/attachments/content")
    public ResponseEntity<Resource> downloadJournalAttachment(
            @RequestParam("storageKey") String storageKey,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = resolveUserId(userDetails);
        var stored = journalAttachmentStorageService.load(userId, storageKey);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(stored.mimeType()))
                .contentLength(stored.sizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + stored.fileName() + "\"")
                .body(stored.resource());
    }
}
