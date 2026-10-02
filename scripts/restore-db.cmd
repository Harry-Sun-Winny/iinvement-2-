@echo off
setlocal

if "%~1"=="" (
    echo Usage: restore-db.cmd ^<path_to_backup_file^>
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore-db.ps1" -BackupFile "%~1"
exit /b %errorlevel%
