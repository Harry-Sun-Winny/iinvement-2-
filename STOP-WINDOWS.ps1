$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $project
docker compose -f compose.install.yml down
if ($LASTEXITCODE -ne 0) { throw 'Khong the dung app. Kiem tra Docker Desktop.' }
Write-Host 'Da dung app. Du lieu van duoc giu trong Docker volumes.'
