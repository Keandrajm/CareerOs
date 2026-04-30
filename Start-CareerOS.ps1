$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ProjectRoot 'backend'
$FrontendDir = Join-Path $ProjectRoot 'frontend'
$BackendPort = 3001
$FrontendPort = 5173
$DashboardUrl = "http://localhost:$FrontendPort"
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
  Start-ServiceWindow -Title 'CareerOS Frontend' -WorkingDirectory $FrontendDir -Command 'npm run dev -- --host 127.0.0.1'
}

$frontendReady = Wait-Port -Port $FrontendPort -Seconds 60
if ($frontendReady) {
  Start-Process $DashboardUrl
} else {
  [System.Windows.Forms.MessageBox]::Show(
    "CareerOS frontend did not start within 60 seconds. Check the CareerOS Frontend window.",
    "CareerOS",
    'OK',
    'Warning'
  ) | Out-Null
}
