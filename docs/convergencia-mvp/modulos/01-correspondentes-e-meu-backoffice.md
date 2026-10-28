# Módulo 1 · Correspondentes e Meu Backoffice

**Contrato detalhado:** [`CONTRATO_BACKEND_CORRESPONDENTES.md`](../../atualizacao-07102026/CONTRATO_BACKEND_CORRESPONDENTES.md)
(681 linhas, seções 1 a 21). Este documento é o resumo para decisão; o contrato é a referência de implementação.

## Por que existe no fluxo do SEP

O SEP precisa captar tomadores além da equipe interna. O **correspondente** é o parceiro comercial que capta o cliente,
confere a documentação e acompanha a carteira dele. O módulo dá a esse parceiro um ambiente próprio (Meu Backoffice) e à
administração o controle da rede: quem é correspondente, quanto vale o vínculo, quando o cadastro vence e quanto cada um
ganha.

O princípio que organiza tudo: **quem capta o cliente não é quem decide o crédito.** O correspondente atesta a conferência
de documentos e acompanha; analisar, aprovar, formalizar e liberar continuam exclusivos de BACKOFFICE, FINANCEIRO e ADMIN. Isso
protege o SEP de um correspondente influenciar a própria comissão.

## Telas

| Tela | Imagem |
| --- | --- |
| Painel do correspondente (carteira, inadimplência, comissão prevista) | ![Painel](../../atualizacao-07102026/imagens/01-meu-backoffice-painel.jpg) |
| Minha base (clientes vinculados) | ![Base](../../atualizacao-07102026/imagens/02-minha-base.jpg) |
| Envio de documentos com atesto | ![Envio](../../atualizacao-07102026/imagens/03-envio-documentos.jpg) |
| Cadastro vencido bloqueia o envio | ![Vencido](../../atualizacao-07102026/imagens/04-cadastro-vencido.jpg) |
| Contratos e detalhe das parcelas | ![Contratos](../../atualizacao-07102026/imagens/09-contratos.jpg) |
| Funil de prospecção | ![Funil](../../atualizacao-07102026/imagens/12-funil-prospeccao.jpg) |
| Agenda de relacionamento | ![Agenda](../../atualizacao-07102026/imagens/13-agenda.jpg) |
| Comissões | ![Comissões](../../atualizacao-07102026/imagens/14-comissoes.jpg) |
| Desempenho | ![Desempenho](../../atualizacao-07102026/imagens/15-desempenho.jpg) |
| Rede de correspondentes (administração) | ![Rede](../../atualizacao-07102026/imagens/05-rede-correspondentes.jpg) |
| Apuração de vigência | ![Vigência](../../atualizacao-07102026/imagens/06-apuracao-vigencia.jpg) |
| Validação dos envios (backoffice) | ![Envios](../../atualizacao-07102026/imagens/08-backoffice-envios.jpg) |
| Comissões e desempenho da administração | ![Admin](../../atualizacao-07102026/imagens/17-comissoes-admin.jpg) |
| Auditoria | ![Auditoria](../../atualizacao-07102026/imagens/19-auditoria.jpg) |

## O que o front já faz (Daniel)

- Perfil `CORRESPONDENTE` com menu próprio e rotas `/app/meu-backoffice/*`; a administração tem `/app/correspondentes/*`.
- Painel com carteira, inadimplência, parcelas a receber e comissão prevista; contratos com detalhe de parcelas.
- Envio de documentos com atesto, bloqueado quando o cadastro está `VENCIDO` ou `SUSPENSO`.
- Funil de prospecção, agenda, comissões, metas e desempenho, relatórios e auditoria.
- Tudo contra dados fictícios (MSW), com os testes do store como especificação executável.

## O que o backend precisa fazer (Maurício)

Resumo das regras que não podem ficar só no front (detalhe no contrato):

1. **Papel `CORRESPONDENTE`** fora das listas de Onboarding, Crédito, Formalização, Cobrança, Pix e Backoffice; rotas próprias de
   leitura da própria base e de envio, com `@PreAuthorize`.
2. **Escopo pelo vínculo vigente:** perdida a base, a leitura acaba junto, inclusive do que já foi contratado (o vínculo legitima o
   acesso a dados do cliente).
3. **Read model** de carteira (contratos e parcelas) para o correspondente não tocar nas tabelas operacionais.
4. **Ciclo de vida do cadastro** (vigência, avisos D-30, D-7 e D-0, suspensão) e **perda de base** (contrato, seção 5).
5. **Ledger de comissão** com regras versionadas, estorno em vez de edição e pagamento via Pix.
6. **Auditoria na mesma transação**, imutável, com valor anterior e novo.
7. **Step-up (TOTP)** em renovar cadastro e reatribuir vínculo.

**Endpoints principais (prefixo `/api/v1`):** `GET /correspondentes/me/resumo`, `/me/base`, `/me/operacoes`, `/me/envios`,
`POST /me/envios`; administração: `GET /correspondentes`, `POST /{id}/renovar-cadastro`, `POST /vinculos/{id}/reatribuir`,
`POST /vigencia/processar`; backoffice: `GET /backoffice/correspondentes/envios` e `POST /{id}/validar`.

## Estado no `sep-api`

Não há módulo de correspondentes. É trabalho novo: papel, entidade, vínculo, base, envios, comissões, funil, agenda e relatórios.

## Em aberto

Regras jurídicas e fiscais (contrato, seção 11): natureza da relação com o correspondente, retenções e quem paga a comissão.

## Entrega sugerida em fases (contrato, seção 13)

Fase 1 (papel, entidade, vínculo, resumo e base) pode começar sem decisão jurídica; as fases 3 e 4 (avisos e pagamento de
comissão) dependem da seção 11.
