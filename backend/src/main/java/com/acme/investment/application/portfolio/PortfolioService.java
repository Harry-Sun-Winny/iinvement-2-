
package com.acme.investment.application.portfolio;

import com.acme.investment.domain.portfolio.Portfolio;
import com.acme.investment.infrastructure.persistence.UserJpaRepository;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioEntity;
import com.acme.investment.infrastructure.persistence.portfolio.PortfolioJpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@Service
public class PortfolioService {
    private final PortfolioJpaRepository portfolioRepo;
    private final UserJpaRepository userRepo;

    public PortfolioService(PortfolioJpaRepository portfolioRepo, UserJpaRepository userRepo) {
        this.portfolioRepo = portfolioRepo;
        this.userRepo = userRepo;
    }

    public List<Portfolio> listByUser(UUID userId) {
        return portfolioRepo.findByUserId(userId)
                .stream().map(PortfolioEntity::toDomain).toList();
    }

    public Portfolio getById(UUID id, UUID userId) {
        return portfolioRepo.findById(id)
                .filter(p -> p.getUser().getId().equals(userId))
                .map(PortfolioEntity::toDomain)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    public Portfolio create(UUID userId, String name, String baseCurrency, String type) {
        if (portfolioRepo.existsByUserIdAndName(userId, name))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Portfolio name already exists");
        var user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var entity = new PortfolioEntity();
        entity.setUser(user);
        entity.setName(name);
        entity.setBaseCurrency(baseCurrency);
        entity.setType(type != null ? type : "STOCKS");
        return portfolioRepo.save(entity).toDomain();
    }

    public Portfolio update(UUID id, UUID userId, String name, String baseCurrency, String type) {
        var entity = portfolioRepo.findById(id)
                .filter(p -> p.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        entity.setName(name);
        entity.setBaseCurrency(baseCurrency);
        if (type != null) entity.setType(type);
        return portfolioRepo.save(entity).toDomain();
    }

    public void delete(UUID id, UUID userId) {
        var entity = portfolioRepo.findById(id)
                .filter(p -> p.getUser().getId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        portfolioRepo.delete(entity);
    }
}


