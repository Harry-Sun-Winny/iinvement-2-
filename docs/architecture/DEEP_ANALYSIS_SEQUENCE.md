# Deep Analysis Sequence

## Purpose

Trang `Phân tích chuyên sâu` gom dữ liệu snapshot và risk metrics vào một luồng duy nhất để giảm số lần gọi, tăng tốc tải trang, và giữ cách diễn giải nhất quán giữa frontend và backend.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React Frontend
    participant API as Spring Boot API
    participant SNAP as PortfolioSnapshotRepository
    participant RISK as PortfolioRiskMetricsService
    participant DEEP as PortfolioDeepAnalysisService

    U->>FE: Open "Phân tích chuyên sâu"
    FE->>API: GET /api/v1/portfolios/{id}/deep-analysis
    API->>API: Validate JWT + ownership
    API->>DEEP: getDeepAnalysis(portfolioId)
    DEEP->>SNAP: findByPortfolioIdOrderBySnapshotDateAsc(portfolioId)
    DEEP->>RISK: calculateMetrics(portfolioId)
    RISK->>SNAP: findByPortfolioIdOrderBySnapshotDateAsc(portfolioId)
    SNAP-->>RISK: snapshot history
    RISK-->>DEEP: aggregate risk metrics
    DEEP-->>API: overview + equity curve + rolling risk + drawdown + methodology notes
    API-->>FE: 200 JSON
    FE->>U: Render static charts and explanations
```

## Notes

- Nguồn dữ liệu là `portfolio_snapshots` nội bộ.
- Không thêm AI claim mới ở backend; frontend chỉ diễn giải từ dữ liệu tính toán nội bộ.
- Payload có trường methodology để nêu nguồn, cách tính, và mức bất định.
