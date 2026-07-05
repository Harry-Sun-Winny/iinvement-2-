@echo off
setlocal

set "PG_BIN=C:\Program Files\PostgreSQL\18\bin"
set "PGHOST=localhost"
set "PGPORT=5433"
set "PGDATABASE=investment"
set "PGUSER=postgres"
set "PGPASSWORD=postgres123"

set "BACKUP_ROOT=%~dp0..\backups"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set "STAMP=%%i"
set "TARGET_DIR=%BACKUP_ROOT%\%STAMP%"
set "TARGET_FILE=%TARGET_DIR%\investment.backup"

if not exist "%PG_BIN%\pg_dump.exe" (
  echo pg_dump.exe not found at "%PG_BIN%".
  exit /b 1
)

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo Creating backup in "%TARGET_FILE%"...
"%PG_BIN%\pg_dump.exe" ^
  --host=%PGHOST% ^
  --port=%PGPORT% ^
  --username=%PGUSER% ^
  --format=custom ^
  --blobs ^
  --verbose ^
  --file="%TARGET_FILE%" ^
  %PGDATABASE%

if errorlevel 1 (
  echo Backup failed.
  exit /b 1
)

echo Backup completed successfully.
echo File: "%TARGET_FILE%"
endlocal
