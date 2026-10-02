# Padrão de implementação dos mockups SEP

## Conhecimento cumulativo

As decisões homologadas nos mockups 01, 02, 03 e 04 formam uma base cumulativa
para todas as telas seguintes. Um novo mockup não reinicia o design nem invalida
correções anteriores: ele acrescenta somente os componentes e comportamentos
específicos da nova tela.

Antes de implementar cada etapa, revisar este documento e os componentes já
homologados. Reutilizar dimensões, interações, tratamento de assets, estados,
contratos fictícios e regras de acessibilidade sempre que o elemento ou a função
forem equivalentes.

## Shell operacional homologado

O shell visual do mockup 03 é a referência homologada para todas as telas
operacionais posteriores. Os seguintes elementos devem ser reutilizados por meio
do `OperationalShellComponent`, sem redimensionamento ou reposicionamento local:

- cabeçalho e seus controles;
- botão de retorno à tela anterior;
- logotipo SEP;
- menu lateral e opções de navegação;
- cartão resumido do usuário;
- rodapé regulatório;
- dimensões, espaçamentos e posicionamentos das extremidades da aplicação.

Quando um pacote posterior contiver cópias desses elementos, elas servem como
referência de composição e não substituem os assets já homologados do mockup 03.

## Conteúdo específico de cada mockup

Cada tela deve consultar primeiro o manifesto e as pastas `icons`, `logos`,
`ui-groups` e `visuals` do seu respectivo pacote
`image/sep_mockup_XX_assets`.

Somente o conteúdo central específico da nova tela deve utilizar esses assets.
Recortes em `ui-groups` são referências visuais e não devem substituir
componentes HTML funcionais.

## Auditoria obrigatória dos assets antes do uso

Os pacotes são recortes automáticos do mockup e **não são confiáveis por
padrão**. Antes de referenciar qualquer PNG, inspecionar a imagem ampliada — a
forma prática é montar uma folha de contato com todos os arquivos que a tela vai
usar, sobre fundo neutro, e olhar um a um.

Reprovar o asset quando ele apresentar qualquer destes sintomas:

- contém texto do mockup (rótulo de botão, título de cartão, valor numérico);
- contém a borda de um botão, campo ou cartão que o HTML já desenha;
- traz apenas parte do glifo, ou o glifo descentralizado;
- traz um gráfico com os rótulos embutidos (anel com percentual, sparkline com
  o valor ao lado).

Asset reprovado não é ajustado por CSS: é substituído.

- Ícones reprovados usam `lucide-angular`, registrado em
  `src/app/core/icons/lucide-icons.ts` e provido no `app.config.ts`. Ícone novo
  entra nesse mapa central, e o `spec` da tela precisa de
  `importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))`.
- Gráficos reprovados são desenhados: anel com `conic-gradient` (Mockup 20 e
  22), sparkline com `polyline` em SVG (Mockups 22 e 23).
- Miniaturas de documento e ilustrações continuam vindo do pacote quando o
  recorte estiver íntegro.

Nos Mockups 22 e 23 esta auditoria reprovou, respectivamente, quase todo o
conjunto de ícones e três assets (`icon_ultima_tentativa_clock`,
`icon_button_tentar_novamente_refresh`, `visual_provider_sparkline`).

## Composição de PNGs com fundo embutido

Os recortes aprovados normalmente vêm sem canal alfa, com o fundo escuro do
mockup embutido. Sobre o gradiente dos cartões isso aparece como um quadrado
preto ao redor do ícone.

- Usar `mix-blend-mode: lighten` nesses casos. `screen` funciona sobre fundo
  quase preto, mas clareia o fundo embutido quando o ícone está sobre um botão
  com preenchimento e devolve o quadrado.
- Assets com transparência real são renderizados diretamente, sem blend.
- Quando o recorte cortou o brilho externo do ladrilho e deixou uma faixa clara
  na borda, aparar com `clip-path: inset(Npx round R)` e compensar o tamanho da
  caixa, preservando a área visível homologada.

## Verificação dimensional por medição

A inspeção visual não denuncia conteúdo espremido: um item flex encolhido
pinta o excedente fora da própria caixa, sem gerar rolagem. Toda tela deve ser
conferida por medição, comparando `scrollHeight` com `clientHeight`:

- de cada coluna do grid da página;
- de cada cartão da coluna lateral, contra a altura da faixa correspondente no
  mockup;
- dos blocos internos do conteúdo central.

Quando o mockup fecha sem rolagem em 1536×1024, a tela também deve fechar. O
ajuste vem de espaçamentos e paddings, nunca de reduzir tipografia ou ícones
abaixo do homologado.

### Área útil em telas altas

A altura base é calibrada pela menor resolução homologada, então em telas mais
altas sobra área útil. Essa folga não pode virar um vazio no rodapé das colunas:

- medir a folga real (`altura da coluna` menos `rodapé do último cartão`) antes
  de distribuir;
- devolvê-la como espaçamento — entre widgets, entre título e conteúdo e entre
  as linhas de cada lista — em um bloco `@media (height >= …)`, mantendo a base
  compacta intacta;
- os incrementos do bloco somam a folga medida, e nada além dela: acrescentar
  "um pouco em cada regra" reintroduz rolagem;
- colunas em `flex` recebem `justify-content: space-between`, de modo que o
  espaço restante fique entre os widgets e não depois do último.

### Ocupação interna dos widgets

Widget alto com conteúdo agrupado no topo e vazio embaixo é erro de composição,
não sobra de espaço. O conteúdo deve ocupar a altura do widget:

- o cartão vira coluna flex e sua lista (`dl`, `ul`) recebe `flex: 1` com
  `justify-content: space-around`, de modo que as linhas se espalhem em vez de
  ficarem coladas no título;
- blocos com elemento gráfico (anel, linha do tempo) centram o desenho na
  altura disponível com `align-content: center`;
- ações e rodapés de cartão ficam ancorados na base.

Assim, aumentar a altura de um widget filho aumenta o espaçamento entre seus
componentes — que é o efeito desejado — e não a área vazia.

`space-around` e não `space-between` (correção do Mockup 22): com
`space-between` a primeira linha nasce colada no título e a última no rodapé,
e toda a folga se concentra entre as linhas do meio. As meias folgas das pontas
do `space-around` reduzem o vão entre linhas e afastam o bloco do título, que é
a leitura correta — o título é o cabeçalho da lista, não a primeira linha dela.

Nem todo filho deve esticar. Grades de atalhos (ícone sobre rótulo de duas
linhas) têm altura intrínseca: esticá-las até o fim da coluna transforma o
botão em um retângulo alto e vazio. Esses cartões recebem `flex: 0 0 auto`, e a
folga que deixam de consumir é redistribuída pelos vizinhos que sabem espalhá-la
entre suas linhas.

Regras genéricas aplicadas a "todos os cartões de uma região" precisam poupar os
que têm grade própria (`:not(.classe)`), sob pena de trocar silenciosamente o
`display: grid` do componente por `flex` e desmontar seu alinhamento.

### Proporção entre colunas

A largura das colunas laterais é orçamento, não decoração: cada pixel a mais na
lateral sai do conteúdo central. Quando o conteúdo central tiver blocos que
quebram linha (identificadores, protocolos, chaves), estreitar a lateral até o
mínimo que preserve seus rótulos em uma linha e devolver a diferença ao centro.
Em listas de rótulo e valor, `white-space: nowrap` no rótulo e reticências no
valor evitam que a quebra do rótulo consuma altura.

Armadilhas já observadas:

- `flex: 1 1 auto` com `min-height` fixo anula o mínimo automático do item e
  deixa o conteúdo vazar para fora do cartão, sem rolagem para alcançá-lo. Usar
  `min-height: min-content`.
- `justify-content: center` em contêiner rolável empurra o topo para fora da
  área acessível. Usar `justify-content: safe center`.
- Colunas laterais que no mockup começam na altura do breadcrumb devem ocupar
  as duas faixas do grid (`"heading side"` + `"main side"`); iniciá-las abaixo
  do cabeçalho custa cerca de 180 px de altura útil.

## Manutenção do SCSS da tela

Correções sucessivas não podem ser empilhadas como novas camadas de override no
fim do arquivo. Ao encontrar o mesmo seletor redefinido em blocos diferentes,
reescrever a folha da tela em vez de acrescentar mais uma camada.

## Fidelidade dimensional e prevenção de compressão

- Usar as dimensões dos recortes e do manifesto como referência objetiva para
  alturas, larguras, tipografia e espaçamentos do conteúdo central.
- Não permitir que `flex-shrink`, frações de grid ou compressão do viewport
  reduzam silenciosamente widgets, imagens ou ícones abaixo das dimensões
  homologadas.
- Preferir alturas e larguras mínimas estáveis para widgets cuja proporção faz
  parte do mockup. A responsividade deve reorganizar o layout em breakpoints,
  não deformar progressivamente seus componentes.
- Assets extraídos com margem transparente devem ser renderizados considerando
  o tamanho total informado no manifesto; reduzir apenas a caixa visível pode
  tornar o desenho interno muito menor que o mockup.
- Em linhas com ícone e texto, reservar uma coluna exclusiva e estável para o
  ícone. O ícone não deve participar do cálculo de recuo, largura ou
  espaçamento interno do texto.
- Títulos, subtítulos, valores e selos devem ser alinhados por suas próprias
  caixas textuais, sem usar a largura do ícone adjacente como referência.
- Componente de altura fixa que vive dentro de um título (selo em `h2`/`h3`)
  precisa de `line-height` próprio. Herdando a entrelinha do título, a caixa de
  texto fica maior que a altura homologada do selo e o rótulo escorrega do
  centro — `align-items: center` não corrige, porque a caixa que ele centra já
  estourou. Usar `line-height: 1` na regra do selo, não `padding` compensatório.
- Aplicar `box-sizing: border-box` aos widgets e componentes internos. Alturas
  homologadas devem incluir borda e preenchimento; o `padding` não pode aumentar
  a caixa para fora da trilha definida no grid.
- Painéis com altura homologada devem ocultar apenas decoração excedente. Nunca
  usar `overflow` para mascarar conteúdo mal dimensionado: primeiro conferir a
  soma de título, margens, linhas, bordas e preenchimentos.
- Antes de aplicar qualquer modo de composição a um PNG de HUD, verificar seu
  canal alfa. Assets com transparência real devem ser renderizados diretamente;
  `mix-blend-mode` pode gerar duplicações ou imagens fantasma no compositor do
  navegador.
- Inspecionar visualmente cada imagem decorativa antes de aplicá-la como
  background. Recortes que contenham botões, textos ou outros controles do
  mockup não podem ser usados atrás do HTML funcional, pois duplicam esses
  elementos na tela.

## Navegação

Toda tela operacional deve apresentar no cabeçalho o botão circular de retorno,
na posição e dimensão definidas pelo mockup 03. A ação deve retornar ao histórico
anterior real da aplicação.

## Paridade de escala e cor com o mockup

Sete verificações passaram a ser obrigatórias porque foram cobradas em todas as telas da
série 24 a 28, sempre depois de a tela ser apresentada como pronta. Elas pertencem à
entrega, não à revisão do usuário.

- Ícones da implementação nunca menores que os do mockup. Ícone de título de widget, de
  métrica, de ladrilho e de linha do tempo têm tamanhos distintos no desenho e são medidos
  um a um.
- Textos na escala do desenho. A reincidência observada é o texto nascer 1 a 3px menor:
  rótulo, valor, título, selo e legenda são conferidos por família.
- Respiro interno proporcional ao tamanho dos componentes daquele widget. Não herdar os
  valores da tela anterior sem medir.
- Cor própria de borda, fundo e ícone em cada botão e ladrilho, conforme o desenho.
  Cinza padrão aplicado a todos é reprovação, assim como trocar a cor semântica.
- Gráficos circulares com o tratamento já aceito nas telas anteriores: halo, brilho na cor
  do tom, núcleo opaco, realce no hover e início em 12 horas.
- Vãos iguais entre widgets irmãos, sem faixa morta dentro dos cartões. Quando sobra altura,
  ela vira vão entre faixas — nunca vazio dentro de um cartão.
- Centralidade por linha comprovada por medida: desvio zero entre o centro do ícone e o
  centro do texto da mesma linha, e nenhum texto cortado onde o mockup mostra o conteúdo
  inteiro.

O relatório final traz cada um destes pontos com o número medido. Sem número, o ponto não
está verificado, e a tela não deve ser apresentada para análise.

## Interações de hover e foco

Todos os componentes interativos e informativos das novas telas devem manter uma
linguagem comum de resposta ao usuário:

- widgets principais reforçam discretamente a borda e o glow, sem alterar suas
  dimensões;
- botões elevam no máximo 2 px e recebem reforço de borda, texto e glow;
- cartões internos podem elevar no máximo 4 px, desde que permaneçam contidos no
  widget pai;
- linhas de dados recebem realce suave de fundo e marcador lateral, sem alterar
  a largura de suas colunas;
- ícones podem crescer até aproximadamente 6%, preservando sua caixa e sem
  deslocar textos;
- selos reforçam borda e glow e podem crescer no máximo 4%, sem deslocar o
  texto vizinho nem alterar a altura da linha;
- todo efeito de `hover` aplicável a controles deve possuir estado
  `:focus-visible` equivalente para navegação por teclado;
- transições devem permanecer, em geral, entre 160 e 220 ms;
- respeitar `prefers-reduced-motion: reduce`, eliminando deslocamentos e
  animações perceptíveis quando solicitado pelo sistema.

Esses efeitos pertencem ao componente reutilizável correspondente. Não devem ser
recriados com valores divergentes em cada página.

### Resposta associativa

O realce não pertence apenas ao elemento sob o ponteiro: o bloco que o contém
responde junto, para que o usuário perceba o conjunto ao qual o dado pertence.

- Passar em uma linha acende o selo, o ícone e o marcador daquela linha.
- Passar em um item de uma lista acende também o indicador do grupo no título
  (ponto colorido, contador) — o vínculo é expresso com `:has()`.
- Passar em um widget composto acende suas partes de uma vez: ícone, rótulo de
  estado, LED e gráfico do mesmo cartão.
- Ícones acendem com `brightness` e `drop-shadow` na cor do tom do elemento,
  não em uma cor fixa.

### Controles de seleção

Aba, filtro ou alternador desenhado no mockup precisa selecionar algo. Trocar
apenas a própria cor é decoração: o controle parece operante e não faz nada
(Mockup 22, onde o sinal da aba só alimentava a classe do próprio botão).

- O estado selecionado precisa ter consequência visível fora do controle: o
  bloco correspondente ganha realce e o não selecionado recua discretamente.
  Quando a composição do mockup mantém os dois blocos visíveis, a seleção é
  associativa — destaca, não esconde.
- A seleção leva o foco ao primeiro campo útil do bloco escolhido.
- O caminho inverso também vale: agir dentro de um bloco (enviar seu formulário)
  seleciona a aba dele, para que seleção e resultado nunca se contradigam.
- Quando o resultado é único e pode vir de mais de um caminho, ele declara sua
  origem; trocar a seleção não reescreve um resultado que já está na tela.
- Semântica: `role="tablist"` com `aria-controls` apontando para o painel,
  painel com `role="tabpanel"` e `aria-labelledby`, `tabindex` rotativo (só a
  aba selecionada é tabulável) e setas alternando com o foco na faixa.

## Estados de erro e vazio

Todo estado de erro precisa ser verificável no navegador sem backend real. Com o
MSW ativo a requisição é respondida no service worker, então bloquear a chamada
pelo DevTools não funciona, e desligar o MSW derruba a sessão no guard de rota.

Os handlers em `src/mocks/handlers.ts` expõem um interruptor de falha:

- `?mock_erro=<chave>` na URL ou `localStorage.SEP_MOCK_ERRO = '<chave>'`;
- o sufixo `:once` falha apenas na primeira carga, de modo que o próprio botão
  de nova tentativa devolva o estado normal;
- sem chave ligada o interruptor é inerte e não afeta os testes.

Cada tela com estado de erro deve ter a chave correspondente no mock e um teste
de ponta a ponta que percorra a ida (falha) e a volta (nova tentativa).

O painel de erro apresenta a mensagem real devolvida pela API, além do texto
genérico do mockup: o texto fixo orienta, a mensagem identifica a causa.
Cartões laterais que descrevem a última execução refletem a tentativa real
(data, resultado e mensagem), e não valores fixos do mockup.

## Dados do mockup e dados da consulta

O mockup mostra uma tela cheia; o DTO quase nunca preenche tudo. A diferença
entre os dois é a origem de um erro silencioso: a tela responde à consulta com
dados de outro registro.

- O resultado de uma consulta real parte de uma base vazia e recebe por cima
  somente os campos do DTO. Atualizar o estado espalhando o resultado anterior
  (`{ ...atual, ...novos }`) faz o registro seguinte herdar pagador, contrato e
  protocolo do anterior — ou do exemplo homologado, que costuma ser o estado
  inicial.
- Campo sem correspondente no DTO é exibido como `—`, e o botão de cópia da
  linha desaparece com ele. Repetir o valor do mockup é atribuir a um registro o
  dado de outro.
- Selo de estado, frase de resumo, situação e código de erro derivam do status
  do DTO, com tabelas `Record<Status, …>` para rótulo, tom e frase. Selo fixo no
  HTML afirma "conciliado" para um registro divergente.
- Trilhas de etapas marcam como concluído apenas o que o status garante, e
  carimbam hora só onde existe data no DTO. Etapa sem carimbo aparece pendente,
  não concluída.
- Painéis agregados (totais da carteira, telemetria do provider) não pertencem
  ao id consultado e seguem iguais entre consultas — o comentário no código
  precisa dizer isso, ou a próxima leitura os tratará como campo esquecido.
- A regra de negócio continua no backend: a tela não deriva "parcela liquidada"
  de um recebimento conciliado. Sem o campo, `—`.

O exemplo homologado do mockup pode continuar completo, porque é o único caso
cujos dados existem fora dos DTOs. Ele é o estado inicial da tela, não o piso
dos resultados seguintes.
