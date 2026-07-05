package com.acme.investment.application;

import com.acme.investment.application.news.NewsIngestionService;
import com.acme.investment.domain.news.NewsArticle;
import com.acme.investment.domain.news.NewsSummary;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class NewsAggregationService {
    private final NewsIngestionService newsIngestionService;

    public NewsAggregationService(NewsIngestionService newsIngestionService) {
        this.newsIngestionService = newsIngestionService;
    }

    public List<NewsArticle> latestArticles(String asset) {
        return newsIngestionService.listLatest(asset);
    }

    /** @deprecated use {@link #latestArticles(String)} for full article data */
    @Deprecated
    public List<NewsSummary> latest() {
        return newsIngestionService.listLatest(null).stream()
                .map(a -> new NewsSummary(a.source(), a.publicationDate(), a.summary(), a.url()))
                .toList();
    }
}
