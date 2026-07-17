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
- selos reforçam borda e glow, mas não mudam de tamanho;
- todo efeito de `hover` aplicável a controles deve possuir estado
  `:focus-visible` equivalente para navegação por teclado;
- transições devem permanecer, em geral, entre 160 e 220 ms;
- respeitar `prefers-reduced-motion: reduce`, eliminando deslocamentos e
  animações perceptíveis quando solicitado pelo sistema.

Esses efeitos pertencem ao componente reutilizável correspondente. Não devem ser
recriados com valores divergentes em cada página.
