# Responsabilidades e separação de ambientes

## 1. Quem faz o quê

| Área | Daniel Möllmann (Frontend) | Maurício Chaves (Backend e infraestrutura) |
| --- | --- | --- |
| Telas e fluxo do usuário | Constrói, testa e documenta | Não se aplica |
| Contrato da API (nomes, formatos) | **Propõe** a partir do que o front precisa | **Decide e publica** (OpenAPI); o front ajusta o tipo, não a tela |
| Regras de negócio e valores | Reproduz no mock para validar o fluxo | **Fonte da verdade**: implementa, valida e audita |
| Autorização por papel | Esconde o que o perfil não deve ver | **Garante** com `@PreAuthorize`; o front só esconde telas |
| Dados e persistência | Dados fictícios (MSW) | Banco, migrações, *read models*, auditoria |
| Integrações externas (Celcoin, bureaus, PSP do Pix Automático) | Simula a resposta | Contrata, integra, trata webhook e falha |
| Segurança e LGPD | Mascara dados, step-up na tela, não guarda refresh token | Tokens, step-up, mascaramento na origem, retenção |
| Ambientes e deploy | Configura os builds do front | Servidores, URLs, HTTPS, CI/CD, segredos |
| Testes | Vitest (unidade) e Playwright (fluxos) | Testes de unidade e integração; passar nos mesmos casos dos specs do mock |

Regra de convivência: **o front não altera regra de negócio sem alinhar com o backend**, e o backend não muda
nome ou formato de campo sem avisar o front. O mock de cada módulo (`src/mocks/data/*.store.ts` e os `.spec.ts`
ao lado) funciona como especificação executável: os testes descrevem o comportamento esperado.

## 2. Separação entre ambiente fictício e real

Hoje já existe metade da separação: o build de produção troca `environment.ts` por `environment.prod.ts` e
troca `iniciar-mocks.ts` por uma versão vazia (o MSW não entra no pacote). Faltam três pontos.

| Ambiente | Build | API | Mock | Uso |
| --- | --- | --- | --- | --- |
| **demo** | `dev-offline` | MSW, dados fictícios | Ligado | Testes, tour, demonstração |
| **homologação** | `homologacao` (a criar) | Backend real de teste | Desligado, inclusive em `localhost` | Integrar os módulos com o backend |
| **produção** | `production` | Backend real, HTTPS | Fora do pacote | Usuários finais |

Pontos a corrigir no front (responsabilidade do Daniel):

1. `ehAmbienteDemo()` liga o mock em qualquer build fora de produção quando o endereço é `localhost`, mesmo com
   `useMsw: false`. Hoje não dá para rodar o front local contra o backend real.
2. Criar `environment.homologacao.ts` e a configuração `homologacao` no `angular.json`.
3. Isolar `src/mocks` para que só o build `demo` o inclua, com um teste que falhe se `production` contiver MSW
   ou contas fictícias.

O que o backend precisa informar (responsabilidade do Maurício):

- A URL HTTPS da API de homologação e a de produção. A de produção ainda aponta para `http://localhost:8080`
  (pendência SEC-04 anotada em `environment.prod.ts`).
- CORS dos domínios do front em cada ambiente e o formato de erro padrão (`ApiErrorResponse`), que o front já trata.
- Quais endpoints de cada módulo já estão no ar em homologação, para o front ligar um módulo por vez.

## 3. Como o front liga um módulo ao backend real

Os serviços do front chamam HTTP e o MSW intercepta. Quando o backend segue os nomes e formatos do contrato, **a
troca é só apontar o ambiente para a API real**. Se o backend precisar de outro formato, o ajuste é no tipo
(`*.models.ts`) e no serviço, não na tela. A ordem sugerida é um módulo por vez, na ordem em que o backend
entregar.

## 4. Relatório na IDE (Produtividade e relatório)

- A IDE exporta relatórios em Markdown e em página HTML e mantém um índice de relatórios (`list_reports`,
  `register_report`). Este pacote já é Markdown, então pode ser registrado como relatório eventual com
  `project = "sep-app"` e `kind = "convergencia-mvp"`.
- A decisão que falta: gerar o HTML a partir do Markdown (reaproveitando `md-para-html.js`, que já existe em
  `docs/atualizacao-07102026/`) ou usar o `report_html.py` da IDE. Isso mexe no projeto da IDE e fica fora desta
  etapa até você confirmar.
