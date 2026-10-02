# Publicar a atualização da semana (22 a 24/09/2026)

Mesmo caminho da apresentação de segurança de 18/09 (https://deluxe-biscochitos-d394c0.netlify.app):
Netlify Drop, arrastando uma pasta. Tempo total: uns 5 minutos.

## O que já está pronto

Na pasta `docs/atualizacao-24092026/`:

| Arquivo | Para quê |
|---|---|
| `apresentacao-atualizacao-sep.html` | A apresentação (arquivo de trabalho) |
| `SEP_Atualizacao_Semana_Daniel_Mollmann_22092026_24092026.pdf` | PDF oficial, 19 páginas, A4 paisagem |
| `preview-banner.png` | Imagem da prévia no WhatsApp e LinkedIn (1200×630) |
| `mobile-preview.png` | Conferência da versão de celular |
| `imagens/` | As 11 capturas reais do sistema |
| **`publicar/`** | **A pasta que vai para o Netlify** (index.html, PDF, banner e imagens) |
| `MENSAGEM_DIRETORIA.txt` | Texto pronto para WhatsApp ou e-mail |

## Passo a passo

**1. Abra o Netlify Drop**
Entre em https://app.netlify.com/drop com a mesma conta usada em 18/09.

**2. Arraste a pasta `publicar`**
No Explorador de Arquivos, abra
`C:\Pastas\PROJETOS\Projeto Dynamis SEP\sep-app 16062026\docs\atualizacao-24092026\`
e arraste a pasta **`publicar`** inteira para a área "Drag and drop your site output folder here".

> Não arraste para dentro do site de 18/09 (`deluxe-biscochitos-d394c0`): isso substituiria o
> relatório de segurança. Esta atualização vai num site novo, e os dois links continuam no ar.

**3. Copie o endereço**
Quando aparecer "Published", o Netlify mostra um endereço do tipo `https://nome-aleatorio.netlify.app`.

**4. (Opcional) Dê um nome ao site**
Em **Site configuration → Site details → Change site name**, use por exemplo
`sep-atualizacao-24-09`. O endereço vira `https://sep-atualizacao-24-09.netlify.app`.

**5. Gere de novo com o endereço (para a prévia do WhatsApp mostrar a imagem)**
O WhatsApp só busca a imagem de prévia por link absoluto. No terminal, na pasta `sep-app 16062026`:

```bash
node docs/atualizacao-24092026/gerar-publicacao.js https://sep-atualizacao-24-09.netlify.app
```

(troque pelo endereço do passo 3 ou 4). O script refaz o PDF, o banner e a pasta `publicar`.

**6. Atualize o mesmo site**
No Netlify, abra o site → aba **Deploys** → arraste a pasta **`publicar`** de novo na área
"Drag and drop your site output folder here". O endereço continua o mesmo.

**7. Confira**
- Abra o endereço no computador e no celular.
- Clique em **Baixar PDF Oficial** e confira o arquivo.
- Cole o link numa conversa sua do WhatsApp e veja se a prévia aparece com a capa.
  Se aparecer uma prévia antiga, o WhatsApp guardou em cache: envie com `?v=2` no fim do link.

**8. Envie**
Troque `[LINK]` em `MENSAGEM_DIRETORIA.txt` pelo endereço e envie. O botão **Compartilhar
WhatsApp** da própria página também já monta a mensagem com o link.

## Se precisar mudar algo

Edite `apresentacao-atualizacao-sep.html`, rode o passo 5 de novo e repita o passo 6.
Para refazer as capturas do sistema, basta pedir: elas foram tiradas do app rodando, por clique.
