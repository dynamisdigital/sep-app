# Dynamis SEP — apenas a extração do pacote, nenhuma alteração de código.
$ErrorActionPreference = 'Stop'
$zip = 'C:\Users\fabio\Downloads\Dynamis_SEP_Demonstracao_Completa.zip'
$dest = 'C:\Pastas\PROJETOS\Projeto Dynamis SEP\sep-app 16062026\image\demonstracao'
if (!(Test-Path -LiteralPath $zip -PathType Leaf)) { throw "Arquivo ZIP não encontrado: $zip" }
if (!(Test-Path -LiteralPath (Split-Path -Path (Split-Path -Path $dest -Parent) -Parent))) { Write-Warning 'Confirme a pasta raiz do projeto SEP antes de continuar.' }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force
$manifest = Join-Path $dest 'manifesto_demonstracao.json'
if (!(Test-Path -LiteralPath $manifest)) { throw 'Manifesto não encontrado após a extração. Verifique a estrutura do ZIP.' }
Write-Host "Pacote extraído e manifesto localizado em: $dest"
Write-Host 'Agora abra o projeto no MÖLLMANN Studio IDE e cole o PROMPT_CODEX_MOLLMANN_STUDIO_IDE.md.'
