@echo off
setlocal

if "%~1"=="" (
  echo Usage: restore-postgres.cmd "D:\path\to\investment.backup"
  exit /b 1
)

set "BACKUP_FILE=%~1"
set "PG_BIN=C:\Program Files\PostgreSQL\18\bin"
set "PGHOST=localhost"
set "PGPORT=5433"
set "PGDATABASE=investment"
set "PGUSER=postgres"
set "PGPASSWORD=postgres123"

if not exist "%BACKUP_FILE%" (
  echo Backup file not found: "%BACKUP_FILE%"
  exit /b 1
)

if not exist "%PG_BIN%\pg_restore.exe" (
  echo pg_restore.exe not found at "%PG_BIN%".
  exit /b 1
)

echo This will replace data in database "%PGDATABASE%".
set /p CONFIRM=Type RESTORE to continue: 
if /I not "%CONFIRM%"=="RESTORE" (
  echo Restore cancelled.
  exit /b 1
)

echo Dropping and recreating schema...
"%PG_BIN%\psql.exe" -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
if errorlevel 1 (
  echo Failed to reset schema.
  exit /b 1
)

echo Restoring backup from "%BACKUP_FILE%"...
"%PG_BIN%\pg_restore.exe" ^
  --host=%PGHOST% ^
  --port=%PGPORT% ^
  --username=%PGUSER% ^
  --dbname=%PGDATABASE% ^
  --clean ^
  --if-exists ^
  --no-owner ^
  --no-privileges ^
  --verbose ^
  "%BACKUP_FILE%"

if errorlevel 1 (
  echo Restore failed.
  exit /b 1
)

echo Restore completed successfully.
endlocal
