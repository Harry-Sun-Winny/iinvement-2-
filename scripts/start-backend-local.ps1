[CmdletBinding()]
param(
    [ValidateSet('Prepare', 'Wait')][string]$Mode = 'Prepare',
    [ValidateRange(5, 600)][int]$TimeoutSeconds = 240
)
$ErrorActionPreference = 'Stop'

function Test-InvestmentBackend {
    try {
        $doc = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/v3/api-docs' -TimeoutSec 3
        return ($null -ne $doc.paths -and $doc.paths.PSObject.Properties.Name -contains '/api/v1/portfolios')
    } catch { return $false }
}

function Test-BackendPort {
    $client = New-Object Net.Sockets.TcpClient
    try {
        $pending = $client.BeginConnect('127.0.0.1', 8080, $null, $null)
        if (-not $pending.AsyncWaitHandle.WaitOne(500)) { return $false }
        $client.EndConnect($pending)
        return $true
    } catch { return $false } finally { $client.Dispose() }
}

function Wait-InvestmentBackend {
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $nextUpdate = [DateTime]::UtcNow
    do {
        if (Test-InvestmentBackend) {
            Write-Host '[READY] Investment backend: http://localhost:8080'
            return
        }
        if ([DateTime]::UtcNow -ge $deadline) {
            throw 'Backend is not ready yet. Check the Backend Spring Boot window for the original error. Do not start another copy.'
        }
        if ([DateTime]::UtcNow -ge $nextUpdate) {
            Write-Host '[WAIT] Backend is compiling/starting...'
            $nextUpdate = [DateTime]::UtcNow.AddSeconds(15)
        }
        Start-Sleep -Seconds 2
    } while ($true)
}

function Test-DatabaseConnection {
    $url = $env:SPRING_DATASOURCE_URL
    $username = $env:SPRING_DATASOURCE_USERNAME
    if ([string]::IsNullOrWhiteSpace($url) -or [string]::IsNullOrWhiteSpace($username)) {
        throw 'Database URL and username must be set in run-all.bat.'
    }
    if ($url -cne $url.Trim() -or $username -cne $username.Trim()) {
        throw 'Database URL/username has surrounding spaces. Use set "NAME=value" in run-all.bat.'
    }
    $uri = [Uri]($url -replace '^jdbc:', '')
    if ($uri.Scheme -ne 'postgresql' -or $uri.Host -notin @('localhost', '127.0.0.1') -or $uri.Port -ne 5433) {
        throw 'This launcher expects the existing local PostgreSQL instance on port 5433.'
    }
    $bin = Join-Path $env:ProgramFiles 'PostgreSQL\18\bin'
    if ($env:POSTGRES_BIN) { $bin = $env:POSTGRES_BIN }
    $ready = Join-Path $bin 'pg_isready.exe'
    $psql = Join-Path $bin 'psql.exe'
    if (-not (Test-Path -LiteralPath $ready) -or -not (Test-Path -LiteralPath $psql)) {
        throw 'PostgreSQL tools not found. Set POSTGRES_BIN to the installed bin directory.'
    }
    & $ready -q -h 127.0.0.1 -p 5433 -t 1
    if ($LASTEXITCODE -ne 0) {
        $serviceName = 'postgresql-x64-18'
        if ($env:POSTGRES_SERVICE) { $serviceName = $env:POSTGRES_SERVICE }
        $service = Get-Service -Name $serviceName
        if ($service.Status -eq 'Stopped') {
            try { Start-Service -Name $serviceName -ErrorAction Stop }
            catch { throw "Start the $serviceName service as administrator before running this launcher." }
        }
    }
    Write-Host '[WAIT] Checking PostgreSQL readiness and database login...'
    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    do {
        & $ready -q -h 127.0.0.1 -p 5433 -t 1
        if ($LASTEXITCODE -eq 0) { break }
        if ([DateTime]::UtcNow -ge $deadline) { throw 'PostgreSQL did not become ready within 60 seconds.' }
        Start-Sleep -Seconds 1
    } while ($true)
    $previousPassword = $env:PGPASSWORD
    $previousTimeout = $env:PGCONNECT_TIMEOUT
    try {
        $env:PGPASSWORD = $env:SPRING_DATASOURCE_PASSWORD
        $env:PGCONNECT_TIMEOUT = '5'
        $database = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
        & $psql -X -w -h 127.0.0.1 -p 5433 -U $username -d $database -At -c 'SELECT 1;' | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Database login failed. Maven was not started. Check run-all.bat settings.' }
    } finally {
        $env:PGPASSWORD = $previousPassword
        $env:PGCONNECT_TIMEOUT = $previousTimeout
    }
    Write-Host '[READY] Database connection verified.'
}

if ($MyInvocation.InvocationName -ne '.') {
    try {
        if ($Mode -eq 'Wait') { Wait-InvestmentBackend }
        elseif (Test-InvestmentBackend) {
            Write-Host '[READY] Investment backend already running; no duplicate needed.'
            exit 10
        } else { Test-DatabaseConnection }
    } catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}
