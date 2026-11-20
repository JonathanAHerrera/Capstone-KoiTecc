param([Parameter(Mandatory = $true)][ValidateSet('Protect', 'Unprotect')][string]$Action)
$ErrorActionPreference = 'Stop'
$value = [Console]::In.ReadToEnd()
if ($Action -eq 'Protect') {
    $secure = ConvertTo-SecureString -String $value -AsPlainText -Force
    ConvertFrom-SecureString -SecureString $secure
} else {
    $secure = ConvertTo-SecureString -String $value.Trim()
    (New-Object System.Net.NetworkCredential('', $secure)).Password
}
