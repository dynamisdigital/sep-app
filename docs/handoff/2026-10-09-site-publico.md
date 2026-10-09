# Handoff do escritório · 09/10/2026 · Site público Dynamis SEP, marca e Pix

> Como usar em casa: quando o Daniel pedir para **carregar o handoff do site de 09/10**, leia este arquivo
> inteiro e depois `docs/atualizacao-09102026/SITE_PUBLICO_E_MARCA.md`, que descreve cada mudança. Faça as
> atualizações no SEP de casa conforme abaixo.

## Onde está o trabalho

- **Branch:** `escritorio-2026-10-09` (GitHub, `dynamisdigital/sep-app`), criada de `escritorio-2026-10-07`.
  Ela contém tudo da `escritorio-2026-10-07` e mais o trabalho de 08 e 09/10 (site público, blog, tours,
  Pix, marca). O trabalho de casa de 08/10 (`casa-2026-10-08`: tour com espaço e releitura, análise do
  credor) já estava dentro da linha do escritório antes deste handoff.
- **Para receber:** `git fetch origin` e `git switch escritorio-2026-10-09`. Se houver trabalho novo em casa,
  commite antes e traga com `git merge escritorio-2026-10-09` (ou rebase em branch datada de casa).
  **Não escrever em `develop` nem em `main`; sem force push.**
- Os hooks (`husky`) rodam `lint-staged` no commit e `format:check` no push; não use `--no-verify` sem o
  Daniel autorizar na hora.

## O que mudou

Resumo; o detalhe, com arquivos, está em `docs/atualizacao-09102026/SITE_PUBLICO_E_MARCA.md`.

1. **Site público:** páginas Investidores, Transparência, Perguntas frequentes, Antifraude e Blog; cabeçalho
   de duas linhas; faixa antifraude e "Área do investidor"; quatro banners rotativos na página inicial.
2. **Blog:** 15 textos; leitura em áudio sincronizada (tarja e destaque dourado); diagramação em 1, 2 e 3
   colunas (padrão varia pela ordem da lista); ao fim da leitura volta à lista em 3 s, pisca o texto lido (4x
   branco) e marca o próximo (4x azul); sobe ao cabeçalho em 10 s sem interação.
3. **Navegação:** seta redonda de voltar no topo centralizado; página nova abre no topo (`app.config.ts`).
4. **Tours:** cinco roteiros novos no módulo "Site institucional" (Investidores, Transparência, Blog,
   Perguntas, Antifraude) e dois atualizados; 14 roteiros no módulo completo.
5. **Pix:** marca oficial do Pix (`shared/arte/pix-logo.ts`) nos menus, cartões, indicadores, tour e na
   ilustração do site.
6. **Marca:** "SEP" virou **Dynamis SEP** no logo e nos nomes da marca em todo o sistema; subtítulos dos
   cartões do dashboard maiores.
7. **Análise de crédito:** Pix Automático ativo soma +30 ao score (parâmetro `bonusPixAutomatico`).
8. **Imagens versionadas:** `image/banners/` (4), `image/blog/` (15) e `image/fundos/` (6), ~5 MB.

## Para conferir em casa

```
git fetch origin && git switch escritorio-2026-10-09
npm ci
npx vitest run          # 881 testes passam no escritório
npm start               # http://localhost:4200
```

Olhar: `/`, `/blog` (abrir um texto, trocar colunas, seta de voltar), `/investidores`, `/credito-pj`,
`/transparencia` e, logado como `admin@empresa.com` (senha `123456`), o menu **Pix**, o logo e o dashboard.

## Cuidados

- O **teste de leitura em áudio** usa voz simulada; nenhum teste fala de verdade. Ouvir de verdade só
  clicando em "Ouvir" no navegador.
- O **MSW volta para ADMIN a cada reload** (ver a memória do projeto): teste de papel precisa navegar por
  cliques.
- O contrato (`contrato-detail`) ainda usa o PNG antigo com "SEP"; falta o logo "Dynamis SEP" em PNG.
- O contorno do Pix foi desenhado à mão; trocar se houver o arquivo do manual de marca do Banco Central.
- A autorização do Banco Central continua "Em atualização" no site; não afirmar autorização antes da
  decisão da Diretoria.
- Ficaram **fora dos commits** (e fora do envio): `.agents/`, `.codex/`, `.qwen/`, `diag.json`, `fp.json`,
  zips dos assets, `image/mockups/prints_*` e `selecao_melhores_telas_meia_tela`.

## Pendências do Daniel (decisões)

Ver a seção 11 do documento de atualização: texto da autorização do BC e ouvidoria, tarifas reais,
correspondentes captando credores, arquivos oficiais de marca (Pix e Dynamis SEP) e revisão das fotos.
