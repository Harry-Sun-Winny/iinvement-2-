package com.acme.investment.interfaces.api;

import com.acme.investment.application.market.MarketDataService;
import com.acme.investment.domain.market.MarketData;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/market")
public class MarketController {

    private final MarketDataService marketDataService;

    public MarketController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @GetMapping("/{symbol}/details")
    public MarketData getMarketDetails(@PathVariable String symbol) {
        return marketDataService.getUnifiedMarketData(symbol);
    }
}
