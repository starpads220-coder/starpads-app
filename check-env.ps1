$lines = Get-Content ".env.local"
foreach ($line in $lines) {
    if ($line -match "^FIREBASE_SERVICE_ACCOUNT_B64=") {
        $parts = $line -split "=", 2
        try {
            $decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($parts[1]))
            $json = $decoded | ConvertFrom-Json
            Write-Host "Valid JSON! Project: $($json.project_id)" -ForegroundColor Green
            Write-Host "Client email: $($json.client_email)" -ForegroundColor Green
        } catch {
            Write-Host "Invalid: $_" -ForegroundColor Red
        }
    }
}
