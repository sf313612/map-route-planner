# Seeds Neo4j with demo cities + roads for route-search testing.
# Requires: npm run dev (API up), Neo4j configured in .env
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\seed-demo-route-graph.ps1
# Optional: $env:API_BASE = "http://localhost:5000"

$ErrorActionPreference = "Stop"
$base = if ($env:API_BASE) { $env:API_BASE.TrimEnd("/") } else { "http://localhost:5000" }

function New-DemoCity {
  param([string]$Name, [double]$Lat, [double]$Lng)
  $body = @{ name = $Name; lat = $Lat; lng = $Lng } | ConvertTo-Json -Compress
  $r = Invoke-RestMethod -Method Post -Uri "$base/api/cities" -ContentType "application/json; charset=utf-8" -Body $body
  return $r.data
}

function New-DemoRoad {
  param([string]$FromId, [string]$ToId, [double]$TravelTime)
  $body = @{ fromCityId = $FromId; toCityId = $ToId; travelTime = $TravelTime } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Post -Uri "$base/api/roads" -ContentType "application/json; charset=utf-8" -Body $body | Out-Null
}

Write-Host "Creating cities at $base ..."
# Six fictional route-lab cities (Ukraine-ish coordinates, distinct names)
$t = New-DemoCity "Ternopil"     49.55 25.59
$k = New-DemoCity "Khmelnytskyi" 49.42 26.99
$v = New-DemoCity "Vinnytsia"    49.23 28.47
$u = New-DemoCity "Uman"         48.75 30.22
$o = New-DemoCity "Oleksandriia" 48.67 33.12
$kr = New-DemoCity "Kropyvnytskyi" 48.51 32.26

Write-Host "City IDs:"
Write-Host "  Ternopil      $($t.id)"
Write-Host "  Khmelnytskyi  $($k.id)"
Write-Host "  Vinnytsia     $($v.id)"
Write-Host "  Uman          $($u.id)"
Write-Host "  Oleksandriia  $($o.id)"
Write-Host "  Kropyvnytskyi $($kr.id)"

Write-Host "Creating roads (bidirectional, travelTime = minutes) ..."
# Main chain: west -> east
New-DemoRoad $t.id $k.id 105
New-DemoRoad $k.id $t.id 105
New-DemoRoad $k.id $v.id 180
New-DemoRoad $v.id $k.id 180
New-DemoRoad $v.id $u.id 120
New-DemoRoad $u.id $v.id 120
New-DemoRoad $u.id $o.id 95
New-DemoRoad $o.id $u.id 95
New-DemoRoad $o.id $kr.id 85
New-DemoRoad $kr.id $o.id 85
# Alternate longer hops (second path options)
New-DemoRoad $k.id $u.id 260
New-DemoRoad $u.id $k.id 260
New-DemoRoad $v.id $o.id 200
New-DemoRoad $o.id $v.id 200

Write-Host "Done. Example route-search body (use YOUR ids from above):"
Write-Host '  fromCityId: <Ternopil id>'
Write-Host '  toCityId:   <Kropyvnytskyi id>'
Write-Host ""
Write-Host "PowerShell env for route-search-full-test.ps1:"
Write-Host ('  $env:FROM_CITY_ID="{0}"' -f $t.id)
Write-Host ('  $env:TO_CITY_ID="{0}"' -f $kr.id)
