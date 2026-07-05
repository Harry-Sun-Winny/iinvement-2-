$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

Write-Host "Starting isolated stack for this repo..." -ForegroundColor Cyan
Write-Host "Frontend: http://127.0.0.1:3002" -ForegroundColor Yellow
Write-Host "Backend:  shared at http://127.0.0.1:8080" -ForegroundColor Yellow
Write-Host "Postgres/Redis: shared by app 3000 backend" -ForegroundColor Yellow

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$frontendDir'; npm.cmd run dev -- --hostname 127.0.0.1 --port 3002"
)

Write-Host ""
Write-Host "Launched frontend for this repo." -ForegroundColor Green
Write-Host "This app now follows app 3000 and uses the same backend/data on port 8080." -ForegroundColor Green
