# DemonBar bootstrapper (Windows PowerShell 5.1 / pwsh 7).
#   irm https://raw.githubusercontent.com/Demonad112/DemonBar/main/install.ps1 | iex
# Optional environment variables before the call:
#   $env:DEMONBAR_PROFILE = 'Demonad'   # default Demon
#   $env:DEMONBAR_REF     = 'main'      # branch, tag or commit
# It checks Node 18+ and Git Bash, installs nothing silently, then runs the Node CLI.
$ErrorActionPreference = 'Stop'

$owner   = 'Demonad112'
$repo    = 'DemonBar'
$ref     = if ($env:DEMONBAR_REF) { $env:DEMONBAR_REF } else { 'main' }
$profile = if ($env:DEMONBAR_PROFILE) { $env:DEMONBAR_PROFILE } else { 'Demon' }

function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

$missing = @()
if (-not (Have 'node')) { $missing += 'Node.js 18+   ->  winget install OpenJS.NodeJS.LTS' }
else {
  $v = (node -p "process.versions.node.split('.')[0]")
  if ([int]$v -lt 18) { $missing += "Node.js 18+ (found $v)   ->  winget install OpenJS.NodeJS.LTS" }
}
$bash = @('C:\Program Files\Git\usr\bin\bash.exe', 'C:\Program Files (x86)\Git\usr\bin\bash.exe') | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $bash -and -not (Have 'bash')) { $missing += 'Git for Windows (Git Bash)   ->  winget install Git.Git' }
if (-not (Have 'git')) { $missing += 'git (npx fetches the repo through it)   ->  winget install Git.Git' }

if ($missing.Count -gt 0) {
  Write-Host 'DemonBar needs these first (nothing was installed or changed):' -ForegroundColor Yellow
  $missing | ForEach-Object { Write-Host "  - $_" }
  Write-Host 'Install them, open a NEW PowerShell window, and run the one-liner again.'
  return
}

Write-Host "Installing DemonBar ($profile) from github:$owner/$repo#$ref ..."
npx -y "github:$owner/$repo#$ref" install --profile $profile
if ($LASTEXITCODE -ne 0) { throw "demonbar install failed (exit $LASTEXITCODE)" }
