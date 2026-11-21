# Gera o pacote do jogo para o itch.io (HTML5): dist\rio-futevolei-itch.zip
# Uso: powershell -ExecutionPolicy Bypass -File tools\build-itch.ps1
#
# Segue as regras de https://itch.io/docs/creators/html5 :
#  - index.html na raiz do ZIP, caminhos relativos, nomes com maiúsculas/minúsculas exatas;
#  - menos de 1.000 arquivos e 500 MB; sem dependências de outros servidores.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$include = @('index.html', 'styles.css', 'src', 'vendor')
$dist = Join-Path $root 'dist'
$zipPath = Join-Path $dist 'rio-futevolei-itch.zip'

# 1. arquivos que entram
$files = foreach ($item in $include) {
  $p = Join-Path $root $item
  if (Test-Path $p -PathType Leaf) { Get-Item $p } else { Get-ChildItem $p -Recurse -File }
}
$rel = { param($f) $f.FullName.Substring($root.Length + 1).Replace('\', '/') }

# 2. conferências
$problems = @()
foreach ($f in $files | Where-Object { $_.Extension -in '.js', '.html', '.css' }) {
  $text = [IO.File]::ReadAllText($f.FullName)
  # caminhos absolutos (começando com "/") quebram no itch
  if ($text -match "(from\s+|import\(\s*|src=|href=|url\()\s*['""]?/[^/]") { $problems += "caminho absoluto em $(& $rel $f)" }
  # servidores externos (o jogo tem que ser autossuficiente)
  if ($text -match "https?://(cdn|fonts|unpkg)") { $problems += "endereço externo em $(& $rel $f)" }
  # imports relativos com maiúsculas/minúsculas exatas (o itch diferencia)
  foreach ($m in [regex]::Matches($text, "(?:from\s+|import\s+)['""](\.{1,2}/[^'""]+)['""]")) {
    $target = [IO.Path]::GetFullPath((Join-Path $f.DirectoryName $m.Groups[1].Value))
    if (-not (Test-Path $target)) { $problems += "import não encontrado: $($m.Groups[1].Value) em $(& $rel $f)"; continue }
    $actual = (Get-Item $target).FullName
    $dirReal = (Get-ChildItem (Split-Path $target) | Where-Object { $_.Name -ieq (Split-Path $target -Leaf) }).Name
    if ($dirReal -cne (Split-Path $target -Leaf)) { $problems += "maiúsculas diferentes: $($m.Groups[1].Value) em $(& $rel $f)" }
  }
}
if ($problems.Count) { $problems | ForEach-Object { Write-Host "ERRO: $_" -ForegroundColor Red }; exit 1 }
if ($files.Count -ge 1000) { Write-Host "ERRO: mais de 1.000 arquivos" -ForegroundColor Red; exit 1 }

# 3. ZIP com separador "/" (o Compress-Archive antigo grava "\", que quebra em servidores Linux)
New-Item -ItemType Directory -Force $dist | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  foreach ($f in $files) {
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, (& $rel $f), 'Optimal') | Out-Null
  }
} finally { $zip.Dispose() }

$size = (Get-Item $zipPath).Length
$total = ($files | Measure-Object Length -Sum).Sum
Write-Host ("OK: {0} arquivos, {1:N1} MB descompactado, ZIP com {2:N1} MB" -f $files.Count, ($total / 1MB), ($size / 1MB))
Write-Host "Pacote: $zipPath"
