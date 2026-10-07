# Publicar o relatório do Módulo de Correspondentes (07/10/2026)

Mesmo caminho das edições anteriores, em Netlify Drop. Esta edição vai num **site novo**, para os links
das edições de 18/09, 24/09 e 02/10 continuarem no ar. **Ainda não foi publicada.**

## O que está pronto (pasta `docs/atualizacao-07102026/`)

| Arquivo | Para quê |
|---|---|
| `apresentacao-atualizacao-sep.html` | O relatório para a Diretoria (19 slides) |
| `SEP_Correspondentes_Daniel_Mollmann_07102026.pdf` | PDF oficial |
| `CONTRATO_BACKEND_CORRESPONDENTES.md` e `backend.html` | Apoio técnico ao backend (mesmo texto, em Markdown e em página) |
| `imagens/` | As 19 capturas reais do sistema |
| **`publicar/`** | **A pasta que vai para o Netlify** |
| `MENSAGEM_DIRETORIA.txt` | Texto pronto para WhatsApp ou e-mail |
| `conteudo-main.html`, `montar-html.js`, `md-para-html.js`, `gerar-publicacao.js`, `capturar-telas.js`, `verificar-tours.js` | Fontes, geradores e o verificador dos tours |

## Passo a passo

1. Abra https://app.netlify.com/drop com a mesma conta das edições anteriores.
2. Arraste a pasta **`publicar`** para a área de upload. Não arraste para dentro dos sites antigos.
3. Clique em **Make public** quando aparecer o aviso.
4. Copie o endereço publicado (ou dê um nome em Site configuration, por exemplo `sep-correspondentes-07-10`).
5. Na raiz do projeto, rode (troque pelo endereço):

   ```bash
   node docs/atualizacao-07102026/gerar-publicacao.js https://sep-correspondentes-07-10.netlify.app
   ```

6. Arraste `publicar` de novo no mesmo site, para a prévia do WhatsApp mostrar a capa.
7. Troque `[LINK]` em `MENSAGEM_DIRETORIA.txt` e envie.

**Quem recebe o quê:** a Diretoria recebe o link principal; o responsável pelo backend recebe o link
`/backend.html` (ou o arquivo `.md`).

## Se precisar mudar algo

- Texto dos slides: edite `conteudo-main.html` e rode `node docs/atualizacao-07102026/montar-html.js`,
  depois o passo 5.
- Documento do backend: edite o `.md`, rode `montar-html.js` e o passo 5.
- Capturas: com o sistema rodando (`npm run start -- --port 4200`), rode
  `node docs/atualizacao-07102026/capturar-telas.js`.

## Voltar ao estado anterior ao módulo

O sistema como estava antes de qualquer alteração está na marca git
`backup-pre-correspondentes-2026-10-07` (commit `0081976`).

```bash
git checkout backup-pre-correspondentes-2026-10-07     # só olhar o estado antigo
git switch escritorio-2026-10-02                       # voltar à branch anterior, intacta
```

O trabalho do módulo está na branch `escritorio-2026-10-07`. Descartar o teste é voltar à branch ou à
marca; nada do estado anterior foi sobrescrito.
