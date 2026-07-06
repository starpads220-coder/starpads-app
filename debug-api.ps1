param([string]$Token)

$proj = Get-Content ".vercel\repo.json" | ConvertFrom-Json
$projectId = $proj.projects[0].id
$orgId = $proj.projects[0].orgId
$query = "teamId=$orgId"
$baseUrl = "https://api.vercel.com/v10/projects/$projectId/env"
$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }

Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "Query: $query" -ForegroundColor Cyan

$url = "$baseUrl?$query"
Write-Host "Full URL: $url" -ForegroundColor Cyan

$body = @{ type = "encrypted"; key = "TEST_KEY"; value = "test"; target = @("production") } | ConvertTo-Json

try {
    $r = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    Write-Host "Created: $r" -ForegroundColor Green
} catch {
    Write-Host "StatusCode: $([int]$_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "ErrorDetails: $($_.ErrorDetails)" -ForegroundColor Red
    }
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response body: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}
