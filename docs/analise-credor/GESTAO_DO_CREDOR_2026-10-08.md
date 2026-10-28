# Gestão do credor no SEP: quem administra, quem capta e quem gere os recursos

**Data:** 08/10/2026
**Origem:** pergunta do Daniel sobre o credor (investidor), que hoje tem login e módulo operacional nos
três cenários (ativo, sem cadastro e inelegível), mas sem alguém que o administre, capte ou gerencie os
recursos que ele envia.
**Situação:** análise, sem implementação. A pesquisa externa foi feita por resumos de fontes
secundárias; o texto oficial do Banco Central não pôde ser aberto. Os pontos marcados como
**confirmar** precisam de conferência com o jurídico.

## 1. O que o SEP tem hoje

### Documentação interna

`documentacao_alinhamento_sep.md`:

- O credor é descrito como "PJ/investidor" que aporta recursos para financiar as propostas.
- Os recursos ficam em **conta escrow** num banco parceiro (BaaS da Celcoin), sem mistura com o caixa do
  SEP.
- KYC/KYB e PLD são obrigatórios para o credor.
- O backend prevê um módulo `credores/` ("gestão de investidores e oportunidades") e um módulo `escrow/`
  ("gestão patrimonial e wallets").
- **Nenhum documento diz quem opera esses módulos.**

### Sistema (frontend)

Só existe o lado do próprio credor: cadastro a partir de onboarding PJ aprovado, elegibilidade,
oportunidades, manifestação de interesse e carteira financiada (`/credores/*`).

- Não há papel `CREDORA`: a credora é um usuário `CLIENTE`.
- Não há tela para a administração: listar, aprovar ou suspender credores, ver aportes, saldo ou extrato.
- A fila do backoffice não tem item de credor; o Backoffice, o Pix e a Cobrança tratam só do tomador.
- "Inelegível" significa hoje "onboarding PJ reprovado na PLD". Não há perfil de risco do credor.

## 2. O que a norma diz

Base atual: **Resolução CMN 5.050/2022**, alterada pela **5.159/2024**. A Resolução 4.656/2018, que a
documentação interna cita, foi revogada (**confirmar**: o Banco Central indica a Res. 5.177/2024 como a
que revogou, a partir de 1º/1/2025; o conteúdo dela não foi lido).

| Tema | O que diz (artigo conforme a fonte consultada) |
|---|---|
| Quem pode ser credor (art. 16) | Pessoas naturais; instituições financeiras; fundos e securitizadoras para investidores qualificados; pessoas jurídicas não financeiras |
| Perfil do credor (art. 28) | A SEP deve analisar o perfil dos potenciais credores para verificar se atendem ao perfil de risco das operações |
| Ciência de risco (art. 20, IX) | Os instrumentos devem registrar a manifestação de ciência dos credores quanto aos riscos |
| Recursos (arts. 21, 22, 32) | Segregados dos recursos da SEP; repasse ao devedor em até 5 dias úteis (prazo alterado em 2024); retorno ao credor em até 1 dia útil após cada parcela; devolução em até 1 dia útil se a operação não se formar; fluxos em contas específicas e individualizadas; vedado manter recursos de credores em conta própria sem vínculo com operação |
| Limite por credor (art. 24) | R$ 15.000 por devedor, na mesma SEP, para credor não qualificado; investidor qualificado (CVM) fica isento |
| Transparência (arts. 25 a 27) | Informar o credor sobre os fatores do retorno esperado; divulgar mensalmente a inadimplência por classificação de risco |
| Captação | O art. 15 lista os serviços permitidos à SEP (análise de crédito, cobrança, seguros, moeda eletrônica, iniciação de pagamento). **Captar credores por terceiros não aparece**, e não há dispositivo expresso sobre correspondentes para isso |

**Atenção, possível divergência:** o sistema usa R$ 15.000 como **teto por proposta** ("teto do regimento").
Na norma, esse valor limita **cada credor por devedor**, e não o valor total do empréstimo. Se for essa a
origem, o limite correto seria por credor, com isenção para qualificado. **Confirmar com o jurídico**
(o regimento não está no repositório).

## 3. Respostas

### Quem administra o credor?

Hoje, ninguém no sistema. Proposta: módulo de **gestão de credores** para a administração e o backoffice:

- onboarding KYC/KYB do credor (reaproveitando o módulo de Onboarding);
- perfil de risco do credor (art. 28) e registro da ciência de risco;
- condição de investidor qualificado (que isenta o limite do art. 24) e limites por devedor;
- suspensão, comunicados, LGPD e relatórios (informe de rendimentos);
- trilha de auditoria, como no módulo de Correspondentes.

### Quem capta o credor?

Em princípio, o próprio SEP. Usar correspondentes ou parceiros para captar investidores **não tem previsão
expressa** na norma (a Res. 4.935/2021, de correspondentes, deve ser conferida quanto à aplicação a SEP e
a captação de credores). Pontos de cuidado:

- comissão sobre o volume aportado cria conflito com a análise de perfil do art. 28;
- não misturar com o módulo de Correspondentes atual, que é de captação de **tomadores**.

### Quem gere os recursos?

O SEP **não gere** o dinheiro do credor: o credor escolhe em qual operação aportar, e o SEP intermedeia
(vedações do art. 22). A operação financeira é do Financeiro, com controles. Proposta de **tesouraria de
credores**:

- aportes recebidos e saldo por credor (escrow);
- alocação por operação e prazos do art. 21 (D+5 ao devedor, D+1 ao credor);
- devoluções e repasses por parcela;
- conciliação e divergências (o módulo Pix já tem recebimentos e divergências, que podem ser reaproveitados);
- extrato e rendimento do lado do credor.

## 4. Decisões que dependem do SEP

1. Aceitar credor **pessoa física**, ou só PJ (a documentação interna fala só em PJ, mas a norma permite
   pessoa natural)?
2. Aceitar **investidor qualificado**, com a isenção do limite por devedor?
3. Captação de credor **apenas própria**, ou com terceiros (após parecer jurídico)?
4. Quem opera o relacionamento com o credor: backoffice atual, financeiro ou um perfil novo?
5. O teto de R$ 15.000 é por proposta ou por credor/devedor?

## 5. A confirmar com o jurídico

- Texto vigente e numeração dos artigos da 5.050 consolidada, e o conteúdo da Res. 5.177/2024.
- Aplicação da Res. 4.935/2021 (correspondentes) a SEP e à captação de credores.
- Origem regulatória do teto de R$ 15.000 adotado pelo sistema.
- Eventual enquadramento de oferta de "investimento" a credores perante a CVM.

## Fontes consultadas

- Resolução CMN 5.050/2022: https://www.legisweb.com.br/legislacao/?id=438930
- Resolução CMN 5.159/2024: https://www.legisweb.com.br/legislacao/?id=462423
- Resolução CMN 4.656/2018 (revogada), BCB: https://normativos.bcb.gov.br/Lists/Normativos/Attachments/50579/Res_4656_v8_P.pdf
- Cescon Barrieu, novas regras para SCD e SEP: https://cesconbarrieu.com.br/cmn-novas-regras-para-as-sociedades-de-credito-direto-e-sociedades-de-emprestimos-entre-pessoas/
- Felsberg Advogados, limite por credor: https://www.felsberg.com.br/?p=30075
