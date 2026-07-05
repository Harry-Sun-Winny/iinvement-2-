# Deep Analysis Database Update

## Summary

Feature `Phân tích chuyên sâu` khong thay doi schema database.

## Current Tables Used

- `portfolio_snapshots`
- `portfolios`
- `users`

## Why No Migration Is Needed

- Toan bo metric moi duoc suy ra tu snapshot lich su da ton tai.
- Khong them bang cache, khong doi ranh buoc, khong doi audit flow.

## Operational Note

- Do chinh xac phu thuoc vao do day du cua `portfolio_snapshots`.
- Neu can lam giau du lieu, frontend co nut goi `POST /api/v1/portfolios/{id}/backfill`.
