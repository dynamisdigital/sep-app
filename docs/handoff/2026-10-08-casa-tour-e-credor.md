# Handoff de casa · 08/10/2026 · Tour (espaço, releitura, sub-correspondente) e análise do credor

> Como usar no escritório: quando o Daniel pedir para **carregar o handoff de casa de 08/10**, leia este
> arquivo inteiro e depois os que ele cita. Faça as atualizações no SEP do escritório conforme abaixo.

## Onde está o trabalho

- **Branch:** `casa-2026-10-08` (GitHub, `dynamisdigital/sep-app`), criada de `escritorio-2026-10-07`
  no commit `839dee9`, o mesmo ponto em que o escritório parou. **Não há conflito:** o remoto de
  `escritorio-2026-10-07` não andou desde então.
- **Para receber:** `git fetch origin` e `git switch casa-2026-10-08`. Depois, se for integrar na linha do
  escritório: `git switch escritorio-2026-10-07` e `git merge casa-2026-10-08` (avanço simples, sem
  conflito esperado). Não escrever em `develop` nem em `main`.
- **Origem:** feito em Casa em 08/10, depois de Casa ser alinhada com a `escritorio-2026-10-07` do
  escritório. A branch local antiga de Casa, `casa-correspondentes-2026-10-08`, tem uma versão paralela do
  módulo de Correspondentes e **não deve ser enviada** (o escritório já tem esse trabalho).

## O que mudou (código)

1. **Barra de espaço no widget do tour** pausa e retoma, mantendo o mouse. Não age em campos de texto,
   com Ctrl/Alt/Meta, com a tecla mantida, com tour concluído ou parado, nem com eventos sintéticos
   (o roteiro digita espaços sozinho). Botões ganham dica e `aria-keyshortcuts`.
   Arquivos: `src/app/shared/tour/tecla-pausa.ts` (+ spec) e `tour-overlay.component.*`.
2. **Retomada com 2 segundos antes.** Depois de uma pausa (botão ou espaço), a narração volta cerca de
   2 s antes do ponto em que parou, e o passo seguinte só começa depois da releitura. "Próximo" não relê.
   O recuo é no texto (a voz do navegador não volta o áudio): ~15 caracteres por segundo, começando no
   início da palavra. Arquivos: `src/app/core/tour/trecho-retomada.ts` (+ spec), `narrador.service.ts`,
   `tour.service.ts` (`pausar`, `continuar(reler)`, `aguardarSePausado`).
3. **Digitação em campo numérico no tour.** O motor digitava letra por letra e o intermediário "1."
   é inválido em `<input type="number">`, então "1.5" virava 5 e "0.2" virava 2. Agora o ponto decimal
   entra junto com o dígito seguinte. Arquivo: `tour.service.ts` (`digitar`).
4. **Roteiro "Minha rede de sub-correspondentes"** agora abre o cadastro e **preenche um novo
   sub-correspondente** (nome, CPF de exemplo, e-mail, telefone e os três percentuais de repasse, todos
   dentro do teto) e clica em Credenciar (`efeito: true`: fora da demonstração só aponta). Duração
   ajustada para ≈ 5 min. Arquivo: `src/app/core/tour/roteiros/correspondentes.roteiro.ts`.
   Observação: o cadastro do sub fica na tela **Minha rede**, não em "Minha base".
5. `docs/atualizacao-07102026/verificar-tours.js`: inclui o roteiro de sub-correspondentes.

## Análise do credor (sem implementação)

`docs/analise-credor/GESTAO_DO_CREDOR_2026-10-08.md`: hoje ninguém administra, capta ou gere os recursos do
credor no sistema. Reúne documentação interna e norma (CMN 5.050/2022, alterada pela 5.159/2024), com
proposta de módulo de gestão de credores e de tesouraria de credores, e as decisões a tomar. Destaque
possível divergência: o teto de R$ 15.000 do sistema é por proposta; na norma, é por credor por devedor.
A pesquisa usou resumos de fontes secundárias, e os pontos **a confirmar** estão listados no documento.

## Estado verificado em Casa

- Testes de tour: 61 aprovados nos arquivos alterados (inclui 3 specs novos). Suíte completa: ver o commit.
- Prova no navegador: a barra de espaço (5 verificações: pausa, fica parado, retoma, mouse, foco no
  botão). O roteiro de sub-correspondentes foi corrigido depois de a prova ser interrompida a pedido do
  Daniel, **sem execução final de ponta a ponta**. Vale rodar no escritório:
  `node docs/atualizacao-07102026/verificar-tours.js "Minha rede"` (sistema em `npm start -- --port 4200`).
- A conferência do Daniel, à mão: "o tour ficou bom".

## O que o agente do escritório deve fazer

1. Receber a branch e integrar na `escritorio-2026-10-07` (ver acima).
2. Rodar `npx vitest run --testTimeout=60000` e o verificador do roteiro de sub-correspondentes.
3. Se o relatório da Diretoria citar a duração ou os passos do roteiro de sub-correspondentes, atualizar
   (o roteiro ganhou os passos do preenchimento do formulário; duração ≈ 5 min). O resto do relatório não muda.
4. **Módulo do credor: o desenvolvimento continua no escritório, a pedido do Daniel.** Em Casa só foi feita
   a análise (`docs/analise-credor/GESTAO_DO_CREDOR_2026-10-08.md`), sem código. Ponto de partida:
   - Perguntar ao Daniel as decisões da seção 4 do documento antes de implementar: credor pessoa física ou
     só PJ; investidor qualificado (isenção do limite por devedor); captação própria ou com terceiros;
     quem opera o relacionamento com o credor; e se o teto de R$ 15.000 é por proposta ou por
     credor/devedor.
   - Seguir o padrão do módulo de Correspondentes: dados fictícios (MSW), papel e rotas protegidas, telas
     com gráficos, tour assistido, auditoria, testes e documento de contrato para o backend com as
     justificativas.
   - Duas frentes propostas: **gestão de credores** (administração e backoffice: onboarding KYC/KYB, perfil
     de risco do art. 28, condição de qualificado, limites, suspensão, comunicados) e **tesouraria de
     credores** (Financeiro: aportes, saldo por credor, alocação por operação, devoluções, repasses por
     parcela, conciliação, extrato).
   - Não misturar a captação de credores com o módulo de Correspondentes, que é de tomadores.
   - Os pontos "a confirmar" do documento (texto vigente da norma, Res. 4.935/2021 e CVM) dependem do
     jurídico.

## Atenção

- O Windows mostra centenas de arquivos como modificados por fim de linha (CRLF/LF). Use
  `git diff --name-only` para ver só o que mudou de verdade.
- O commit só passa os hooks com o Git for Windows de `C:\Pastas\Arquivos\Git` no escritório (o git do
  GitHub Desktop cai no bash do WSL e o husky não acha o `npx`), conforme o handoff de 07/10.
