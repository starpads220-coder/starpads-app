param([string]$Token)

if (!$Token) {
    Write-Host "Usage: .\sync-env-v2.ps1 -Token YOUR_VERCEL_TOKEN" -ForegroundColor Yellow
    exit 1
}

$proj = Get-Content ".vercel\repo.json" | ConvertFrom-Json
$projectId = $proj.projects[0].id
$orgId = $proj.projects[0].orgId
$baseUrl = "https://api.vercel.com/v10/projects/$projectId/env?teamId=$orgId"
$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }

# Get existing env vars
Write-Host "Fetching existing env vars..." -ForegroundColor Cyan
$existing = (Invoke-RestMethod -Uri $baseUrl -Method Get -Headers $headers).envs

# Create lookup: key -> env object
$existingMap = @{}
foreach ($e in $existing) { $existingMap[$e.key] = $e }

Get-Content ".env.local" | ForEach-Object {
    if ($_ -match "^(NEXT_PUBLIC_.*|FIREBASE_SERVICE_ACCOUNT_B64)=") {
        $k, $v = $_ -split "=", 2
        if (!$k -or !$v) { return }
        Write-Host "$k ... " -NoNewline

        $body = @{
            type = "encrypted"
            key = $k
            value = $v
            target = @("production")
        } | ConvertTo-Json

        if ($existingMap.ContainsKey($k)) {
            # Update existing
            $envId = $existingMap[$k].id
            $updateUrl = "https://api.vercel.com/v10/projects/$projectId/env/$envId?teamId=$orgId"
            try {
                Invoke-RestMethod -Uri $updateUrl -Method Patch -Headers $headers -Body $body | Out-Null
                Write-Host "Updated" -ForegroundColor Yellow
            } catch {
                if ($_.ErrorDetails) {
                    $errMsg = ($_.ErrorDetails | ConvertFrom-Json)
                    Write-Host "Update FAILED: $($errMsg.error.message)" -ForegroundColor Red
                } else {
                    Write-Host "Update FAILED: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        } else {
            # Create new
            try {
                Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body | Out-Null
                Write-Host "Created" -ForegroundColor Green
            } catch {
                if ($_.ErrorDetails) {
                    $errMsg = ($_.ErrorDetails | ConvertFrom-Json)
                    Write-Host "Create FAILED: $($errMsg.error.message)" -ForegroundColor Red
                } else {
                    Write-Host "Create FAILED: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    }
}

Write-Host "`nDone! Redeploy with: vercel --prod" -ForegroundColor Cyan
