$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $project

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Chua co Docker Desktop. Cai Docker Desktop, bat WSL 2, mo Docker Desktop roi chay lai file nay.'
}
docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker Desktop chua chay. Hay mo Docker Desktop va cho den khi engine san sang.'
}
docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Can Docker Compose v2 (di kem Docker Desktop).' }

$envFile = Join-Path $project '.env'
if (-not (Test-Path -LiteralPath $envFile)) {
  $dbBytes = New-Object byte[] 32
  $jwtBytes = New-Object byte[] 48
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($dbBytes)
    $rng.GetBytes($jwtBytes)
  } finally { $rng.Dispose() }
  $dbPassword = ([BitConverter]::ToString($dbBytes)).Replace('-', '')
  $jwtSecret = ([BitConverter]::ToString($jwtBytes)).Replace('-', '')
  $lines = @(
    "ANTIGRAVITY_DB_PASSWORD=$dbPassword"
    "ANTIGRAVITY_JWT_SECRET=$jwtSecret"
    'OPENAI_API_KEY='
    'FMP_API_KEY='
    'FINNHUB_API_KEY='
  )
  [System.IO.File]::WriteAllLines($envFile, $lines, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host 'Da tao .env voi mat khau rieng cho may nay. Dung dua file nay len GitHub.'
}

docker compose -f compose.install.yml up -d --build
if ($LASTEXITCODE -ne 0) { throw 'Cai dat/chay that bai. Xem thong bao Docker o tren.' }
Write-Host 'ANTIGRAVITY dang khoi dong. Truy cap http://localhost:3002 sau vai phut.'
Start-Process 'http://localhost:3002'
