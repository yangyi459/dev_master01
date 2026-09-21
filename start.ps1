# YueYa Dental - launcher (PowerShell)
# Strategy: spawn python.exe / node.exe DIRECTLY (no nested powershell, no pipe).
# That way child processes are detached from this PowerShell session's job tree
# and will keep running after the launcher exits / parent PowerShell goes away.
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
try { $OutputEncoding          = [System.Text.Encoding]::UTF8 } catch {}

$root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $root 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $logDir ("start-$stamp.log")

function Log {
    param([string]$msg)
    $line = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $msg
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function Test-Port {
    param([int]$Port)
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Wait-Port {
    param([int]$Port,[int]$TimeoutSec = 30)
    for ($i = 0; $i -lt $TimeoutSec; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Port $Port) { return $i }
    }
    return -1
}

Log "===== YueYa Dental launcher start ====="
Log "root: $root"

# ============== 1. API (FastAPI :8001) ==============
if (Test-Port 8001) {
    Log "[1/3] API :8001 already running, skip."
} else {
    Log "[1/3] Starting API :8001 ..."
    $apiDir  = Join-Path $root 'api'
    $venvPy  = Join-Path $apiDir 'venv\Scripts\python.exe'
    if (-not (Test-Path $venvPy)) {
        Log "    First run: creating venv and installing deps ..."
        $py = "$env:USERPROFILE\.workbuddy\binaries\python\versions\3.13.12\python.exe"
        & $py -m venv $apiDir | Out-Null
        & $venvPy -m pip install --disable-pip-version-check -r (Join-Path $apiDir 'requirements.txt') | Out-Null
        Log "    deps installed."
    }
    $apiOut = Join-Path $logDir "api-$stamp.out.log"
    $apiErr = Join-Path $logDir "api-$stamp.err.log"
    $p = Start-Process -FilePath $venvPy `
                       -ArgumentList @('-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8001') `
                       -WorkingDirectory $apiDir `
                       -RedirectStandardOutput $apiOut `
                       -RedirectStandardError  $apiErr `
                       -WindowStyle Hidden `
                       -PassThru
    Log ("    spawned. pid={0}" -f $p.Id)
    $waited = Wait-Port 8001 30
    if ($waited -ge 0) { Log "    API :8001 ready (after ${waited}s)." }
    else                { Log "    WARNING: API :8001 not ready after 30s. logs: $apiOut / $apiErr" }
}

# Detect npm.cmd once (used for both Vite dev servers).
$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmCmd) { $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue).Source }
if (-not $npmCmd) {
    Log "ERROR: npm not found in PATH. Install Node.js first."
    exit 1
}

# ============== 2. Frontend (Vite :5173) ==============
if (Test-Port 5173) {
    Log "[2/3] Frontend :5173 already running, skip."
} else {
    Log "[2/3] Starting frontend :5173 ..."
    $feDir = Join-Path $root 'frontend'
    if (-not (Test-Path (Join-Path $feDir 'node_modules'))) {
        Log "    First run: installing frontend deps ..."
        Push-Location $feDir; npm install | Out-Null; Pop-Location
        Log "    frontend deps installed."
    }
    $feOut = Join-Path $logDir "frontend-$stamp.out.log"
    $feErr = Join-Path $logDir "frontend-$stamp.err.log"
    $p = Start-Process -FilePath $npmCmd `
                       -ArgumentList @('run','dev') `
                       -WorkingDirectory $feDir `
                       -RedirectStandardOutput $feOut `
                       -RedirectStandardError  $feErr `
                       -WindowStyle Hidden `
                       -PassThru
    Log ("    spawned. pid={0}" -f $p.Id)
    $waited = Wait-Port 5173 30
    if ($waited -ge 0) { Log "    Frontend :5173 ready (after ${waited}s)." }
    else                { Log "    WARNING: Frontend :5173 not ready after 30s. logs: $feOut / $feErr" }
}

# ============== 3. Backend admin (Vite :5174) ==============
if (Test-Port 5174) {
    Log "[3/3] Backend admin :5174 already running, skip."
} else {
    Log "[3/3] Starting backend admin :5174 ..."
    $beDir = Join-Path $root 'backend'
    if (-not (Test-Path (Join-Path $beDir 'node_modules'))) {
        Log "    First run: installing backend deps ..."
        Push-Location $beDir; npm install | Out-Null; Pop-Location
        Log "    backend deps installed."
    }
    $beOut = Join-Path $logDir "backend-$stamp.out.log"
    $beErr = Join-Path $logDir "backend-$stamp.err.log"
    $p = Start-Process -FilePath $npmCmd `
                       -ArgumentList @('run','dev') `
                       -WorkingDirectory $beDir `
                       -RedirectStandardOutput $beOut `
                       -RedirectStandardError  $beErr `
                       -WindowStyle Hidden `
                       -PassThru
    Log ("    spawned. pid={0}" -f $p.Id)
    $waited = Wait-Port 5174 30
    if ($waited -ge 0) { Log "    Backend admin :5174 ready (after ${waited}s)." }
    else                { Log "    WARNING: Backend admin :5174 not ready after 30s. logs: $beOut / $beErr" }
}

Log "===== Done. ====="
Log "  Frontend  : http://localhost:5173"
Log "  Backend   : http://localhost:5174  (login: admin / admin123)"
Log "  API docs  : http://127.0.0.1:8001/docs"
Log "  Log file  : $logFile"
Log "  If a service dies after closing this window, check per-service .out.log / .err.log"