param([Parameter(Mandatory = $true)][string]$From)
# Aplica no jogo os golpes editados no artefato "Editor de golpes 3.0".
# $From = pasta com um JSON por golpe (moves/<id>.json), como o Claude baixa do editor.
# Reescreve src/data/moves.js mantendo o cabeçalho (comentários e tabela PRECISION) e a ordem
# dos golpes; golpes que não estão na pasta continuam como estavam.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$target = Join-Path $root 'src\data\moves.js'
$src = [IO.File]::ReadAllText($target, [Text.Encoding]::UTF8)
$cut = $src.IndexOf('export default {')
if ($cut -lt 0) { throw 'src/data/moves.js sem "export default {"' }
$head = $src.Substring(0, $cut)

# ordem atual dos golpes no arquivo
$order = [regex]::Matches($src.Substring($cut), '(?m)^  ([A-Za-z]+): \{') | ForEach-Object { $_.Groups[1].Value }
$dir = if (Test-Path (Join-Path $From 'moves')) { Join-Path $From 'moves' } else { $From }
$edited = @{}
foreach ($f in Get-ChildItem -LiteralPath $dir -Filter *.json) {
  $j = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8) | ConvertFrom-Json
  # o download do editor vem como { id, data, version } ou só com o corpo do golpe
  $body = if ($j.PSObject.Properties.Name -contains 'data') { $j.data } else { $j }
  $edited[[IO.Path]::GetFileNameWithoutExtension($f.Name)] = ($body | ConvertTo-Json -Depth 10 -Compress)
}
# golpes que não vieram na pasta: mantém o texto atual
$current = @{}
foreach ($m in [regex]::Matches($src.Substring($cut), '(?ms)^  ([A-Za-z]+): (\{.*?\}),?\r?\n(?=  [A-Za-z]+: \{|\};|\r?\n)')) { $current[$m.Groups[1].Value] = $m.Groups[2].Value }

$lines = foreach ($id in $order) {
  if ($edited.ContainsKey($id)) { "  ${id}: $($edited[$id])," } else { "  ${id}: $($current[$id])," }
}
$out = $head + "export default {`n" + ($lines -join "`n") + "`n};`n"
[IO.File]::WriteAllText($target, $out, (New-Object Text.UTF8Encoding $false))
"OK: $($edited.Count) golpes aplicados de $dir em src/data/moves.js"

# funções dos modelos de trajetória (pasta models/, quando o editor tiver alguma salva)
$mdir = Join-Path $From 'models'
if (Test-Path $mdir) {
  $ttarget = Join-Path $root 'src\data\trajectories.js'
  $tsrc = [IO.File]::ReadAllText($ttarget, [Text.Encoding]::UTF8)
  $tcut = $tsrc.IndexOf('export default {')
  $thead = $tsrc.Substring(0, $tcut)
  $torder = [regex]::Matches($tsrc.Substring($tcut), '(?m)^  ([A-Za-z]+): \{') | ForEach-Object { $_.Groups[1].Value }
  $tcur = @{}
  foreach ($m in [regex]::Matches($tsrc.Substring($tcut), '(?m)^  ([A-Za-z]+): (\{.*\}),?\r?$')) { $tcur[$m.Groups[1].Value] = $m.Groups[2].Value }
  $tedit = @{}
  foreach ($f in Get-ChildItem -LiteralPath $mdir -Filter *.json) {
    $j = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8) | ConvertFrom-Json
    $body = if ($j.PSObject.Properties.Name -contains 'data') { $j.data } else { $j }
    $tedit[[IO.Path]::GetFileNameWithoutExtension($f.Name)] = ($body | ConvertTo-Json -Depth 5 -Compress)
  }
  $tlines = foreach ($id in $torder) { if ($tedit.ContainsKey($id)) { "  ${id}: $($tedit[$id])," } else { "  ${id}: $($tcur[$id])," } }
  [IO.File]::WriteAllText($ttarget, $thead + "export default {`n" + ($tlines -join "`n") + "`n};`n", (New-Object Text.UTF8Encoding $false))
  "OK: $($tedit.Count) modelos de trajetória aplicados em src/data/trajectories.js"
}
