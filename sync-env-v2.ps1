param([string]$Token)

if (!$Token) {
    Write-Host "Usage: .\sync-env-v2.ps1 -Token YOUR_VERCEL_TOKEN" -ForegroundColor Yellow
    exit 1
}

$proj = Get-Content ".vercel\repo.json" | ConvertFrom-Json
$projectId = $proj.projects[0].id
$orgId = $proj.projects[0].orgId
$query = "teamId=$orgId"
$baseUrl = "https://api.vercel.com/v10/projects/$projectId/env"
$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }

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

        $url = $baseUrl + "?$query"
        try {
            Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body | Out-Null
            Write-Host "Created" -ForegroundColor Green
        } catch {
            $statusCode = [int]$_.Exception.Response.StatusCode
            if ($statusCode -eq 400) {
                # Already exists - delete and recreate
                $envs = (Invoke-RestMethod -Uri $url -Method Get -Headers $headers).envs
                $match = $envs | Where-Object { $_.key -eq $k }
                if ($match) {
                    $envId = $match[0].id
                    $delUrl = $baseUrl + "/$envId" + "?$query"
                    Invoke-RestMethod -Uri $delUrl -Method Delete -Headers $headers -ErrorAction Stop | Out-Null
                    Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body | Out-Null
                    Write-Host "Recreated" -ForegroundColor Green
                } else {
                    Write-Host "Not found" -ForegroundColor Red
                }
            } else {
                if ($_.ErrorDetails) {
                    $errMsg = ($_.ErrorDetails | ConvertFrom-Json)
                    Write-Host "FAILED (${statusCode}): $($errMsg.error.message)" -ForegroundColor Red
                } else {
                    Write-Host "FAILED (${statusCode}): $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    }
}

Write-Host "`nDone! Redeploy with: vercel --prod" -ForegroundColor Cyan
