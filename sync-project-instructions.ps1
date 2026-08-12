<#
.SYNOPSIS
    Keeps the repository-root AGENTS.md and CLAUDE.md identical.

.DESCRIPTION
    The default sync mode copies the newer file over the older file. If both
    timestamps are equal but content differs, no file is changed and an
    explicit direction is required. Unknown destination revisions are saved
    under backup/ before overwrite.
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('sync', 'status', 'from-agents', 'from-claude')]
    [string]$Mode = 'sync',

    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$RepoRoot = $PSScriptRoot
$AgentsPath = Join-Path $RepoRoot 'AGENTS.md'
$ClaudePath = Join-Path $RepoRoot 'CLAUDE.md'
$script:DidReport = $false

function Test-SameFile {
    param([string]$PathA, [string]$PathB)

    if (-not (Test-Path -LiteralPath $PathA) -or -not (Test-Path -LiteralPath $PathB)) {
        return $false
    }

    $hashA = (Get-FileHash -LiteralPath $PathA -Algorithm SHA256).Hash
    $hashB = (Get-FileHash -LiteralPath $PathB -Algorithm SHA256).Hash
    return ($hashA -eq $hashB)
}

function Backup-File {
    param([string]$Path, [string]$RelativeName)

    $blob = $null
    try {
        $blob = (git -C $RepoRoot hash-object -- $RelativeName).Trim()
        if ($LASTEXITCODE -eq 0 -and $blob -match '^[0-9a-f]{40,64}$') {
            $null = git -C $RepoRoot rev-parse --verify --quiet "$blob^{blob}"
            if ($LASTEXITCODE -eq 0) {
                return $null
            }
        } else {
            $blob = $null
        }
    } catch {
        $blob = $null
    }

    $backupDir = Join-Path $RepoRoot 'backup'
    if (-not (Test-Path -LiteralPath $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }

    $stem = [IO.Path]::GetFileNameWithoutExtension($RelativeName)
    $extension = [IO.Path]::GetExtension($RelativeName)
    $tag = 'unknown-' + (Get-Date).ToString('yyyyMMdd_HHmmss')
    if ($blob) { $tag = $blob.Substring(0, 10) }
    $destination = Join-Path $backupDir ("{0}({1}){2}" -f $stem, $tag, $extension)
    if (-not (Test-Path -LiteralPath $destination)) {
        Copy-Item -LiteralPath $Path -Destination $destination -Force
    }
    return $destination
}

function Copy-Instruction {
    param(
        [string]$SourcePath,
        [string]$DestinationPath,
        [string]$SourceName,
        [string]$DestinationName
    )

    if (-not (Test-Path -LiteralPath $SourcePath)) {
        $script:DidReport = $true
        Write-Warning "$SourceName does not exist."
        return
    }

    if (Test-SameFile $SourcePath $DestinationPath) {
        return
    }

    if ((Test-Path -LiteralPath $DestinationPath) -and -not $Force) {
        $sourceTime = (Get-Item -LiteralPath $SourcePath).LastWriteTimeUtc
        $destinationTime = (Get-Item -LiteralPath $DestinationPath).LastWriteTimeUtc
        if ($destinationTime -gt $sourceTime) {
            $script:DidReport = $true
            Write-Warning "$DestinationName is newer than $SourceName. Inspect the files or use -Force."
            return
        }
    }

    $script:DidReport = $true
    if (Test-Path -LiteralPath $DestinationPath) {
        $backup = Backup-File $DestinationPath $DestinationName
        if ($backup) {
            Write-Host "$DestinationName backup: $backup"
        }
    }

    [IO.File]::Copy($SourcePath, $DestinationPath, $true)
    Write-Host "$SourceName -> $DestinationName copied"

    try { $null = git -C $RepoRoot hash-object -w -- $DestinationName } catch { }
}

function Show-Status {
    $agentsExists = Test-Path -LiteralPath $AgentsPath
    $claudeExists = Test-Path -LiteralPath $ClaudePath

    if (-not $agentsExists -and -not $claudeExists) {
        Write-Host 'Project instructions: both files are missing'
        return
    }
    if (-not $agentsExists) {
        Write-Host 'Project instructions: AGENTS.md is missing; use from-claude'
        return
    }
    if (-not $claudeExists) {
        Write-Host 'Project instructions: CLAUDE.md is missing; use from-agents'
        return
    }
    if (Test-SameFile $AgentsPath $ClaudePath) {
        Write-Host 'Project instructions: synchronized'
        return
    }

    $agentsTime = (Get-Item -LiteralPath $AgentsPath).LastWriteTimeUtc
    $claudeTime = (Get-Item -LiteralPath $ClaudePath).LastWriteTimeUtc
    Write-Host "Project instructions differ (AGENTS.md: $agentsTime, CLAUDE.md: $claudeTime)"
    if ($agentsTime -gt $claudeTime) {
        Write-Host 'Recommended: from-agents'
    } elseif ($claudeTime -gt $agentsTime) {
        Write-Host 'Recommended: from-claude'
    } else {
        Write-Host 'Files have the same timestamp; choose from-agents or from-claude explicitly.'
    }
}

if ($Mode -eq 'status') {
    Show-Status
} elseif ($Mode -eq 'from-agents') {
    Copy-Instruction $AgentsPath $ClaudePath 'AGENTS.md' 'CLAUDE.md'
} elseif ($Mode -eq 'from-claude') {
    Copy-Instruction $ClaudePath $AgentsPath 'CLAUDE.md' 'AGENTS.md'
} else {
    $agentsExists = Test-Path -LiteralPath $AgentsPath
    $claudeExists = Test-Path -LiteralPath $ClaudePath

    if (-not $agentsExists -and -not $claudeExists) {
        $script:DidReport = $true
        Write-Warning 'AGENTS.md and CLAUDE.md do not exist.'
    } elseif (-not $agentsExists) {
        Copy-Instruction $ClaudePath $AgentsPath 'CLAUDE.md' 'AGENTS.md'
    } elseif (-not $claudeExists) {
        Copy-Instruction $AgentsPath $ClaudePath 'AGENTS.md' 'CLAUDE.md'
    } elseif (Test-SameFile $AgentsPath $ClaudePath) {
        # No action.
    } else {
        $agentsTime = (Get-Item -LiteralPath $AgentsPath).LastWriteTimeUtc
        $claudeTime = (Get-Item -LiteralPath $ClaudePath).LastWriteTimeUtc
        if ($agentsTime -gt $claudeTime) {
            Copy-Instruction $AgentsPath $ClaudePath 'AGENTS.md' 'CLAUDE.md'
        } elseif ($claudeTime -gt $agentsTime) {
            Copy-Instruction $ClaudePath $AgentsPath 'CLAUDE.md' 'AGENTS.md'
        } else {
            $script:DidReport = $true
            Write-Warning 'AGENTS.md and CLAUDE.md differ but have the same timestamp. Choose from-agents or from-claude explicitly.'
        }
    }
}

if ($Mode -ne 'status' -and -not $script:DidReport) {
    Write-Host 'Already up to date'
}

exit 0
