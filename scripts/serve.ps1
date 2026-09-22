# Petrobowl Scorekeeper - tiny offline web server (no Node needed).
# Serves ../dist on http://localhost:<port>/ and opens the browser.
$ErrorActionPreference = 'Stop'
$root = Join-Path (Split-Path -Parent $PSScriptRoot) 'dist'
if (-not (Test-Path (Join-Path $root 'index.html'))) {
  Write-Host "dist\index.html not found. Run dev.bat once (needs Node) or 'npm run build'." -ForegroundColor Red
  Read-Host 'Press Enter to exit'
  exit 1
}

$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.ico' = 'image/x-icon'; '.woff' = 'font/woff'; '.woff2' = 'font/woff2'
}

$listener = $null
foreach ($p in 5173..5190) {
  try {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$p/")
    $l.Start()
    $listener = $l; $port = $p; break
  } catch { }
}
if (-not $listener) { Write-Host 'No free port between 5173 and 5190.' -ForegroundColor Red; Read-Host; exit 1 }

$url = "http://localhost:$port/"
Write-Host ''
Write-Host '  PETROBOWL SCOREKEEPER  |  SPE ITB SC' -ForegroundColor Yellow
Write-Host "  Running at $url"
Write-Host '  1. Use this laptop window as the operator console.'
Write-Host '  2. Click "Open big screen", drag that window to the projector, press F11.'
Write-Host '  Keep this window open. Close it (or Ctrl+C) to stop.' -ForegroundColor DarkGray
Write-Host ''
if (-not $env:PB_NO_BROWSER) { Start-Process $url }

$rootFull = [System.IO.Path]::GetFullPath($root)
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($path -eq '') { $path = 'index.html' }
    $file = [System.IO.Path]::GetFullPath((Join-Path $rootFull $path))
    if (-not $file.StartsWith($rootFull) -or -not (Test-Path $file -PathType Leaf)) {
      $file = Join-Path $rootFull 'index.html'   # SPA fallback
    }
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    $type = $mime[$ext]; if (-not $type) { $type = 'application/octet-stream' }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ctx.Response.ContentType = $type
    $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.OutputStream.Close()
  } catch {
    try { $ctx.Response.Abort() } catch { }
  }
}
