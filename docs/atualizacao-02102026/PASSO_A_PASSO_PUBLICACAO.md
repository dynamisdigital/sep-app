# Publicar a atualização da semana (1 e 2/10/2026)

Mesmo caminho das edições anteriores, em Netlify Drop, arrastando uma pasta. Tempo total: uns 5 minutos.

- 18/09, auditoria de segurança: https://deluxe-biscochitos-d394c0.netlify.app
- 24/09, atualização do frontend: https://fabulous-cactus-fed896.netlify.app

Esta edição vai num **site novo**, para os dois links acima continuarem no ar.

## O que já está pronto

Na pasta `docs/atualizacao-02102026/`:

| Arquivo | Para quê |
|---|---|
| `apresentacao-atualizacao-sep.html` | A apresentação (arquivo de trabalho), com 12 slides |
| `SEP_Atualizacao_Semana_Daniel_Mollmann_01102026_02102026.pdf` | PDF oficial, 14 páginas, A4 paisagem |
| `preview-banner.png` | Imagem da prévia no WhatsApp e LinkedIn (1200×630) |
| `mobile-preview.png` | Conferência da versão de celular |
| `imagens/` | As 10 capturas reais do sistema |
| **`publicar/`** | **A pasta que vai para o Netlify** (index.html, PDF, banner e imagens) |
| `MENSAGEM_DIRETORIA.txt` | Texto pronto para WhatsApp ou e-mail |
| `conteudo-main.html`, `montar-html.js`, `gerar-publicacao.js` | Fontes: o texto dos slides, o montador da página e o gerador do PDF e da pasta `publicar` |

## Passo a passo

**1. Abra o Netlify Drop**
Entre em https://app.netlify.com/drop com a mesma conta das edições anteriores.

**2. Arraste a pasta `publicar`**
No Explorador de Arquivos, abra
`C:\Pastas\PROJETOS\Projeto Dynamis SEP\sep-app 16062026\docs\atualizacao-02102026\`
e arraste a pasta **`publicar`** inteira para a área "Drag and drop your site output folder here".

> Não arraste para dentro dos sites de 18/09 ou de 24/09: isso substituiria aquelas apresentações.

**3. Torne o site público**
O Netlify cria o site como privado. Quando aparecer o aviso, clique em **Make public** (se o
link abrir pedindo login, é isso que está faltando).

**4. Copie o endereço**
Quando aparecer "Published", o Netlify mostra um endereço do tipo `https://nome-aleatorio.netlify.app`.

**5. (Opcional) Dê um nome ao site**
Em **Site configuration → Site details → Change site name**, use por exemplo
`sep-atualizacao-02-10`. O endereço vira `https://sep-atualizacao-02-10.netlify.app`.

**6. Gere de novo com o endereço (para a prévia do WhatsApp mostrar a imagem)**
O WhatsApp só busca a imagem de prévia por link absoluto. No terminal, na pasta `sep-app 16062026`:

```bash
node docs/atualizacao-02102026/gerar-publicacao.js https://sep-atualizacao-02-10.netlify.app
```

(troque pelo endereço do passo 4 ou 5). O script refaz o PDF, o banner e a pasta `publicar`.

**7. Atualize o mesmo site**
No Netlify, abra o site → aba **Deploys** → arraste a pasta **`publicar`** de novo na área
"Drag and drop your site output folder here". O endereço continua o mesmo.

**8. Confira**
- Abra o endereço no computador e no celular.
- Clique em **Baixar PDF Oficial** e confira o arquivo.
- Cole o link numa conversa sua do WhatsApp e veja se a prévia aparece com a capa.
  Se aparecer uma prévia antiga, o WhatsApp guardou em cache: envie com `?v=2` no fim do link.

**9. Envie**
Troque `[LINK]` em `MENSAGEM_DIRETORIA.txt` pelo endereço e envie. O botão **Compartilhar
WhatsApp** da própria página também já monta a mensagem com o link.

## Se precisar mudar algo

- Texto dos slides: edite `conteudo-main.html`, rode `node docs/atualizacao-02102026/montar-html.js`
  e depois o passo 6 de novo (ele refaz o PDF e a pasta `publicar`), e repita o passo 7.
- Capturas do sistema: foram tiradas do app rodando, por clique, nos roteiros do tour. Para
  refazer alguma, basta pedir.
