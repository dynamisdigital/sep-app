# Pix Automático no Crédito — viabilidade e contrato com o backend

Data: 07/10/2026 · Situação: front implementado com dados fictícios (MSW); backend e instituição
participante ainda não existem.

## 1. O que o Daniel chamou de "Pix Agendado" e o que realmente serve

| Recurso do Pix        | O que é                                                                                       | Serve para parcelas?                                         |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Pix Agendado**      | Um pagamento único, marcado pelo pagador para uma data futura. Quem agenda é o pagador.       | Não. Cada parcela exigiria que o tomador agendasse sozinho.  |
| **Pix Automático**    | Recorrência autorizada uma vez; o recebedor (o SEP) envia cada cobrança e o banco do pagador debita. | **Sim.** É o "débito automático via Pix" que a demanda descreve. |

Conclusão: implementamos o **Pix Automático**. O nome na tela é "Pix Automático"; "Pix Agendado" não é
usado para não prometer o que o recurso não faz.

## 2. Viabilidade

**Viável no front agora; no ambiente real depende de três fatores externos ao front:**

1. **Instituição participante.** O SEP não consegue criar recorrência Pix por conta própria: precisa de
   um PSP/banco que ofereça a API do Pix Automático para recebedor (criação da recorrência, envio das
   cobranças, retorno de liquidação). A escolha do parceiro é decisão de negócio.
2. **Regras do regulamento do BCB** (a confirmar com o compliance e com o parceiro, não com este
   documento): prazo de aviso ao pagador antes do vencimento (a tela usa 2 a 10 dias, parametrizável),
   número de reapresentações após falha (a tela usa 1 a 3), possibilidade de o pagador cancelar a
   qualquer momento no app do banco, e limites por cobrança.
3. **Segregação patrimonial e conciliação.** O valor debitado entra na conta escrow; a liquidação deve
   baixar a parcela na Cobrança pelo mesmo caminho do recebimento manual (hoje `registrarRecebimento`).

Risco principal: **o aceite é do tomador, no banco dele.** O SEP nunca consegue "ativar" sozinho; por
isso o estado `PENDENTE_PAGADOR` existe e as cobranças só são geradas depois do aceite.

## 3. O que foi implementado no front

- **Tela** Crédito › Pix Automático (`/app/credito/pix-automatico`, papéis BACKOFFICE, FINANCEIRO, ADMIN):
  - indicadores (autorizações ativas, aguardando o tomador, cobranças a vencer, valor agendado, taxa de
    sucesso);
  - contratos da carteira com a situação da autorização e as ações Habilitar, Cobranças e Revogar;
  - cadastro dos dados do pagador (nome, CPF/CNPJ, banco, ISPB, agência, conta, tipo) com consentimento
    registrado (LGPD);
  - lista de cobranças por parcela: agendada, tomador avisado, liquidada, falhou, cancelada;
  - **chave geral e parâmetros** (somente ADMIN, com justificativa e auditoria): habilitado/desabilitado,
    dias de aviso, tentativas.
- **Condição de habilitar:** com a chave geral desligada, nenhum contrato novo é habilitado. Por contrato,
  exige-se parcela em aberto, consentimento e dados completos do pagador.
- Os botões "Simular aceite/recusa" existem **só na demonstração**; no real o aceite acontece no banco.

## 4. Dados e segurança

- Guardar: nome, documento, ISPB/banco, agência, conta, tipo de conta, id da recorrência, limite por
  cobrança. Criptografar documento e conta em repouso; a API devolve **mascarados**.
- Nunca guardar: senha, token do banco, saldo ou extrato do tomador.
- Toda criação, revogação e alteração de parâmetro entra na auditoria.
- Teto: nenhuma cobrança passa de R$ 15.000 (teto do regimento por operação).

## 5. Contrato proposto (todas as rotas sob `/api/v1/pix-automatico`)

| Método e rota                          | Papel                         | Descrição                                                                       |
| -------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `GET /parametros`                      | BACKOFFICE, FINANCEIRO, ADMIN | Chave geral, dias de aviso, tentativas, valor máximo por débito.                |
| `PUT /parametros`                      | ADMIN                         | Atualiza; `justificativa` obrigatória; 422 fora dos limites.                    |
| `GET /resumo`                          | operacional                   | Indicadores da tela.                                                            |
| `GET /autorizacoes`                    | operacional                   | Autorizações com pagador mascarado.                                             |
| `POST /autorizacoes`                   | operacional                   | Cria; 409 se desabilitado ou já houver uma em andamento; 400 sem consentimento. |
| `POST /autorizacoes/{id}/revogar`      | operacional                   | `motivo` obrigatório; cancela cobranças futuras.                                |
| `GET /autorizacoes/{id}/debitos`       | operacional                   | Cobranças por parcela com situação, aviso e tentativas.                         |
| `POST /autorizacoes/{id}/simular-aceite` | só ambiente de demonstração | **Não existe em produção.**                                                     |

Eventos de entrada que o backend precisará tratar (webhook do parceiro): aceite ou recusa da recorrência,
cancelamento pelo pagador, cobrança liquidada, cobrança rejeitada. Cada liquidação baixa a parcela.

## 6. Fora do escopo desta entrega

- Integração real com PSP; webhooks; conciliação automática com a escrow.
- Notificação ao tomador (e-mail/push) além do aviso feito pelo banco.
- Exibição do Pix Automático para o tomador na Cobrança (agenda dele).
