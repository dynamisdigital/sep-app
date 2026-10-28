# Observações para o backend — fechamento da convergência (28/10/2026)

**De:** Daniel Möllmann (Frontend) · **Para:** Maurício Chaves (Backend e infraestrutura)

O front deste PR está fechado: telas, fluxos, módulos novos, demonstração e tours. O que segue **não é do
front** e fica registrado aqui para o backend decidir, confirmar ou implementar. Nada abaixo bloqueia o merge
em `develop`. Por regra de convivência (ver [00-responsabilidades-e-ambientes.md](00-responsabilidades-e-ambientes.md)),
o front não altera regra de negócio sem alinhar com o backend.

## 1. Para confirmar (o front assumiu, o backend é a fonte da verdade)

| Assunto | O que o front faz hoje | O que o backend confirma |
| --- | --- | --- |
| Papel `CORRESPONDENTE` | A tela de usuários mostra 5 papéis: `ADMIN`, `FINANCEIRO`, `BACKOFFICE`, `CLIENTE` e `CORRESPONDENTE` | O enum de papéis do backend aceita `CORRESPONDENTE` e os `@PreAuthorize` dos novos módulos |
| Juros nas parcelas em atraso | O mock soma juros: o total em atraso da carteira de demonstração é **R$ 2.287,60** (era R$ 2.012,50 sem juros). Há teto de R$ 15.000,00 do regimento | A regra de juros, taxa única e teto. Os testes do mock (`src/mocks/data/*.store.ts` e `.spec.ts`) descrevem o comportamento esperado |
| Central de notificações | O link entra na barra de ícones do shell, com a contagem de não lidas. Veio do MVP | Os endpoints de notificações e contagem em homologação |
| Cookie de sessão `sep-refresh` | A política declara `HttpOnly`, `Secure` (em produção), `SameSite=Strict`, caminho `/api/v1/auth`, validade de 30 dias | Que o backend emite o cookie exatamente assim. Se mudar, o texto da política precisa mudar junto |
| Levantamento do `sep-api` | O pacote de 26/10 foi feito lendo o código, sem rodar a API | Que o quadro "o que o backend já tem e o que falta" do [README](README.md) está correto |

## 2. Política de privacidade (LGPD) — pendências que não são do front

A página `/politica-de-privacidade` foi completada no front (art. 18 da LGPD, direito de petição à ANPD,
responsabilidades, inventário de cookies). Ainda faltam, e **o texto precisa de revisão jurídica antes de
publicar em produção**:

1. **Identidade do encarregado (DPO).** A LGPD, art. 41, §1º, exige divulgar publicamente o nome e o contato.
   A página mostra só o e-mail; o nome não consta no projeto.
2. **Dados de contato que parecem de teste** em `src/app/features/public/shared/site-conteudo.ts`: telefone
   `(81) 0000-0000` e CNPJ `12.345.678/0001-99`. São exibidos na política e no site. Informar os reais.
3. **Seção 7 da política** afirma criptografia em trânsito e em repouso e autenticação em duas etapas.
   Confirmar que vale para o sistema em produção.
4. **Prazos de retenção** da tabela da seção 3 (5 anos após o fim da relação, 6 meses para registros de acesso,
   12 meses para o extrato do Open Finance): confirmar com o jurídico e com o que o backend realmente aplica.
5. **Guia da ANPD sobre cookies** (outubro de 2022): não foi lido na íntegra durante este trabalho. O jurídico
   deve conferir o texto do aviso de cookies contra ele.

## 3. Ambientes e deploy (já descritos no pacote, ainda abertos)

- A URL de produção em `environment.prod.ts` ainda aponta para `http://localhost:8080` (pendência SEC-04).
- Informar a URL HTTPS da API de homologação e a de produção, os domínios para CORS em cada ambiente e quais
  endpoints de cada módulo já estão no ar, para o front ligar um módulo por vez.
- Quadro dos endpoints que faltam por módulo: [README, "Quadro geral"](README.md#quadro-geral-o-que-o-backend-já-tem-e-o-que-falta).

## 4. Segurança do repositório

- Na saída do `git push`, o GitHub avisou **24 vulnerabilidades na `develop`** (2 críticas, 6 altas, 15
  moderadas, 1 baixa). O PR #190 atualiza as dependências do front e a auditoria online dele retorna zero.
  **Depois do merge, conferir o painel do Dependabot** e repetir `npm run audit`.
- A configuração local do npm estava com `offline=true`, o que fazia a auditoria dar "zero" sem consultar nada.
  O script `npm run audit` agora força a consulta online. Detalhes em [08-correcao-ci.md](08-correcao-ci.md).

## 5. Dívidas do front que ficam registradas (não são do backend)

- A regra `no-duplicate-selectors` do Stylelint está desligada em 4 arquivos de estilo, por causa de blocos
  sucessivos de ajuste visual. A duplicação continua e está documentada em [08-correcao-ci.md](08-correcao-ci.md).
- O bundle inicial está em 760,42 kB para uma meta de 750 kB (abaixo do limite de erro de 1 MB).
- O override de `@angular/build > vitest` deve ser revisto se o projeto passar a usar o `ng test`.

## 6. Ordem de merge

1. [PR #190](https://github.com/dynamisdigital/sep-app/pull/190): convergência MVP × front atual.
2. [PR #191](https://github.com/dynamisdigital/sep-app/pull/191): corrige 5 specs e2e desatualizadas (base: a branch do #190).
3. [PR #192](https://github.com/dynamisdigital/sep-app/pull/192): refaz as 29 capturas do relatório de 07/10 com a marca Dynamis SEP.

Depois do merge do #190, conferir se o GitHub redirecionou o #191 e o #192 para a `develop`.
