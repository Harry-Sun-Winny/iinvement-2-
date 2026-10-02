# Bootstrap the First Local Administrator

Public `POST /api/v1/auth/register` always creates a `USER`. It cannot accept a role and must not be changed to do so.

To create the first local Admin, stop the backend and run it once with explicit process-only environment variables. Use a unique password of at least 12 characters; do not put it in source control or `.env.local`.

```powershell
cd backend
$env:SECURITY_BOOTSTRAP_ADMIN_ENABLED = "true"
$env:SECURITY_BOOTSTRAP_ADMIN_EMAIL = "your-admin@example.com"
$env:SECURITY_BOOTSTRAP_ADMIN_PASSWORD = "replace-with-a-unique-12-plus-character-password"
$env:SECURITY_BOOTSTRAP_ADMIN_FULL_NAME = "Platform Administrator"
$env:NEWS_INGESTION_ENABLED = "false"
.\mvnw.cmd spring-boot:run
```

On startup, the service either creates that account as `ADMIN`, or promotes the existing account with the matching email. It records `BOOTSTRAP_CREATE_ADMIN` or `BOOTSTRAP_PROMOTE_ADMIN` in `audit_logs`. Existing account passwords are never replaced by promotion.

After the application has started successfully, stop it, clear the variables, and start normally:

```powershell
Remove-Item Env:SECURITY_BOOTSTRAP_ADMIN_ENABLED
Remove-Item Env:SECURITY_BOOTSTRAP_ADMIN_EMAIL
Remove-Item Env:SECURITY_BOOTSTRAP_ADMIN_PASSWORD
Remove-Item Env:SECURITY_BOOTSTRAP_ADMIN_FULL_NAME
.\mvnw.cmd spring-boot:run
```

The frontend Admin catalog page at `/admin/research-catalog` will work after logging in with this account. Keep the bootstrap flag off in shared, staging, and production environments; use a separate audited administrator-management workflow there.
