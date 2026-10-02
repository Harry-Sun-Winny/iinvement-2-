@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL-WINDOWS.ps1"
if errorlevel 1 (
  echo.
  echo Cai dat chua hoan thanh. Doc thong bao o tren.
  pause
  exit /b 1
)
echo.
echo Da xong. Nhan phim bat ky de dong cua so.
pause >nul
