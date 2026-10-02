param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $project
if (-not $OutputPath) { $OutputPath = Join-Path $project 'ANTIGRAVITY-FULL-PROJECT.zip' }
$outputFull = [System.IO.Path]::GetFullPath($OutputPath)
$outputDir = Split-Path -Parent $outputFull
if (-not (Test-Path -LiteralPath $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

# Include all project source/documentation, but not machine-specific data,
# downloaded build tools, generated dependencies, or an older nested archive.
$sourceFiles = @(git -c core.quotePath=false ls-files -co --exclude-standard)
if ($LASTEXITCODE -ne 0) { throw 'Khong the doc danh sach tep tu Git.' }
$files = @($sourceFiles | Where-Object {
  $_ -notmatch '^(\.agents|\.codex|\.cursor|\.vivus|work|backups)/' -and
  $_ -ne 'deliverables/antigravity/ANTIGRAVITY-source-and-guide.zip' -and
  $_ -notmatch '(^|/)(\.env(\..*)?|node_modules|target|\.next[^/]*)($|/)' -and
  $_ -ne 'ANTIGRAVITY-FULL-PROJECT.zip'
} | Sort-Object -Unique)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = [System.IO.File]::Open($outputFull, [System.IO.FileMode]::Create)
try {
  $zip = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($file in $files) {
      $source = Join-Path $project $file
      if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Thieu tep: $file" }
      $entryName = 'ANTIGRAVITY/' + $file.Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $source, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally { $zip.Dispose() }
} finally { $stream.Dispose() }
Write-Host "Da tao $outputFull ($($files.Count) tep)"
