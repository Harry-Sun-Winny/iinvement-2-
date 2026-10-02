$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $project
if (-not (Test-Path -LiteralPath '.env')) { throw 'Hay chay INSTALL-WINDOWS.ps1 truoc.' }
docker compose -f compose.install.yml up -d
if ($LASTEXITCODE -ne 0) { throw 'Khong the khoi dong. Kiem tra Docker Desktop.' }
Start-Process 'http://localhost:3002'
