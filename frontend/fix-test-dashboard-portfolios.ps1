$path = "D:\3510\2026-06-03\you-are-the-lead-software-engineer\frontend\app\page.tsx"

$text = Get-Content -LiteralPath $path -Raw

if ($text.Contains("false && pricedPositions.length === 0 ? (")) {
  Write-Host "App test dashboard is already fixed."
  exit 0
}

if (-not $text.Contains("pricedPositions.length === 0 ? (")) {
  Write-Error "Could not find the priced holdings condition in app test page.tsx."
  exit 1
}

$text = $text.Replace("pricedPositions.length === 0 ? (", "false && pricedPositions.length === 0 ? (")
Set-Content -LiteralPath $path -Value $text -NoNewline
Write-Host "App test dashboard portfolio visibility fixed."
