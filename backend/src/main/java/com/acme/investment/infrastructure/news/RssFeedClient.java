package com.acme.investment.infrastructure.news;

import com.acme.investment.infrastructure.config.NewsProperties;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import java.net.URI;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class RssFeedClient {
    private static final Logger log = LoggerFactory.getLogger(RssFeedClient.class);
    private final NewsProperties newsProperties;

    public RssFeedClient(NewsProperties newsProperties) {
        this.newsProperties = newsProperties;
    }

    public List<RawNewsItem> fetchAll() {
        List<RawNewsItem> items = new ArrayList<>();
        for (NewsProperties.RssFeed feed : newsProperties.getRss().getFeeds()) {
            try {
                items.addAll(fetchFeed(feed.source(), feed.url()));
            } catch (Exception e) {
                log.warn("Failed to fetch RSS feed {}: {}", feed.url(), e.getMessage());
            }
        }
        return items;
    }

    @SuppressWarnings("deprecation")
    private List<RawNewsItem> fetchFeed(String source, String url) throws Exception {
        SyndFeedInput input = new SyndFeedInput();
        SyndFeed syndFeed = input.build(new XmlReader(URI.create(url).toURL()));
        List<RawNewsItem> items = new ArrayList<>();
        for (SyndEntry entry : syndFeed.getEntries()) {
            String link = entry.getLink();
            if (link == null || link.isBlank()) {
                continue;
            }
            String content = entry.getDescription() != null ? entry.getDescription().getValue() : "";
            OffsetDateTime published = toOffsetDateTime(entry.getPublishedDate());
            items.add(new RawNewsItem(source, entry.getTitle(), link, content, published));
        }
        return items;
    }

    private OffsetDateTime toOffsetDateTime(Date date) {
        if (date == null) {
            return OffsetDateTime.now(ZoneOffset.UTC);
        }
        return date.toInstant().atOffset(ZoneOffset.UTC);
    }
}
