$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ProjectRoot 'backend'
$FrontendDir = Join-Path $ProjectRoot 'frontend'
$BackendPort = 3001
$FrontendPort = 5173
$DashboardUrl = "http://localhost:$FrontendPort"
$PhoneIp = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet' } |
  Select-Object -First 1 -ExpandProperty IPAddress)
$PhoneUrl = if ($PhoneIp) { "http://$PhoneIp`:$FrontendPort" } else { $DashboardUrl }
Add-Type -AssemblyName System.Windows.Forms

function Test-Port {
  param([int]$Port)
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $connected = $async.AsyncWaitHandle.WaitOne(500)
    if ($connected) { $client.EndConnect($async) }
    $client.Close()
    return $connected
  } catch {
    return $false
  }
}

function Wait-Port {
  param([int]$Port, [int]$Seconds = 45)
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Port -Port $Port) { return $true }
    Start-Sleep -Milliseconds 750
  }
  return $false
}

function Start-ServiceWindow {
  param(
    [string]$Title,
    [string]$WorkingDirectory,
    [string]$Command
  )

  $escapedDir = $WorkingDirectory.Replace("'", "''")
  $escapedTitle = $Title.Replace("'", "''")
  $script = "`$host.UI.RawUI.WindowTitle='$escapedTitle'; Set-Location '$escapedDir'; $Command"
  Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command', $script
  ) -WindowStyle Minimized | Out-Null
}

if (-not (Test-Port -Port $BackendPort)) {
  Start-ServiceWindow -Title 'CareerOS Backend' -WorkingDirectory $BackendDir -Command 'npm start'
}

if (-not (Test-Port -Port $FrontendPort)) {
  Start-ServiceWindow -Title 'CareerOS Frontend' -WorkingDirectory $FrontendDir -Command 'npm run dev -- --host 0.0.0.0'
}

$frontendReady = Wait-Port -Port $FrontendPort -Seconds 60
if ($frontendReady) {
  Start-Process $DashboardUrl
  if ($PhoneIp) {
    $phoneLinkPath = Join-Path $ProjectRoot 'CareerOS-Phone-Link.html'
    @"
<!doctype html>
<html>
<head><meta charset="utf-8"><title>CareerOS Phone Link</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;padding:32px;line-height:1.5">
  <h1>CareerOS Phone Link</h1>
  <p>Open this on your phone while it is connected to the same Wi-Fi as this computer:</p>
  <p><a style="font-size:24px" href="$PhoneUrl">$PhoneUrl</a></p>
  <p>Use your CareerOS access code when prompted.</p>
</body>
</html>
"@ | Set-Content -Path $phoneLinkPath -Encoding UTF8
  }
} else {
  [System.Windows.Forms.MessageBox]::Show(
    "CareerOS frontend did not start within 60 seconds. Check the CareerOS Frontend window.",
    "CareerOS",
    'OK',
    'Warning'
  ) | Out-Null
}
