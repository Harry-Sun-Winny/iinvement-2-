param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

$PgBin = "C:\Program Files\PostgreSQL\18\bin"
$PgRestore = Join-Path $PgBin "pg_restore.exe"
$Psql = Join-Path $PgBin "psql.exe"
$TargetHost = "localhost"
$TargetPort = "5432"
$TargetDatabase = "investment"
$TargetUser = "investment"

$BackupFileFullPath = Resolve-Path $BackupFile
if (-not (Test-Path -LiteralPath $BackupFileFullPath -PathType Leaf)) {
    throw "Backup file not found: $BackupFile"
}
if (-not (Test-Path -LiteralPath $PgRestore -PathType Leaf) -or -not (Test-Path -LiteralPath $Psql -PathType Leaf)) {
    throw "PostgreSQL 18 client tools were not found at $PgBin"
}

$env:PGPASSWORD = "investment_dev_password"
Write-Host "Restoring custom .backup into PostgreSQL $TargetHost`:$TargetPort/$TargetDatabase..."

# The generated SQL is sent within one transaction. PostgreSQL 18 backups include a
# transaction_timeout setting that PostgreSQL 16 does not recognize, so filter that line.
& {
    "BEGIN;"
    "DROP SCHEMA public CASCADE;"
    "CREATE SCHEMA public;"
    & $PgRestore --no-owner --no-privileges --file=- $BackupFileFullPath
    "COMMIT;"
} | Where-Object { $_ -ne "SET transaction_timeout = 0;" } |
    & $Psql --host $TargetHost --port $TargetPort --username $TargetUser --dbname $TargetDatabase --set ON_ERROR_STOP=1

if ($LASTEXITCODE -ne 0) {
    throw "Database restoration failed and was rolled back."
}

Write-Host "Database restoration complete. Start the backend so Flyway can apply any newer migrations."
