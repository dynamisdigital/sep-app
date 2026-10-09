# Análise de crédito — bureaus e score interno explicável

Data: 07/10/2026 · Situação: front e motor de demonstração implementados com dados fictícios (MSW). O
backend, os contratos com Serasa, SPC/Boa Vista e o acesso ao SCR do Banco Central ainda não existem.

## 1. O que o módulo faz

Para cada proposta, o analista executa a análise e recebe:

1. **Consulta às fontes** — Serasa, SPC/Boa Vista e SCR (Banco Central), cada uma com situação
   (consultada, indisponível, não consultada), score da fonte, restrições, endividamento e maior atraso.
2. **Score interno de 0 a 1000, explicável** — seis fatores com peso, desempenho (0–100), o que foi
   observado e quanto somou. A soma das contribuições é exatamente o score; a tela mostra a conta.
3. **Capacidade de pagamento** — parcela estimada contra o faturamento mensal, comprometimento e o
   **limite que cabe** (maior valor cuja parcela Price, na taxa padrão, não passa do comprometimento máximo
   e do teto de R$ 15.000).
4. **Regras** — bloqueantes (recusam) e de atenção (mandam para análise manual).
5. **Decisão sugerida** — Aprovar, Análise manual ou Recusar, com um resumo em linguagem simples.
6. **Parecer do analista** — acatar ou divergir. Divergir de uma aprovação ou recusa sugerida exige
   justificativa de 20 caracteres ou mais; o parecer fica marcado como "diverge do motor".

## 2. Fatores do score (versão `score-interno 1.0`)

| Fator                    | Peso | O que mede                                                          |
| ------------------------ | ---- | ------------------------------------------------------------------- |
| Comprometimento da renda | 25%  | Parcela ÷ faturamento mensal; 0% pontua 100, no máximo aceito pontua 50. |
| Score dos bureaus        | 25%  | Média dos scores das fontes que responderam; sem resposta, 40.      |
| Restrições ativas        | 20%  | Protestos, cheques sem fundo, dívidas vencidas: número e valor.     |
| Endividamento no SCR     | 15%  | Dívida no sistema financeiro ÷ faturamento anual; desconto por atraso > 30 dias. |
| Tempo de atividade       | 10%  | 60 meses ou mais pontua por inteiro.                                |
| Tamanho da operação      | 5%   | Operações perto do teto do regimento pontuam menos.                 |

Faixas: A ≥ 800, B ≥ 700, C ≥ 600, D ≥ 500, E abaixo disso.

### Ajuste do Pix Automático

Fora dos seis fatores, quem tem o **Pix Automático ativo** em algum contrato recebe pontos a mais no score
(padrão **+30**, parâmetro `bonusPixAutomatico`, de 0 a 100; 0 desliga). O ajuste aparece em **linha própria**,
com o motivo, e a conta continua fechando: **fatores + ajustes = score** (limitado a 1.000). Ele não afeta as
regras bloqueantes: uma proposta com restrições altas segue recusada. O site anuncia esse benefício, por
isso o ajuste é parte do contrato com o backend (`ajustes[]` na resposta da análise).

## 3. Regras de decisão

- **Bloqueantes → Recusar:** valor acima do teto do regimento (R$ 15.000); restrições acima de 30% do
  valor pedido; atraso acima de 90 dias no SCR.
- **Atenção → Análise manual:** alguma fonte habilitada indisponível (o motor nunca decide sem todas as
  fontes que a administração habilitou); parcela acima do comprometimento máximo.
- **Sem regra disparada:** score ≥ corte de aprovação → Aprovar; score < corte de recusa → Recusar;
  entre os dois → Análise manual.

## 4. Parâmetros (somente ADMIN, com justificativa e auditoria)

Fontes habilitadas (ao menos uma), validade da consulta (1–90 dias, padrão 30), corte de aprovação
(padrão 700), corte de recusa (padrão 500, sempre abaixo do de aprovação) e comprometimento máximo da
renda (5–50%, padrão 30%).

## 5. LGPD e segurança

- A consulta exige **consentimento do titular** registrado na requisição (base legal de proteção ao
  crédito); sem ele a API devolve 400. O backend deve guardar quem consultou, quando e para qual finalidade.
- Reaproveita a consulta dentro da validade; só refaz com `forcar`. Evita consulta repetida e custo por
  chamada.
- O front não calcula nem altera o score. A explicabilidade é o próprio retorno da API.
- Revisão humana: toda decisão é do analista; o motor só sugere (art. 20 da LGPD, direito de revisão).

## 6. Contrato proposto (`/api/v1/credito`)

| Método e rota                         | Papel                         | Descrição                                                          |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `GET /analise/parametros`             | BACKOFFICE, FINANCEIRO, ADMIN | Parâmetros vigentes.                                               |
| `PUT /analise/parametros`             | ADMIN                         | Atualiza; `justificativa` obrigatória; 422 fora dos limites.       |
| `GET /propostas/{id}/analise`         | operacional                   | Última análise; 404 se ainda não houve.                            |
| `POST /propostas/{id}/analise`        | operacional                   | `{consentimentoTitular, forcar?}`; 400 sem consentimento; 409 sem fonte habilitada. |
| `POST /propostas/{id}/analise/parecer`| operacional                   | `{decisao, justificativa}`; 409 sem análise; 422 divergência sem justificativa detalhada. |

## 7. O que falta para produção

- Contratos e credenciais com os bureaus; o SCR exige adesão e autorização específicas do BACEN.
- Faturamento e tempo de atividade vêm hoje de um perfil fictício; no real, do Open Finance, do cadastro
  (KYB) e dos documentos. A aderência desses dados é o que mais pesa na qualidade do score.
- Calibração do modelo com a carteira real (os pesos e cortes atuais são de demonstração) e monitoramento
  de viés e deriva.
- Auditoria das consultas e retenção conforme a política de dados.
