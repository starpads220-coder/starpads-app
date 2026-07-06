$ErrorActionPreference = "Stop"
$envFile = ".env.local"

# Read .env.local and add each var using vercel CLI
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^(NEXT_PUBLIC_|FIREBASE_SERVICE_ACCOUNT_B64|NEXT_PUBLIC_APP_URL)=") {
        $parts = $_ -split "=", 2
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()

        if ($key -and $value) {
            Write-Host "Adding $key ... " -NoNewline
            try {
                $value | vercel env add $key production 2>&1 | Out-Null
                Write-Host "OK" -ForegroundColor Green
            } catch {
                Write-Host "FAILED: $_" -ForegroundColor Red
            }
        }
    }
}

Write-Host "`nDone! Redeploy with: vercel --prod" -ForegroundColor Cyan
