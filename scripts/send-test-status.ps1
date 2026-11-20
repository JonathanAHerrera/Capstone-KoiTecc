param([Parameter(Mandatory = $true)][string]$ReportPath)
$ErrorActionPreference = 'Stop'
$report = Get-Content -LiteralPath $ReportPath -Raw | ConvertFrom-Json
# A scheduler cannot inherit an interactive Gmail plugin session. Use a dedicated,
# authenticated SMTP sender; keep its app password in local environment variables.
foreach ($name in @('KOITECC_SMTP_HOST', 'KOITECC_SMTP_USER', 'KOITECC_SMTP_PASSWORD', 'KOITECC_SMTP_FROM')) {
    if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Missing $name. Email was not sent." }
}
$message = New-Object System.Net.Mail.MailMessage
$client = New-Object System.Net.Mail.SmtpClient
try {
    $message.From = $env:KOITECC_SMTP_FROM
    $recipient = $env:KOITECC_REPORT_RECIPIENT
    if (-not $recipient) { $recipient = $env:KOITECC_SMTP_FROM }
    $message.To.Add($recipient)
    $message.Subject = $report.subject
    $message.SubjectEncoding = [System.Text.Encoding]::UTF8
    $message.BodyEncoding = [System.Text.Encoding]::UTF8
    $message.Body = $report.text
    $htmlView = [System.Net.Mail.AlternateView]::CreateAlternateViewFromString($report.html, [System.Text.Encoding]::UTF8, 'text/html')
    $message.AlternateViews.Add($htmlView)
    $client.Host = $env:KOITECC_SMTP_HOST
    $client.Port = 587
    if ($env:KOITECC_SMTP_PORT) { $client.Port = [int]$env:KOITECC_SMTP_PORT }
    $client.EnableSsl = $true
    $client.Timeout = 45000
    $client.Credentials = New-Object System.Net.NetworkCredential($env:KOITECC_SMTP_USER, $env:KOITECC_SMTP_PASSWORD)
    $client.Send($message)
} finally {
    $message.Dispose()
    $client.Dispose()
}
