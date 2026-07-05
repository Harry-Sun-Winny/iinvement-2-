param(
    [Parameter(Mandatory = $true)]
    [string]$RecoveryFile,

    [Parameter(Mandatory = $true)]
    [string]$Email,

    [Parameter(Mandatory = $true)]
    [string]$Password,

    [string]$ApiBaseUrl = "http://localhost:8080/api/v1",

    [switch]$Apply
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [hashtable]$Headers = @{},

        [object]$Body
    )

    $parameters = @{
        Method      = $Method
        Uri         = "$ApiBaseUrl$Path"
        Headers     = $Headers
        ContentType = "application/json"
    }

    if ($null -ne $Body) {
        $parameters.Body = $Body | ConvertTo-Json -Depth 10 -Compress
    }

    Invoke-RestMethod @parameters
}

function As-Array {
    param([object]$Value)

    if ($null -eq $Value) {
        return @()
    }

    return @($Value)
}

if (-not (Test-Path -LiteralPath $RecoveryFile -PathType Leaf)) {
    throw "Recovery file not found: $RecoveryFile"
}

$document = Get-Content -Raw -LiteralPath $RecoveryFile | ConvertFrom-Json
$cacheEntry = $document.entries |
    Where-Object { $_.key -eq "investment-dashboard-cache-v1" } |
    Select-Object -First 1

if ($null -eq $cacheEntry) {
    throw "The recovery file does not contain investment-dashboard-cache-v1."
}

$cache = $cacheEntry.parsedValue
$portfolios = As-Array $cache.portfolios
$positions = As-Array $cache.positions
$watchlists = As-Array $cache.watchlists

if ($portfolios.Count -eq 0 -or $positions.Count -eq 0) {
    throw "The recovery cache does not contain portfolios and positions."
}

$invalidPositions = @(
    $positions | Where-Object {
        [string]::IsNullOrWhiteSpace([string]$_.symbol) -or
        [decimal]$_.quantity -le 0 -or
        [decimal]$_.avgCost -lt 0
    }
)

$duplicatePositions = @(
    $positions |
        Group-Object portfolioId, symbol |
        Where-Object { $_.Count -gt 1 }
)

if ($invalidPositions.Count -gt 0) {
    throw "Recovery stopped: $($invalidPositions.Count) invalid positions found."
}

if ($duplicatePositions.Count -gt 0) {
    throw "Recovery stopped: $($duplicatePositions.Count) duplicate positions found."
}

$snapshotValue = [decimal](
    $positions |
        Measure-Object -Property marketValue -Sum
).Sum

$costBasis = [decimal](
    $positions |
        ForEach-Object { [decimal]$_.quantity * [decimal]$_.avgCost } |
        Measure-Object -Sum
).Sum

Write-Host "Recovery source: $($document.sourceOrigin)"
Write-Host "Exported at: $($document.exportedAt)"
Write-Host "Portfolios: $($portfolios.Count)"
Write-Host "Positions: $($positions.Count)"
Write-Host "Watchlists: $($watchlists.Count)"
Write-Host "Cached market value: $snapshotValue"
Write-Host "Recovered cost basis: $costBasis"

if (-not $Apply) {
    Write-Host "Dry run complete. Add -Apply to write through the authenticated API."
    exit 0
}

$login = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email    = $Email.Trim().ToLowerInvariant()
    password = $Password
}

if ([string]::IsNullOrWhiteSpace([string]$login.token)) {
    throw "Login succeeded without returning a token."
}

$headers = @{ Authorization = "Bearer $($login.token)" }
$existingPortfolios = As-Array (Invoke-Api -Method "GET" -Path "/portfolios" -Headers $headers)
$existingWatchlists = As-Array (Invoke-Api -Method "GET" -Path "/watchlists" -Headers $headers)

if ($existingPortfolios.Count -gt 0 -or $existingWatchlists.Count -gt 0) {
    throw "Recovery stopped: the account already contains portfolios or watchlists."
}

$portfolioIdMap = @{}
$recoveryDate = ([datetime]$document.exportedAt).ToUniversalTime().ToString("yyyy-MM-dd")

foreach ($portfolio in $portfolios) {
    $created = Invoke-Api -Method "POST" -Path "/portfolios" -Headers $headers -Body @{
        name         = [string]$portfolio.name
        baseCurrency = [string]$portfolio.baseCurrency
        type         = [string]$portfolio.type
    }

    $portfolioIdMap[[string]$portfolio.id] = [string]$created.id
    Write-Host "Created portfolio: $($portfolio.name)"
}

foreach ($position in $positions) {
    $newPortfolioId = $portfolioIdMap[[string]$position.portfolioId]

    if ([string]::IsNullOrWhiteSpace($newPortfolioId)) {
        throw "No restored portfolio found for position $($position.symbol)."
    }

    Invoke-Api -Method "POST" -Path "/portfolios/$newPortfolioId/transactions" -Headers $headers -Body @{
        assetSymbol    = ([string]$position.symbol).Trim()
        assetName      = ([string]$position.name).Trim()
        type           = "BUY"
        quantity       = [decimal]::Round([decimal]$position.quantity, 8)
        price          = [decimal]::Round([decimal]$position.avgCost, 8)
        currency       = "USD"
        transactionDate = $recoveryDate
        notes          = "Recovered from browser dashboard cache v1; original transaction history was unavailable."
    } | Out-Null

    Write-Host "Restored position: $($position.portfolioName) / $($position.symbol)"
}

foreach ($watchlist in $watchlists) {
    Invoke-Api -Method "POST" -Path "/watchlists" -Headers $headers -Body @{
        name = [string]$watchlist.name
    } | Out-Null

    Write-Host "Created watchlist: $($watchlist.name)"
}

$restoredPortfolios = As-Array (Invoke-Api -Method "GET" -Path "/portfolios" -Headers $headers)
$restoredTransactionCount = 0

foreach ($portfolio in $restoredPortfolios) {
    $restoredTransactionCount += (
        As-Array (
            Invoke-Api -Method "GET" -Path "/portfolios/$($portfolio.id)/transactions" -Headers $headers
        )
    ).Count
}

if ($restoredPortfolios.Count -ne $portfolios.Count -or
    $restoredTransactionCount -ne $positions.Count) {
    throw "Verification failed: restored $($restoredPortfolios.Count) portfolios and $restoredTransactionCount transactions."
}

Write-Host "Recovery complete and verified."
Write-Host "Restored portfolios: $($restoredPortfolios.Count)"
Write-Host "Restored transactions: $restoredTransactionCount"
