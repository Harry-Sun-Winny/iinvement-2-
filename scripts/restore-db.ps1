param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

# Ensure the backup file exists
$BackupFileFullPath = Resolve-Path $BackupFile
if (-not (Test-Path -LiteralPath $BackupFileFullPath -PathType Leaf)) {
    throw "Backup file not found: $BackupFile"
}

Write-Host "Starting database restoration..."
Write-Host "Backup file: $BackupFileFullPath"

# 1. Clear the existing database schema to ensure clean restore
Write-Host "Cleaning existing database schema..."
docker compose exec -T postgres psql -U investment -d investment -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. Copy the backup file to the database container
Write-Host "Copying backup file to container..."
docker compose cp $BackupFileFullPath postgres:/tmp/backup.sql.gz

# 3. Restore using gunzip and psql
Write-Host "Restoring data..."
docker compose exec -T postgres sh -c "gunzip -c /tmp/backup.sql.gz | psql -U investment -d investment"

# 4. Clean up temporary file in the container
Write-Host "Cleaning up temporary files..."
docker compose exec -T postgres rm /tmp/backup.sql.gz

Write-Host "Database restoration complete!"
