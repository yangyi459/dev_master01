# YueYa Dental - stopper (PowerShell). ASCII output only.
$ErrorActionPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$ports = @(8001, 5173, 5174)
$killed = 0
foreach ($p in $ports) {
    $procs = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue |
             Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $procs) {
        Write-Host ("Killing PID {0} on :{1}" -f $pid, $p)
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        $killed++
    }
}
if ($killed -eq 0) { Write-Host "No listeners on 8001/5173/5174. Nothing to stop." }
else               { Write-Host "Stopped $killed process(es)." }
