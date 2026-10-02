package com.acme.investment.interfaces.api;

import com.acme.investment.application.transaction.TransactionService;
import com.acme.investment.application.transaction.TransactionImportService;
import com.acme.investment.domain.transaction.Transaction;
import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolioId}/transactions")
public class TransactionController {
    private final TransactionService transactionService;
    private final TransactionImportService transactionImportService;
    private final UserJpaRepository userRepo;

    public TransactionController(TransactionService transactionService,
                                  TransactionImportService transactionImportService,
                                  UserJpaRepository userRepo) {
        this.transactionService = transactionService;
        this.transactionImportService = transactionImportService;
        this.userRepo = userRepo;
    }

    private UUID resolveUserId(UserDetails u) {
        return userRepo.findByEmail(u.getUsername()).orElseThrow().getId();
    }

    @PostMapping("/import/preview")
    public TransactionImportService.ImportPreview previewImport(@PathVariable UUID portfolioId,
            @RequestBody ImportTransactionsRequest req, @AuthenticationPrincipal UserDetails u) {
        requirePremium(u);
        transactionService.listByPortfolio(portfolioId, resolveUserId(u));
        return transactionImportService.preview(req.rows());
    }

    @PostMapping("/import/commit")
    @ResponseStatus(HttpStatus.CREATED)
    public List<Transaction> commitImport(@PathVariable UUID portfolioId,
            @RequestBody ImportTransactionsRequest req, @AuthenticationPrincipal UserDetails u) {
        requirePremium(u);
        var preview = transactionImportService.preview(req.rows());
        if (!preview.isReadyToImport()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Import data has errors; review the preview before committing.");
        }
        return transactionService.createBatch(portfolioId, resolveUserId(u), preview.rows());
    }

    private void requirePremium(UserDetails user) {
        boolean allowed = user.getAuthorities().stream().anyMatch(authority ->
                "ROLE_PREMIUM".equals(authority.getAuthority()) || "ROLE_ADMIN".equals(authority.getAuthority()));
        if (!allowed) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN,
                "Transaction import is available to Premium accounts only.");
    }
    @GetMapping
    public List<Transaction> list(@PathVariable UUID portfolioId,
                                   @AuthenticationPrincipal UserDetails u) {
        return transactionService.listByPortfolio(portfolioId, resolveUserId(u));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Transaction create(@PathVariable UUID portfolioId,
                               @RequestBody CreateTransactionRequest req,
                               @AuthenticationPrincipal UserDetails u) {
        UUID userId = resolveUserId(u);
        return transactionService.create(portfolioId, userId,
            req.assetSymbol(), req.assetName(), req.type(),
            req.quantity(), req.price(), req.currency(),
            req.transactionDate(), req.notes(), req.fee());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID portfolioId,
                       @PathVariable UUID id,
                       @AuthenticationPrincipal UserDetails u) {
        UUID userId = resolveUserId(u);
        transactionService.delete(id, userId, portfolioId);
    }

    @PutMapping("/{id}")
    public Transaction update(@PathVariable UUID portfolioId,
                              @PathVariable UUID id,
                              @RequestBody CreateTransactionRequest req,
                              @AuthenticationPrincipal UserDetails u) {
        UUID userId = resolveUserId(u);
        return transactionService.update(id, userId, portfolioId,
                req.assetSymbol(), req.assetName(), req.type(),
                req.quantity(), req.price(), req.currency(),
                req.transactionDate(), req.notes(), req.fee());
    }

    @PatchMapping("/positions/{symbol}/transfer")
    public TransactionService.TransferResult transferPosition(
            @PathVariable UUID portfolioId,
            @PathVariable String symbol,
            @RequestBody TransferPositionRequest req,
            @AuthenticationPrincipal UserDetails u) {
        return transactionService.transferSymbol(
                portfolioId,
                req.targetPortfolioId(),
                resolveUserId(u),
                symbol
        );
    }

    public record CreateTransactionRequest(
        String assetSymbol, String assetName, String type,
        BigDecimal quantity, BigDecimal price, String currency,
        LocalDate transactionDate, String notes, BigDecimal fee
    ) {}

    public record ImportTransactionsRequest(List<TransactionImportService.ImportRow> rows) {}

    public record TransferPositionRequest(UUID targetPortfolioId) {}
}
