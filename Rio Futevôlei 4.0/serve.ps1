# Servidor estatico minimo para desenvolvimento (sem Node/Python).
# Uso: powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 8765]
#
# Tambem e a ponte do editor de golpes (docs/editor-golpes.html) com o codigo do jogo:
#   GET  /api/golpes   responde { ok: true } (o editor descobre que pode gravar direto)
#   POST /api/golpes   { moves: { id: golpe }, models: { id: parametros }, hitbox, aiTreeText } grava
#                      src/data/moves.js e src/data/trajectories.js (via tools/sync-moves.ps1),
#                      src/data/hitbox.js e src/data/ai-tree.js (arvore de decisao da CPU)
#   POST /api/dados/<atletas|marcas|itens|clima> { text } grava src/data/athletes.js, brands.js, items.js ou weather.js
#   POST /api/imagem   { folder, id, dataUrl } grava uma imagem enviada em assets/<marcas|itens>/ (hub: docs/index.html)
# So aceita pedidos da propria pagina (mesma origem), nunca de outro site.
param([int]$Port = 8765)
$root = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Rio Futevolei em http://localhost:$Port/"
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.svg' = 'image/svg+xml'
  '.glb' = 'model/gltf-binary'; '.mp3' = 'audio/mpeg'; '.ogg' = 'audio/ogg'; '.wav' = 'audio/wav'; '.ico' = 'image/x-icon'; '.webp' = 'image/webp'; '.gif' = 'image/gif'
}
$utf8 = New-Object Text.UTF8Encoding $false
function Send-Json($res, [int]$code, $obj) {
  $bytes = $utf8.GetBytes(($obj | ConvertTo-Json -Compress -Depth 5))
  $res.StatusCode = $code
  $res.ContentType = 'application/json; charset=utf-8'
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
}
# grava os golpes e a fisica enviados pelo editor
function Save-Golpes($body) {
  $data = $body | ConvertFrom-Json
  if (-not $data.moves) { throw 'sem golpes' }
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ('rf2-golpes-' + [Guid]::NewGuid())
  New-Item -ItemType Directory -Force (Join-Path $tmp 'moves') | Out-Null
  $ids = '^[A-Za-z]{1,40}$'
  foreach ($p in $data.moves.PSObject.Properties) {
    if ($p.Name -notmatch $ids) { throw "id invalido: $($p.Name)" }
    [IO.File]::WriteAllText((Join-Path $tmp "moves\$($p.Name).json"), ($p.Value | ConvertTo-Json -Compress -Depth 10), $utf8)
  }
  if ($data.models) {
    New-Item -ItemType Directory -Force (Join-Path $tmp 'models') | Out-Null
    foreach ($p in $data.models.PSObject.Properties) {
      if ($p.Name -notmatch $ids) { throw "id invalido: $($p.Name)" }
      [IO.File]::WriteAllText((Join-Path $tmp "models\$($p.Name).json"), ($p.Value | ConvertTo-Json -Compress -Depth 5), $utf8)
    }
  }
  try { $out = & (Join-Path $root 'tools\sync-moves.ps1') -From $tmp | Out-String }
  finally { Remove-Item $tmp -Recurse -Force -Confirm:$false }
  # largura da hitbox (todos os golpes): troca so o valor em src/data/hitbox.js
  if ($data.hitbox -and $data.hitbox.side -gt 0) {
    $hf = Join-Path $root 'src\data\hitbox.js'
    $side = ([double]$data.hitbox.side).ToString([Globalization.CultureInfo]::InvariantCulture)
    $txt = [regex]::Replace([IO.File]::ReadAllText($hf, $utf8), '(?m)^(\s*side:\s*)[0-9.]+', "`${1}$side")
    [IO.File]::WriteAllText($hf, $txt, $utf8)
    $out += "`nOK: largura da hitbox $side m"
  }
  # arvore de decisao da CPU: o editor manda o JSON pronto (aiTreeText); grava como esta, depois de validar
  if ($data.aiTreeText) {
    $null = $data.aiTreeText | ConvertFrom-Json # erro aqui = JSON inválido, nada é gravado
    $tf = Join-Path $root 'src\data\ai-tree.js'
    $old = [IO.File]::ReadAllText($tf, $utf8)
    $cut = $old.IndexOf('export default')
    $head = if ($cut -ge 0) { $old.Substring(0, $cut) } else { '' }
    [IO.File]::WriteAllText($tf, $head + 'export default ' + $data.aiTreeText + ";`n", $utf8)
    $out += "`nOK: arvore de decisao da CPU"
  }
  # golpes do Modo Tilt: o editor manda o JSON pronto (tiltText); grava como esta, depois de validar
  if ($data.tiltText) {
    $null = $data.tiltText | ConvertFrom-Json
    $tf = Join-Path $root 'src\data\tilt.js'
    $old = [IO.File]::ReadAllText($tf, $utf8)
    $cut = $old.IndexOf('export default')
    $head = if ($cut -ge 0) { $old.Substring(0, $cut) } else { '' }
    [IO.File]::WriteAllText($tf, $head + 'export default ' + $data.tiltText + ";`n", $utf8)
    $out += "`nOK: golpes do Modo Tilt"
  }
  return $out.Trim()
}
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
    $res.Headers.Add('Cache-Control', 'no-store')
    if ($rel -eq 'api/atletas' -or $rel -like 'api/dados/*' -or $rel -eq 'api/imagem') {
      # editores de dados (docs/editor-atletas.html, editor-marcas.html, editor-itens.html):
      #   POST /api/dados/<atletas|marcas|itens|clima> { text } regrava o arquivo de dados a partir da linha do export
      #   POST /api/atletas { athletesText } (nome antigo, igual a /api/dados/atletas)
      #   POST /api/imagem { folder: marcas|itens, id, dataUrl } grava assets/<folder>/<id>-<n>.<ext> e devolve o caminho
      $origin = $req.Headers['Origin']
      if ($origin -and $origin -ne "http://localhost:$Port") { Send-Json $res 403 @{ ok = $false; error = 'origem nao permitida' } }
      elseif ($req.HttpMethod -eq 'GET') { Send-Json $res 200 @{ ok = $true } }
      elseif ($req.HttpMethod -eq 'POST' -and $req.ContentType -like 'application/json*') {
        $reader = New-Object IO.StreamReader($req.InputStream, $utf8)
        $body = $reader.ReadToEnd(); $reader.Close()
        try {
          $data = $body | ConvertFrom-Json
          if ($rel -eq 'api/imagem') {
            if ($data.folder -notin @('marcas', 'itens')) { throw 'pasta invalida' }
            if ($data.id -notmatch '^[A-Za-z0-9_-]{1,40}$') { throw 'id invalido' }
            $mm = [regex]::Match([string]$data.dataUrl, '^data:image/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$')
            if (-not $mm.Success) { throw 'imagem invalida (use PNG, JPG, WEBP ou GIF)' }
            $bytes = [Convert]::FromBase64String($mm.Groups[2].Value)
            if ($bytes.Length -gt 3MB) { throw 'imagem grande demais (max. 3 MB)' }
            $ext = @{ png = 'png'; jpeg = 'jpg'; webp = 'webp'; gif = 'gif' }[$mm.Groups[1].Value]
            $dir = Join-Path $root "assets\$($data.folder)"
            New-Item -ItemType Directory -Force $dir | Out-Null
            $name = "$($data.id)-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()).$ext"
            [IO.File]::WriteAllBytes((Join-Path $dir $name), $bytes)
            Write-Host "Imagem: assets/$($data.folder)/$name"
            Send-Json $res 200 @{ ok = $true; path = "assets/$($data.folder)/$name" }
          } else {
            $kind = if ($rel -eq 'api/atletas') { 'atletas' } else { $rel.Substring(10) }
            $files = @{ atletas = 'athletes.js'; marcas = 'brands.js'; itens = 'items.js'; clima = 'weather.js' }
            if (-not $files.ContainsKey($kind)) { throw "dados desconhecidos: $kind" }
            $text = if ($data.text) { $data.text } else { $data.athletesText }
            if (-not $text) { throw 'sem dados' }
            $chk = $text | ConvertFrom-Json # erro aqui = JSON invalido, nada e gravado
            if ($kind -eq 'atletas' -and (-not $chk.athletes -or -not $chk.teams)) { throw 'faltam athletes/teams' }
            if ($kind -eq 'itens' -and -not $chk.items) { throw 'faltam items' }
            if ($kind -eq 'clima' -and (-not $chk.climas -or -not $chk.sorteio)) { throw 'faltam climas/sorteio' }
            $tf = Join-Path $root "src\data\$($files[$kind])"
            $old = [IO.File]::ReadAllText($tf, $utf8)
            $m = [regex]::Match($old, '(?m)^export default') # a linha do export (nao um comentario que cite o nome)
            $head = if ($m.Success) { $old.Substring(0, $m.Index) } else { '' }
            [IO.File]::WriteAllText($tf, $head + 'export default ' + $text + ";`n", $utf8)
            Write-Host "Editor de $($kind): OK"
            Send-Json $res 200 @{ ok = $true; message = "OK: gravado em src/data/$($files[$kind])" }
          }
        }
        catch { Send-Json $res 400 @{ ok = $false; error = "$_" } }
      }
      else { Send-Json $res 405 @{ ok = $false; error = 'metodo nao permitido' } }
    }
    elseif ($rel -eq 'api/golpes') {
      $origin = $req.Headers['Origin']
      if ($origin -and $origin -ne "http://localhost:$Port") { Send-Json $res 403 @{ ok = $false; error = 'origem nao permitida' } }
      elseif ($req.HttpMethod -eq 'GET') { Send-Json $res 200 @{ ok = $true } }
      elseif ($req.HttpMethod -eq 'POST' -and $req.ContentType -like 'application/json*') {
        $reader = New-Object IO.StreamReader($req.InputStream, $utf8)
        $body = $reader.ReadToEnd(); $reader.Close()
        try { $msg = Save-Golpes $body; Write-Host "Editor de golpes: $msg"; Send-Json $res 200 @{ ok = $true; message = $msg } }
        catch { Send-Json $res 400 @{ ok = $false; error = "$_" } }
      }
      else { Send-Json $res 405 @{ ok = $false; error = 'metodo nao permitido' } }
    } else {
      if ($rel -eq '' -or $rel.EndsWith('/')) { $rel = $rel + 'index.html' } # pasta: o index.html dela (docs/ = hub dos editores)
      $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if ($file.StartsWith($root) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file).ToLower()
        if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = 'application/octet-stream' }
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
      }
    }
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.Close()
  }
}
