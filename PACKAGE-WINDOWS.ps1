param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $project
if (-not $OutputPath) { $OutputPath = Join-Path $project 'ANTIGRAVITY-Windows-Setup.zip' }
$outputFull = [System.IO.Path]::GetFullPath($OutputPath)
$outputDir = Split-Path -Parent $outputFull
if (-not (Test-Path -LiteralPath $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

$rootFiles = @(
  'compose.install.yml', 'INSTALL-WINDOWS.cmd', 'INSTALL-WINDOWS.ps1',
  'START-WINDOWS.cmd', 'START-WINDOWS.ps1', 'STOP-WINDOWS.cmd',
  'STOP-WINDOWS.ps1', 'HUONG-DAN-CAI-DAT-WINDOWS.md'
)
$sourceFiles = @(git ls-files -co --exclude-standard -- backend frontend)
if ($LASTEXITCODE -ne 0) { throw 'Khong the doc danh sach tep nguon tu Git.' }
$files = @($rootFiles + $sourceFiles | Sort-Object -Unique)
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$stream = [System.IO.File]::Open($outputFull, [System.IO.FileMode]::Create)
try {
  $zip = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($file in $files) {
      $source = Join-Path $project $file
      if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Thieu tep: $file" }
      $entryName = $file.Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $source, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally { $zip.Dispose() }
} finally { $stream.Dispose() }
Write-Host "Da tao $outputFull ($($files.Count) tep)"
