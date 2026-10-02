# Local run-all startup

Entry point: `D:\run-all.bat`. A backup of the previous launcher is kept at
`D:\run-all.bat.before-startup-fix.bak`.

The original unquoted `set NAME=value &&` assignments included trailing spaces.
PostgreSQL rejected the resulting username (`postgres `). The corrected launcher
uses quoted assignments and retains the same database and credentials.

The backend block calls `scripts/start-backend-local.ps1` to check PostgreSQL
readiness and run a read-only `SELECT 1` with the actual credentials before Maven.
An existing Investment API is reused. An occupied 8080 port is waited on instead
of starting a duplicate. Readiness is verified using the existing OpenAPI route
and its portfolio endpoint, not merely an open TCP port.

Run `D:\run-all.bat --backend-only` to verify just this backend without relaunching
the seven unrelated applications. Their original launch commands are unchanged.
The launcher does not claim those other applications have passed health checks.

```mermaid
sequenceDiagram
    participant Bat as run-all.bat
    participant Check as Startup checks
    participant DB as Local PostgreSQL
    participant API as Investment backend
    Bat->>Check: Prepare (quoted environment values)
    alt Backend already listening
        Check->>API: Wait for portfolio OpenAPI endpoint
        Check-->>Bat: Reuse existing backend
    else Backend not listening
        Check->>DB: pg_isready, SELECT 1
        DB-->>Check: Ready and authenticated
        Check-->>Bat: Start permitted
        Bat->>API: Launch existing Maven command
        Bat->>Check: Wait for API readiness
    end
```

No API contract, OpenAPI definition, schema, migration, database password,
or application business logic was changed. A stopped PostgreSQL Windows service
may require administrator rights to start; errors are reported without retrying
Maven blindly or killing other processes.
