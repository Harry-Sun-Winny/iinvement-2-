$path = "D:\3510\DECUMENT\Codex\2026-06-03\you-are-the-lead-software-engineer\mobile\lib\services\api_service.dart"

$text = Get-Content -LiteralPath $path -Raw

$old = @'
String get baseUrl {
  if (defaultTargetPlatform == TargetPlatform.iOS) {
    return 'http://localhost:8080';
  }
  return 'http://10.0.2.2:8080';
}

String get stockProxyUrl {
  if (defaultTargetPlatform == TargetPlatform.iOS) {
    return 'http://localhost:3000';
  }
  return 'http://10.0.2.2:3000';
}
'@

$new = @'
String get baseUrl {
  if (kIsWeb) {
    return 'http://localhost:8080';
  }
  if (defaultTargetPlatform == TargetPlatform.iOS) {
    return 'http://localhost:8080';
  }
  return 'http://10.0.2.2:8080';
}

String get stockProxyUrl {
  if (kIsWeb) {
    return 'http://localhost:3002';
  }
  if (defaultTargetPlatform == TargetPlatform.iOS) {
    return 'http://localhost:3002';
  }
  return 'http://10.0.2.2:3002';
}
'@

if ($text.Contains($new)) {
  Write-Host "Mobile API config is already fixed."
  exit 0
}

if (-not $text.Contains($old)) {
  Write-Error "Could not find the expected old config block. Please open api_service.dart and check the first two URL functions."
  exit 1
}

$text = $text.Replace($old, $new)
Set-Content -LiteralPath $path -Value $text -NoNewline
Write-Host "Mobile API config fixed."
