$url = "https://starpads-app.vercel.app/api/create-user"
$body = @{ email = "test@test.com"; password = "test123"; role = "PRODUCTION_SUPERVISOR" } | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $url -Method Post -ContentType "application/json" -Body $body
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Body: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    Write-Host "Body: $($reader.ReadToEnd())" -ForegroundColor Red
}
