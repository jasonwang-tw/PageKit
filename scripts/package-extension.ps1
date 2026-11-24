param([string]$Destination = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (-not $Destination) { $Destination = Join-Path $projectRoot 'output/packages' }
$null = New-Item -ItemType Directory -Force -Path $Destination
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$paths = @('manifest.json','background.js','translation-service.js','ocr-utils.js','ui-style-service.js','capture-geometry.js','capture-transfer.js','page-capture.js','capture-preferences.js','editor-window.js','PRIVACY.md','icons/LUCIDE-LICENSE.txt')
$paths += @($manifest.icons.PSObject.Properties.Value)
foreach ($directory in @('content','ocr','vendor/ocr')) {
    $paths += Get-ChildItem -LiteralPath (Join-Path $projectRoot $directory) -Recurse -File | ForEach-Object { $_.FullName.Substring($projectRoot.Length + 1).Replace('\','/') }
}
$paddle = Get-Content -LiteralPath (Join-Path $projectRoot 'vendor/paddle/sources.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$paths += @('vendor/paddle/README.md','vendor/paddle/sources.json')
$paths += @($paddle.assets.PSObject.Properties.Name | ForEach-Object { "vendor/paddle/$_" })
$ui = Get-Content -LiteralPath (Join-Path $projectRoot 'vendor/ui/sources.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$paths += @('vendor/ui/README.md','vendor/ui/sources.json')
$paths += @($ui.assets.PSObject.Properties.Name | ForEach-Object { "vendor/ui/$_" })
$cutout = Get-Content -LiteralPath (Join-Path $projectRoot 'vendor/background-removal/sources.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$paths += @('vendor/background-removal/README.md','vendor/background-removal/sources.json')
$paths += @($cutout.assets.PSObject.Properties.Name | ForEach-Object { "vendor/background-removal/$_" })
$palette = Get-Content -LiteralPath (Join-Path $projectRoot 'vendor/palette/sources.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$paths += @('vendor/palette/README.md','vendor/palette/sources.json')
$paths += @($palette.assets.PSObject.Properties.Name | ForEach-Object { "vendor/palette/$_" })
$cropper = Get-Content -LiteralPath (Join-Path $projectRoot 'vendor/cropper/sources.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$paths += @('vendor/cropper/README.md','vendor/cropper/sources.json')
$paths += @($cropper.assets.PSObject.Properties.Name | ForEach-Object { "vendor/cropper/$_" })
$paths = @($paths | Sort-Object -Unique)
if ($paths | Where-Object { $_ -match '(^|/)(output|node_modules|\.git|\.playwright-cli|test|scripts|docs)/|\.(tar|onnx)$' }) { throw 'Unexpected development resource or optional model in package' }
$zipPath = Join-Path $Destination ("pagekit-$($manifest.version)-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()).zip")
$archive = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Create)
$rawBytes = 0
try {
    foreach ($relative in $paths) {
        $source = Join-Path $projectRoot $relative
        $rawBytes += (Get-Item -LiteralPath $source).Length
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$source,$relative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose() }
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    if ($archive.Entries.Count -ne $paths.Count) { throw 'Unexpected package entry count' }
    foreach ($relative in $paths) {
        $entry = $archive.GetEntry($relative)
        if (-not $entry) { throw "Missing package resource: $relative" }
        $sourceHash = (Get-FileHash -LiteralPath (Join-Path $projectRoot $relative) -Algorithm SHA256).Hash
        $stream = $entry.Open()
        $sha = [Security.Cryptography.SHA256]::Create()
        try { $entryHash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','') }
        finally { $sha.Dispose(); $stream.Dispose() }
        if ($sourceHash -ne $entryHash) { throw "Package contents differ: $relative" }
    }
} finally { $archive.Dispose() }
$size = (Get-Item -LiteralPath $zipPath).Length
$report = [pscustomobject][ordered]@{
    version=$manifest.version; fileCount=$paths.Count; unpackedBytes=$rawBytes; unpackedMiB=[math]::Round($rawBytes/1MB,2)
    zipBytes=$size; zipMiB=[math]::Round($size/1MB,2); zipPath=$zipPath; sha256=(Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
    excluded=@('output/','.git/','.playwright-cli/','node_modules/','test/','scripts/','docs/','unused icons','optional model weights'); files=$paths
    verification='Every ZIP entry SHA-256 matches its source. Not submitted or store-reviewed.'
}
[IO.File]::WriteAllText((Join-Path $Destination 'package-report.json'),($report | ConvertTo-Json -Depth 5),(New-Object Text.UTF8Encoding($false)))
$report | Select-Object version,fileCount,unpackedMiB,zipMiB,zipPath | ConvertTo-Json
