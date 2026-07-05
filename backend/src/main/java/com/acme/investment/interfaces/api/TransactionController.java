package com.acme.investment.interfaces.api;

import com.acme.investment.application.transaction.TransactionService;
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
    private final UserJpaRepository userRepo;

    public TransactionController(TransactionService transactionService,
                                  UserJpaRepository userRepo) {
        this.transactionService = transactionService;
        this.userRepo = userRepo;
    }

    private UUID resolveUserId(UserDetails u) {
        return userRepo.findByEmail(u.getUsername()).orElseThrow().getId();
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
            req.transactionDate(), req.notes());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID portfolioId,
                       @PathVariable UUID id,
                       @AuthenticationPrincipal UserDetails u) {
        UUID userId = resolveUserId(u);
        transactionService.delete(id, userId);
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
                req.transactionDate(), req.notes());
    }

    public record CreateTransactionRequest(
        String assetSymbol, String assetName, String type,
        BigDecimal quantity, BigDecimal price, String currency,
        LocalDate transactionDate, String notes
    ) {}
}
