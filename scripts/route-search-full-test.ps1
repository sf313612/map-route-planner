# Full route-search flow test:
# 1) get auth token
# 2) create route-search job
# 3) poll job status
# 4) idempotent replay check

$ErrorActionPreference = "Stop"
$base = if ($env:API_BASE) { $env:API_BASE.TrimEnd("/") } else { "http://localhost:5000" }
$fromCityId = if ($env:FROM_CITY_ID) { $env:FROM_CITY_ID } else { "city-a" }
$toCityId = if ($env:TO_CITY_ID) { $env:TO_CITY_ID } else { "city-b" }
$idem = if ($env:IDEMPOTENCY_KEY) { $env:IDEMPOTENCY_KEY } else { "route-test-001" }

Write-Host "POST $base/api/auth/token"
$tokenRes = Invoke-RestMethod -Method Post -Uri "$base/api/auth/token" -ContentType "application/json" -Body "{}"
$token = $tokenRes.data.token
if (-not $token) { throw "No token returned" }

$headers = @{
  Authorization = "Bearer $token"
  "Idempotency-Key" = $idem
}
$body = @{ fromCityId = $fromCityId; toCityId = $toCityId } | ConvertTo-Json -Compress

Write-Host "POST $base/api/route-search/jobs"
$createRes = Invoke-WebRequest -Method Post -Uri "$base/api/route-search/jobs" -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body -UseBasicParsing
$createCode = [int]$createRes.StatusCode
$createJson = $createRes.Content | ConvertFrom-Json
$jobId = $createJson.data.jobId
Write-Host "HTTP $createCode jobId=$jobId status=$($createJson.data.status) progress=$($createJson.data.progress)"

Write-Host "GET polling $base/api/route-search/jobs/$jobId"
$deadline = (Get-Date).AddSeconds(60)
do {
  $one = Invoke-RestMethod -Method Get -Uri "$base/api/route-search/jobs/$jobId" -Headers @{ Authorization = "Bearer $token" }
  Write-Host "status=$($one.data.status) progress=$($one.data.progress) error=$($one.data.errorMessage)"
  if ($one.data.status -eq "DONE" -or $one.data.status -eq "ERROR") { break }
  Start-Sleep -Milliseconds 500
} while ((Get-Date) -lt $deadline)

Write-Host "POST replay with same idempotency key"
$replayRes = Invoke-WebRequest -Method Post -Uri "$base/api/route-search/jobs" -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body -UseBasicParsing
$replayCode = [int]$replayRes.StatusCode
$replayJson = $replayRes.Content | ConvertFrom-Json
Write-Host "HTTP $replayCode replayJobId=$($replayJson.data.jobId)"
if ("$($replayJson.data.jobId)" -ne "$jobId") {
  throw "Idempotency failed: replay jobId does not match first jobId"
}
Write-Host "Idempotency OK"
