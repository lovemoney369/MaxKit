$ErrorActionPreference = 'Stop'

$project = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$targets = @(
  '.electron-builder-cache',
  '.electron-cache',
  '.npm-cache',
  '.electron-dist-clean',
  '.playwright',
  '.pnpm-store',
  '.playwright-browsers',
  'dist',
  'node_modules',
  'test-results',
  'vendor',
  'LibreOffice_26.2.6_Win_x86-64',
  'release-0.3.0-final',
  'release-0.3.1-final',
  'release-0.3.2-final',
  'release-0.3.3-final',
  'release-0.3.4-final',
  'release-0.3.5-final',
  'release-0.3.6-final',
  'release-0.3.7-final',
  'release-0.3.9-final',
  'release-maxkit-0.4.0',
  'release-maxkit-0.4.1',
  'public\imgly',
  'public\ffmpeg',
  'format-conversion-0.3.4.png'
)

$removed = 0
foreach ($relative in $targets) {
  $candidate = [System.IO.Path]::GetFullPath((Join-Path $project $relative))
  if (-not $candidate.StartsWith($project + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing out-of-project target: $candidate"
  }
  if (Test-Path -LiteralPath $candidate) {
    Remove-Item -LiteralPath $candidate -Recurse -Force
    $removed++
  }
}

Write-Output "Removed $removed generated targets from $project"
