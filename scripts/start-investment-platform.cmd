@echo off
setlocal EnableExtensions

rem Starts the local development stack for the Investment Platform.
rem PostgreSQL is expected at localhost:5433, backend at :8080, frontend at :3000.
set "ROOT=%~dp0.."
set "POSTGRES_PORT=5433"
if not defined POSTGRES_SERVICE set "POSTGRES_SERVICE=postgresql-x64-18"

echo [Investment Platform] Checking PostgreSQL on port %POSTGRES_PORT%...
call :is_port_open %POSTGRES_PORT%
if not errorlevel 1 goto postgres_ready

echo [Investment Platform] Starting Windows service "%POSTGRES_SERVICE%"...
powershell -NoProfile -Command "$service = Get-Service -Name $env:POSTGRES_SERVICE -ErrorAction SilentlyContinue; if ($null -eq $service) { exit 1 }; if ($service.Status -ne 'Running') { Start-Service -Name $service.Name -ErrorAction Stop }; exit 0"
if errorlevel 1 (
  echo [Investment Platform] PostgreSQL service "%POSTGRES_SERVICE%" could not be started.
  echo Set POSTGRES_SERVICE to the installed service name, then run this script again.
  exit /b 1
)

echo [Investment Platform] Waiting for PostgreSQL...
for /L %%i in (1,1,30) do (
  call :is_port_open %POSTGRES_PORT%
  if not errorlevel 1 goto postgres_ready
  timeout /t 1 /nobreak >nul
)
echo [Investment Platform] PostgreSQL did not become ready on port %POSTGRES_PORT%.
exit /b 1

:postgres_ready
call :is_port_open 8080
if not errorlevel 1 (
  echo [Investment Platform] Backend is already listening on port 8080.
) else (
  start "Investment Platform Backend" cmd /k "cd /d \"%ROOT%\backend\" && set SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:%POSTGRES_PORT%/investment && set SPRING_DATASOURCE_USERNAME=investment && set SPRING_DATASOURCE_PASSWORD=investment_dev_password && call .\mvnw.cmd spring-boot:run"
)

call :is_port_open 3000
if not errorlevel 1 (
  echo [Investment Platform] Frontend is already listening on port 3000.
) else (
  start "Investment Platform Frontend" cmd /k "cd /d \"%ROOT%\frontend\" && npm.cmd run dev -- --hostname 127.0.0.1 --port 3000"
)

echo [Investment Platform] Local stack is ready.
echo Existing services were reused; missing services were launched in new windows.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8080
exit /b 0

:is_port_open
powershell -NoProfile -Command "$client = New-Object System.Net.Sockets.TcpClient; $open = $false; try { $connect = $client.BeginConnect('127.0.0.1', %~1, $null, $null); if ($connect.AsyncWaitHandle.WaitOne(1000)) { $client.EndConnect($connect); $open = $true } } catch {} finally { $client.Close() }; if ($open) { exit 0 } else { exit 1 }"
exit /b %errorlevel%
