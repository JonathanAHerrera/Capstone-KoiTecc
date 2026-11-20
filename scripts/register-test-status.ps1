param(
    [datetime]$StartAt = '2026-11-12T10:00:00',
    [datetime]$EndAt = '2026-11-13T00:00:00',
    [switch]$ReportOnly,
    [ValidateSet('smtp', 'gmail')][string]$EmailProvider = 'gmail'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$taskName = 'KOITECC hourly test status'
if ($EndAt -le $StartAt -or $EndAt -le (Get-Date)) { throw 'The schedule must end after its start and in the future.' }
if ($StartAt -lt (Get-Date)) { throw 'StartAt has already passed. Choose the next future hour; missed emails cannot be backfilled.' }
if ((Get-TimeZone).Id -ne 'Central Standard Time') { throw 'This schedule specifies Central time. Set StartAt/EndAt for the host timezone before registering.' }
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'An existing KOITECC test task was found. Inspect it before replacing it.' }
if (-not $ReportOnly) {
    if ($EmailProvider -eq 'gmail') {
        if (-not (Test-Path -LiteralPath (Join-Path $root 'data\test-notifications\gmail-token.dpapi'))) {
            throw 'Gmail is not authorized. Run pnpm gmail:setup and verify pnpm gmail:send before registering.'
        }
    } else {
    foreach ($name in @('KOITECC_SMTP_HOST', 'KOITECC_SMTP_USER', 'KOITECC_SMTP_PASSWORD', 'KOITECC_SMTP_FROM')) {
        if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Missing $name. No email task was registered." }
    }
    }
}
$node = (Get-Command node.exe).Source
$tsx = Join-Path $root 'node_modules\tsx\dist\cli.mjs'
$runner = Join-Path $root 'scripts\test-status-report.ts'
$arguments = '"' + $tsx + '" "' + $runner + '"'
if (-not $ReportOnly) { $arguments += ' --send-email --email-provider=' + $EmailProvider }
$action = New-ScheduledTaskAction -Execute $node -Argument $arguments -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Once -At $StartAt -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ($EndAt - $StartAt)
$trigger.EndBoundary = $EndAt.ToString('s')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 50) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Hourly KOITECC regression, integration, build, and smoke test status.' | Out-Null
Get-ScheduledTaskInfo -TaskName $taskName | Select-Object TaskName, NextRunTime, LastTaskResult
Write-Output 'The task runs only while this Windows user is logged on and the computer is awake. Reports use the current local checkout without pulling or changing code.'
