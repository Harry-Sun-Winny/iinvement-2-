@echo off
setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage: restore-db.cmd ^<path_to_backup_file^>
    exit /b 1
)

set BACKUP_FILE=%~1

if not exist "%BACKUP_FILE%" (
    echo Error: Backup file not found at %BACKUP_FILE%
    exit /b 1
)

echo Starting database restoration from %BACKUP_FILE%...

echo Cleaning existing database schema...
docker compose exec -T postgres psql -U investment -d investment -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
if %errorlevel% neq 0 (
    echo Error cleaning database schema.
    exit /b %errorlevel%
)

echo Copying backup file to container...
docker compose cp "%BACKUP_FILE%" postgres:/tmp/backup.sql.gz
if %errorlevel% neq 0 (
    echo Error copying file.
    exit /b %errorlevel%
)

echo Restoring data...
docker compose exec -T postgres sh -c "gunzip -c /tmp/backup.sql.gz | psql -U investment -d investment"
if %errorlevel% neq 0 (
    echo Error restoring data.
    exit /b %errorlevel%
)

echo Cleaning up temporary files...
docker compose exec -T postgres rm /tmp/backup.sql.gz

echo Database restoration complete!
