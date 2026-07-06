param(
    [string]$EnvFile = ".env.local",
    [string]$Environment = "production"
)

$vercelConfig = "$env:USERPROFILE\.vercel\auth.json"
if (!(Test-Path $vercelConfig)) {
    Write-Error "Vercel auth not found. Run 'vercel login' first."
    exit 1
}

$token = (Get-Content $vercelConfig | ConvertFrom-Json).token
$projectJson = Get-Content ".vercel\project.json" -ErrorAction SilentlyContinue | ConvertFrom-Json
if (!$projectJson) {
    Write-Error "Project not linked. Run 'vercel link' first."
    exit 1
}

$projectId = $projectJson.projectId
$orgId = $projectJson.orgId

$lines = Get-Content $EnvFile
foreach ($line in $lines) {
    if ($line -match "^(NEXT_PUBLIC_|FIREBASE_SERVICE_ACCOUNT_B64|NEXT_PUBLIC_APP_URL)=") {
        $key, $value = $line -split "=", 2
        if ($key -and $value) {
            Write-Host "Adding $key ..." -NoNewline
            $body = @{
                type = "encrypted"
                key = $key
                value = $value
                target = @($Environment)
            } | ConvertTo-Json

            try {
                $url = "https://api.vercel.com/v10/projects/$projectId/env?teamId=$orgId"
                Invoke-RestMethod -Uri $url -Method Post -Headers @{
                    Authorization = "Bearer $token"
                    "Content-Type" = "application/json"
                } -Body $body | Out-Null
                Write-Host " OK" -ForegroundColor Green
            } catch {
                if ($_.Exception.Response.StatusCode -eq 409) {
                    Write-Host " already exists, updating..." -NoNewline -ForegroundColor Yellow
                    # Get existing env id
                    $existing = Invoke-RestMethod -Uri $url -Method Get -Headers @{
                        Authorization = "Bearer $token"
                    }
                    $existingEnv = $existing.envs | Where-Object { $_.key -eq $key }
                    if ($existingEnv) {
                        $updateUrl = "https://api.vercel.com/v10/projects/$projectId/env/$($existingEnv.id)?teamId=$orgId"
                        Invoke-RestMethod -Uri $updateUrl -Method Patch -Headers @{
                            Authorization = "Bearer $token"
                            "Content-Type" = "application/json"
                        } -Body $body | Out-Null
                        Write-Host " Updated" -ForegroundColor Yellow
                    }
                } else {
                    Write-Host " FAILED: $_" -ForegroundColor Red
                }
            }
        }
    }
}
Write-Host "`nDone! Redeploy with: vercel --prod" -ForegroundColor Cyan
