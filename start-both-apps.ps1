$ErrorActionPreference = "Stop"

$repoA = "D:\3510\2026-06-03\you-are-the-lead-software-engineer"
$repoB = "D:\3510\DECUMENT\Codex\2026-06-03\you-are-the-lead-software-engineer"

Write-Host "Starting both app copies in isolated mode..." -ForegroundColor Cyan
Write-Host ""
Write-Host "App A" -ForegroundColor Yellow
Write-Host "- frontend: http://127.0.0.1:3000" -ForegroundColor Yellow
Write-Host "- backend:  http://127.0.0.1:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "App B" -ForegroundColor Green
Write-Host "- frontend: http://127.0.0.1:3002" -ForegroundColor Green
Write-Host "- backend:  shared at http://127.0.0.1:8080" -ForegroundColor Green
Write-Host ""

Start-Process cmd.exe -ArgumentList "/k", "cd /d $repoA\backend && mvnw.cmd spring-boot:run"
Start-Sleep -Seconds 3
Start-Process cmd.exe -ArgumentList "/k", "cd /d $repoA\frontend && npm.cmd run dev -- --hostname 127.0.0.1 --port 3000"

Start-Sleep -Seconds 3
Start-Process cmd.exe -ArgumentList "/k", "cd /d $repoB\frontend && npm.cmd run dev -- --hostname 127.0.0.1 --port 3002"

Write-Host "Three terminal windows were opened." -ForegroundColor Cyan
Write-Host "Wait until each frontend terminal shows its Local URL before refreshing Chrome." -ForegroundColor Cyan
