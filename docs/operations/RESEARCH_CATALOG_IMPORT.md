# Import the 3,600-Parameter Research Catalog

## What Happens Automatically

Starting the backend runs Flyway migrations through `V21`. These migrations create the secure, user-owned research-run schema, the 3,600-code catalog skeleton, and six approved live-source proxy mappings. They do **not** retain or automatically read a document from a developer machine.

## One-Time Catalog Import

Sign in with an `ADMIN` account, copy its access token, then upload the approved DOCX to the backend's default port (`8080`):

```powershell
$token = "<admin-access-token>"
$catalog = "C:\path\to\TU_DIEN_3600_THAM_SO_DAU_TU_THEO_TUNG_MA_DOC_LAP_V2.docx"

curl.exe -X POST "http://localhost:8080/api/v1/research/catalog/import" `
  -H "Authorization: Bearer $token" `
  -F "file=@$catalog;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document"
```

A successful response has `importedEntries: 3600` and `catalogStatus: DOCUMENTED_PENDING_SOURCE_MAPPING`.

The same authenticated Admin flow is available in the frontend at `/admin/research-catalog`; it is a convenience UI over the same protected endpoint.

## Safety Properties

- Only `ADMIN` may import the catalog.
- The parser accepts only the exact codes `M1-001` through `M12-300` and validates all 3,600 before any database write.
- Malformed, partial, or duplicate documents return `400` and leave the catalog unchanged.
- The upload is processed in memory and is not stored on the server.
- A successful import creates an `IMPORT` audit-log record.

`DOCUMENTED_PENDING_SOURCE_MAPPING` means the definition is available for review, but it does not falsely claim that a live data feed or a score formula exists for that entry.
