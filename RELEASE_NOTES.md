# Release Notes - v0.1.0

## Overview
This release consolidates and harmonizes the code structure, database migrations, and configurations between Project A and Project B, converting the system into a robust, production-ready investment platform.

---

## Major Features & Improvements

### 1. Synchronization & Alignment
* Fully synchronized frontend assets, backend services, configurations, and mobile controllers between Project A and Project B.
* 100% byte-for-byte file parity across all 663 files in the repository.

### 2. Backend Improvements
* Consolidated and cleaned transaction/portfolio service handlers.
* Replaced all occurrences of `System.err` and `printStackTrace()` with structured SLF4J logger actions (`log.error`) in the market query services.
* Removed hardcoded fallback API credentials from the property config class (`fmp.api.key`, `finnhub.api.key`).

### 3. Frontend Improvements
* **Ledger Page**: Converted to a strict production-only view. Removed the mock data refresh buttons, Isolated mock generators to dev-only fixtures, and built custom state handlers for Empty lists and API failure retry alerts.
* Cleaned up runtime tracking telemetry (`console.log` statements in normalizer library).

### 4. Database & Flyway
* Aligned database schemas and Flyway scripts (V1 through V16).
* Ensured complete idempotency and seamless upgrades on empty or existing databases.

### 5. Security & Production Readiness
* Isolated secret parameters to local environment files (`.env.*`) that are strictly git-ignored.
* Full test coverage verify passes successfully.

---

## Final Verification Summary
* **Git Tag**: `v0.1.0`
* **Release Version**: `0.1.0`
* **Backend Build**: Clean compilation & test coverage (11/11 tests pass successfully).
* **Frontend Build**: Clean compilation & bundle trace generated successfully.
