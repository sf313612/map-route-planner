# Single PowerShell integration test for transcription jobs (replaces older smoke/body-json helpers).
# Full flow: POST -> GET (poll) -> idempotent POST -> RabbitMQ Management API check
$ErrorActionPreference = "Stop"

$base = if ($env:API_BASE) { $env:API_BASE.TrimEnd("/") } else { "http://localhost:5000" }
$mgmtBase = if ($env:RABBITMQ_MGMT_URL) { $env:RABBITMQ_MGMT_URL.TrimEnd("/") } else { "http://localhost:15672" }
$queueName = if ($env:RABBITMQ_QUEUE) { $env:RABBITMQ_QUEUE } else { "transcription.jobs" }
$exchangeName = if ($env:RABBITMQ_EXCHANGE) { $env:RABBITMQ_EXCHANGE } else { "app.events" }
$routingKey = "transcription.request"
$idempotencyKey = "my-test-001"
$sourceText = "Test text for queue"

function Get-RabbitMqAuthHeader {
  $u = if ($env:RABBITMQ_MGMT_USER) { $env:RABBITMQ_MGMT_USER } else { "guest" }
  $p = if ($env:RABBITMQ_MGMT_PASS) { $env:RABBITMQ_MGMT_PASS } else { "guest" }
  $b64 = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("${u}:${p}"))
  return @{ Authorization = "Basic $b64" }
}

function Test-RabbitMqStep {
  param([hashtable]$AuthHeader)
  Write-Host ""
  Write-Host "=== Step 5 - RabbitMQ (Management HTTP API) ===" -ForegroundColor Cyan
  $vhostEnc = "%2F"
  try {
    $qUrl = "$mgmtBase/api/queues/$vhostEnc/$queueName"
    $q = Invoke-RestMethod -Method Get -Uri $qUrl -Headers $AuthHeader
    Write-Host "Queue '${queueName}': messages_ready=$($q.messages_ready) messages_unacknowledged=$($q.messages_unacknowledged) consumers=$($q.consumers)"
  } catch {
    Write-Host "Could not read queue (is RabbitMQ management up on ${mgmtBase}?): $_" -ForegroundColor Yellow
    return
  }
  try {
    $exUrl = "$mgmtBase/api/exchanges/$vhostEnc/$exchangeName/bindings/source"
    $bindings = Invoke-RestMethod -Method Get -Uri $exUrl -Headers $AuthHeader
    $match = @($bindings | Where-Object {
        $_.destination -eq $queueName -and $_.routing_key -eq $routingKey
      })
    if ($match.Count -ge 1) {
      Write-Host "Binding OK: exchange='${exchangeName}' -> queue='${queueName}', routing_key='${routingKey}'"
    } else {
      Write-Host "Binding not found: expected queue='${queueName}', routing_key='${routingKey}'. Bindings from exchange: $($bindings.Count)" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "Could not read exchange bindings: $_" -ForegroundColor Yellow
  }
}

Write-Host "=== Step 2 - First POST (expect HTTP 202 for new job) ===" -ForegroundColor Cyan
Write-Host "POST $base/api/auth/token ..."
$tokenRes = Invoke-RestMethod -Method Post -Uri "$base/api/auth/token" -ContentType "application/json" -Body "{}"
$token = $tokenRes.data.token
if (-not $token) { throw "No token in response" }

$postHeaders = @{
  Authorization = "Bearer $token"
  "Idempotency-Key" = $idempotencyKey
}
$bodyJson = (@{ sourceText = $sourceText } | ConvertTo-Json -Compress)

$resp1 = Invoke-WebRequest -Method Post -Uri "$base/api/transcription/jobs" -Headers $postHeaders -ContentType "application/json; charset=utf-8" -Body $bodyJson -UseBasicParsing
$code1 = [int]$resp1.StatusCode
$job1 = $resp1.Content | ConvertFrom-Json
$jobId = $job1.data.jobId
Write-Host "HTTP $code1 (expect 202 on first create)"
if ($code1 -ne 202) { Write-Host "Note: expected 202 on first create (200 if this idempotency key already exists)." -ForegroundColor Yellow }
Write-Host "jobId=$jobId status=$($job1.data.status)"

Write-Host ""
Write-Host "=== Step 3 - GET job (poll until DONE or timeout) ===" -ForegroundColor Cyan
$getHeaders = @{ Authorization = "Bearer $token" }
$deadline = (Get-Date).AddSeconds(45)
$last = $null
do {
  $one = Invoke-RestMethod -Method Get -Uri "$base/api/transcription/jobs/$jobId" -Headers $getHeaders
  $last = $one.data
  Write-Host "status=$($last.status) resultText=$($last.resultText)"
  if ($last.status -eq "DONE" -or $last.status -eq "FAILED") { break }
  Start-Sleep -Milliseconds 400
} while ((Get-Date) -lt $deadline)

if ($last.status -eq "QUEUED") {
  Write-Host "Hint: still QUEUED - run worker: npm run worker:transcription" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "=== Step 4 - Second POST (idempotency, expect HTTP 200) ===" -ForegroundColor Cyan
$resp2 = Invoke-WebRequest -Method Post -Uri "$base/api/transcription/jobs" -Headers $postHeaders -ContentType "application/json; charset=utf-8" -Body $bodyJson -UseBasicParsing
$code2 = [int]$resp2.StatusCode
$job2 = $resp2.Content | ConvertFrom-Json
Write-Host "HTTP $code2 (expect 200 on replay)"
if ($code2 -ne 200) { Write-Host "Note: expected 200 on idempotent replay." -ForegroundColor Yellow }
$id2 = $job2.data.jobId
Write-Host "jobId=$id2 (must match first: $jobId)"
if ("$id2" -ne "$jobId") { throw "Idempotency failed: jobId differs." }
Write-Host "OK: same jobId."

$auth = Get-RabbitMqAuthHeader
Test-RabbitMqStep -AuthHeader $auth

Write-Host ""
Write-Host "Done. RabbitMQ UI: ${mgmtBase} (Queues -> ${queueName}; Exchanges -> ${exchangeName} -> Bindings)." -ForegroundColor Green
