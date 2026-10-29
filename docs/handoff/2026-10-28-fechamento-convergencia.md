# Fechamento da convergência MVP × front atual — 28/10/2026

Autor: Daniel Möllmann (Frontend). Este arquivo reúne três coisas para uso fora do código: o resumo para o
relatório, o texto de WhatsApp e o prompt para a MÖLLMANN Studio IDE. As pendências do backend estão em
[`docs/convergencia-mvp/09-observacoes-para-o-backend.md`](../convergencia-mvp/09-observacoes-para-o-backend.md).

## 1. Resumo para o relatório

### O que foi feito no front

- **Convergência.** O MVP (`mvp/develop`) e o front atual foram unidos em duas rodadas de merge (a segunda traz as
  sprints 26 a 28 do MVP). O núcleo segue o MVP e os módulos ampliados mantêm o atual. O PR #190 reúne mais de 70
  commits e cerca de 3 mil arquivos.
- **Módulos, demonstração e tours do front** (documentados por módulo em `docs/convergencia-mvp/modulos/`):
  correspondentes e Meu Backoffice, rede de sub-correspondentes, credores e conta escrow, Pix Automático, análise
  de crédito, glossário e ajuda, site público, blog, investidores e demonstração, com os tours assistidos.
- **Ajustes de integração.** Link da central de notificações no shell, com a contagem de não lidas. "Chaves Pix" e
  "Matching de credoras" no menu. Formatador de data da credora corrigido (voltava um dia).
- **Política de privacidade.** Ficou uma só página. A seção de cookies passou a declarar o cookie `sep-refresh`, as
  chaves guardadas no navegador, a ausência de rastreamento de terceiros e o motivo de não haver botão de recusar,
  com um teste que trava esse inventário. A política cita o art. 18 da LGPD e o direito de petição à ANPD, e a
  vigência passou a 28/10/2026. A página do MVP, que estava sem rota, foi removida.
- **Segurança das dependências.** A auditoria online achou 27 alertas (5 críticos e 11 altos). Foram corrigidos com
  Vitest 4 e Happy DOM 21; o Angular continua na versão 20. A auditoria online agora retorna zero. O `package-lock.json`
  foi regenerado com npm 10 para o `npm ci` do CI.
- **Testes e2e.** As 5 specs que já falhavam antes do merge eram expectativas desatualizadas, não defeitos do app, e
  foram corrigidas (PR #191).
- **Imagens.** As 29 capturas do relatório de 07/10 foram refeitas com a marca "Dynamis SEP" (PR #192).

### Verificação (rodada local em 28/10/2026, na branch do PR #190, commit igual ao do GitHub)

| Verificação | Resultado |
| --- | --- |
| Formatação, lint TS/HTML, lint SCSS, tipos dos specs | Passam |
| Contrato frontend × OpenAPI | OK, 88 operações |
| Auditoria de dependências (online) | Zero vulnerabilidades |
| Testes unitários | 1.590 passam, em 163 arquivos |
| Build de produção | Passa, com aviso de bundle inicial de 760,42 kB para meta de 750 kB |
| E2E completo (197 testes) | 192 passam e 5 falham: exatamente as 5 antigas, que o PR #191 corrige |
| CI do GitHub no PR #190 | Verde no job de testes |

### Pull requests

1. [#190](https://github.com/dynamisdigital/sep-app/pull/190): convergência MVP × front atual.
2. [#191](https://github.com/dynamisdigital/sep-app/pull/191): corrige as 5 specs e2e.
3. [#192](https://github.com/dynamisdigital/sep-app/pull/192): refaz as 29 capturas com a marca nova.

Os três foram mesclados na `develop` em 28/10/2026, na ordem #190, #191, #192. Nada foi mesclado em `main`.

### Fica registrado como observação (não é do front)

Detalhes em `09-observacoes-para-o-backend.md`: confirmar o papel `CORRESPONDENTE`, a regra de juros e o cookie de
sessão; nome do encarregado (DPO), telefone e CNPJ reais e revisão jurídica da política; URLs de homologação e
produção; vulnerabilidades da `develop` a conferir depois do merge. Dívidas do front: regra do Stylelint desligada em
4 arquivos de estilo e bundle 10 kB acima da meta.

### Limites desta validação

- O e2e completo foi rodado antes de aplicar as correções do #191. As 5 specs corrigidas foram rodadas à parte
  (25 testes, todos passam), mas o conjunto das duas branches não foi rodado junto.
- O relatório de 07/10 (PDF, HTML e a pasta `publicar/`) não foi regenerado e ainda mostra a marca anterior.
- A revisão jurídica da política de privacidade não aconteceu. O guia da ANPD sobre cookies não foi lido na íntegra.

## 2. Texto para o WhatsApp

> Olá, pessoal! Fechei a etapa do front da convergência MVP × Dynamis SEP.
>
> O que entrou: os módulos novos (correspondentes, rede de subs, credores e escrow, Pix Automático, análise de
> crédito, glossário e ajuda, site público e demonstração), os tours, a central de notificações no menu e a política
> de privacidade completa. Também corrigi as dependências (auditoria de segurança zerada) e as 5 telas de teste que
> estavam desatualizadas.
>
> Conferi tudo no meu computador: testes, build e contrato da API passam, e o e2e deu 192 de 197 (as 5 que faltam
> foram corrigidas no PR #191). Já está tudo mesclado na develop.
>
> O relatório completo está aqui: {URL_DO_RELATORIO}
>
> Maurício, as pendências do backend estão listadas no relatório e no repositório, no arquivo
> docs/convergencia-mvp/09-observacoes-para-o-backend.md na develop. Os PRs mesclados são o #190, #191, #192 e #193.
>
> Qualquer dúvida me chamem.

Troque `{URL_DO_RELATORIO}` pela URL quando o relatório estiver no ar.

## 3. Prompt para a MÖLLMANN Studio IDE

Cole o texto abaixo na IDE, na raiz do projeto `sep-app`.

```text
Contexto: projeto sep-app (Dynamis SEP), front-end. Fechei a convergência MVP × front atual em 28/10/2026.
Os PRs #190, #191, #192 e #193 já estão mesclados na `develop` de github.com/dynamisdigital/sep-app (commit
84722f3). As branches da convergência foram apagadas. Faça o seguinte, em ordem, e pare para me perguntar
antes de qualquer passo que altere o próprio projeto da IDE.

1. Conferência local. Rode `git fetch origin`, vá para a `develop` e confirme que `git rev-parse --short HEAD`
   é 84722f3 (ou mais novo, se alguém já mesclou outra coisa depois; nesse caso me avise). Depois rode
   `npm ci`, `npm run format:check`, `npm run lint`, `npm run lint:scss`, `npm run typecheck:spec`,
   `npm run contract:check`, `npm run audit`, `npx vitest run` e `npx ng build`. Registre o resultado de cada um.
   Se o Chromium do Playwright estiver desatualizado, peça minha autorização antes de rodar
   `npx playwright install chromium`, e então rode `npx playwright test`. Esperado: 197 testes, mas esse
   número nunca foi rodado na `develop` (192 passavam antes do #191); registre o que realmente der.

2. Relatório. Use o pacote docs/convergencia-mvp/ (README.md e os documentos 00 a 09) e o resumo em
   docs/handoff/2026-10-28-fechamento-convergencia.md como fonte. Gere o relatório em Markdown e em HTML
   (reaproveite docs/atualizacao-07102026/md-para-html.js; não altere o código da IDE sem me perguntar).
   Registre-o em Produtividade e relatório com project = "sep-app" e kind = "convergencia-mvp"
   (reporting.register_report). Use as imagens de docs/atualizacao-07102026/imagens/ (já refeitas com a marca
   Dynamis SEP, PR #192) e de docs/convergencia-mvp/imagens/. Confirme que nenhuma imagem mostra a marca antiga "SEP".

3. Verifique o HTML. Abra o HTML gerado localmente, confira links relativos e imagens e me diga quando estiver
   pronto para eu subir. Não publique nada: eu subo o relatório e te passo a URL.

4. Texto de WhatsApp. Quando eu informar a URL, substitua {URL_DO_RELATORIO} no texto da seção 2 do arquivo
   docs/handoff/2026-10-28-fechamento-convergencia.md e me devolva o texto final para copiar.

Regras: não faça merge em develop ou main, não faça push sem eu pedir, não invente dados (nome do encarregado,
telefone, CNPJ) e não afirme que a política de privacidade passou por revisão jurídica, porque não passou.
```
