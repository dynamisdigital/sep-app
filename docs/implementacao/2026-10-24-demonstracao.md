# Demonstração SEP — 24/10/2026

Implementação na branch `escritorio-2026-10-24`. Arquivos locais preexistentes preservados. Nenhum commit ou publicação realizado.

## Fotografias com telas reais no tema escuro

11 fotografias com monitores, notebooks ou celular visíveis receberam edições individuais pelo `image_gen` integrado, usando capturas reais do sistema em modo demonstração. As fotos sem tela visível foram preservadas. Novos arquivos PNG/WebP, referências de captura, instruções de edição e hashes dos originais estão documentados em `image/demonstracao/versoes/telas-escuras/README.md`.

O seletor **Imagens**, no topo da galeria e das seis prévias, alterna imediatamente entre **Telas do sistema** e **Fotos originais**, com preferência persistida no navegador. O mapeamento central troca somente as 11 fotos selecionadas e atende também às reutilizações da Operação completa e do blog. O blog usa a versão nova por padrão; o seletor governa as páginas da demonstração. Os 64 arquivos originais PNG/WebP permanecem intactos, verificados por SHA-256.

Verificações: testes de navegador cobrem a integridade dos originais, disponibilidade das 22 versões novas, restauração/persistência entre cenários, carregamento das fotos nos seis perfis e enquadramento em desktop e celular. 18 testes unitários dos vínculos, etapas e blog aprovados. TypeScript, ESLint, Stylelint e build aprovados; bundle inicial em 749,94 kB.

## Correção dos cartões de etapas (01–05)

Os 30 cartões das seis prévias agora usam roteiros independentes em `demonstracao-etapas.ts`, com identificação do perfil, número e título da etapa. Cada roteiro prepara seu próprio ponto de partida, demonstra somente aquela parte nas telas existentes e retorna à mesma prévia. Não há continuação automática para outra etapa. O botão principal mantém o tour do cenário e Operação completa mantém o percurso integral entre os perfis.

Os trechos reutilizam os roteiros reais de cadastro, crédito, documentos, contratos, comissões, indicadores e financiamento. O Cliente continua sendo representado pela equipe operacional quando não existe tela própria. Etapas de consulta usam as telas de consulta do respectivo perfil; não concedem permissões de outros papéis ao correspondente.

`TourService.iniciarRoteiro` permite iniciar o roteiro local carregado com a página da demonstração, sem incluir 30 novos itens no catálogo global de Ajuda. Repetir preserva a etapa local, sua preparação e o destino de retorno. A orientação da prévia e do tour de Ajuda distingue os cartões individuais do botão maior.

Validação: 30 testes Playwright aprovados, percorrendo os cartões até a conclusão e verificando o retorno ao perfil, sem seletor para outros capítulos. Mais 63 testes unitários aprovados verificam limites, roteiros distintos, bloqueio fora do modo demo, repetição do roteiro local e regressão dos tours. TypeScript, ESLint, Prettier e build aprovados; bundle inicial em 749,91 kB, dentro do limite de 750 kB.

## Rotas e integração

- Galeria: `/demonstracao`.
- Prévias: `/demonstracao/operacao_completa`, `/demonstracao/correspondente`, `/demonstracao/subcorrespondente`, `/demonstracao/cliente`, `/demonstracao/backoffice`, `/demonstracao/financiador`.
- Não havia seis rotas autônomas de tour: os seis perfis já integram `jornada-real`, em `core/tour/roteiros/jornada.roteiro.ts`.
- O serviço recebeu um argumento opcional de seção inicial, que usa o mecanismo existente `irParaSecao` para preparar os dados e entrar com a conta adequada. Os demais chamadores mantêm seu comportamento.

| Prévia | Roteiro / capítulo existente | Telas reais utilizadas |
| --- | --- | --- |
| Operação completa | jornada-real / início | `/`, `/login`, capítulos autenticados |
| Correspondente | jornada-real / Correspondente | `/app/meu-backoffice/rede` |
| Subcorrespondente | jornada-real / Sub-correspondente | `/app/meu-backoffice/prospeccao`, `/app/meu-backoffice/documentos` |
| Cliente | jornada-real / Tomador | `/app/credito/propostas/nova` |
| Backoffice | jornada-real / Backoffice | `/app/backoffice/correspondentes`, `/app/onboarding/empresa` |
| Financiador | jornada-real / Credor | `/app/credora/conta` e demais telas da área existente |

O tour começa no capítulo selecionado e pode continuar nos seguintes. O Cliente é representado pela equipe operacional no roteiro atual; isso está explicado na prévia. Não foi inventado um portal próprio para ele.

## Arquivos e ativos

- `image/demonstracao/`: ZIP completo extraído sem diretório extra; 74 hashes conferidos, zero divergências; seis mockups apenas como referência.
- `src/app/features/public/demonstracao/`: componente standalone OnPush, template, SCSS, dados tipados derivados do manifesto e teste do vínculo com capítulos.
- `public.routes.ts`: duas definições lazy de rota.
- `shared/site-navegacao.ts`: menu Demonstração e rótulos Financiador no cabeçalho/rodapé compartilhados.
- `core/tour/tour.service.ts`: opção de iniciar em um capítulo existente.
- Testes ajustados em `core/tour/tour.service.spec.ts`, `shared/public-shell.component.spec.ts`; testes de navegador em `e2e/demonstracao.spec.ts`.

Fotos servidas em `/image/demonstracao/assets/<perfil>/...`. O Angular já mapeava `image` para `/image` nos builds de desenvolvimento e produção; nenhuma alteração de dependências ou de configuração foi necessária. As 62 imagens PNG/WebP estão presentes no build de produção. A interface usa os seis banners e 25 fotos de etapas, com fontes WebP e fallback PNG, dimensões reservadas e carregamento adiado das etapas.

Carrossel com 15.000 ms, seleção direta, anterior/próximo, teclado, gesto de toque e pausa manual. Pausas independentes por hover e foco, visibilidade do documento, preferência de movimento reduzido e tour em andamento. Timers e listeners são removidos na destruição. Os tokens do site público e o shell existente preservam temas, cabeçalho e rodapé.

## Limitações mantidas de propósito

- Execução assistida disponível somente quando `ehAmbienteDemo()` permite mocks; produção apresenta prévias e botões desativados, com explicação. Não foram alterados backend, guardas ou regras financeiras.
- Identificadores legados `Credor`, `/app/credora`, `/investidores` e `AREA_DO_INVESTIDOR` preservados por compatibilidade. Os textos desta demonstração e seu shell exibem Financiador. Outras páginas institucionais antigas ainda têm textos legados e não foram reescritas nesta tarefa.
- Não foi repetido o tour financeiro completo de aproximadamente 22 minutos. A validação cobre a integração dos capítulos, o serviço existente e a nova interface.

## Validação

- `npm run build`: build de produção aprovado; imagens presentes em `dist/sep-app/browser/image/demonstracao/assets`.
- `npm run lint`: aprovado. ESLint e Stylelint também executados nos arquivos alterados.
- Prettier: verificação dos arquivos de código alterados aprovada.
- Vitest: 64 testes direcionados aprovados, somando os testes do serviço/roteiro/shell (62) e os dois testes dos vínculos da demonstração. Os testes de vínculo foram repetidos separadamente após corrigir uma suposição do teste sobre as entradas de seção.
- Playwright: seis cenários aprovados nas execuções finais (cinco cenários de perfis/temas/movimento reduzido/visibilidade, mais o cenário de relógio/teclado repetido separadamente). Viewports: 1440, 768 e 390 px. Todos os perfis com imagens carregadas, sem overflow horizontal e sem erro JavaScript.
- Relógio controlado: primeiro slide preservado aos 14.999 ms e próximo aos 15.000 ms; hover/foco pausam; seleção manual e teclado funcionam; retomada reinicia o intervalo. O relógio do teste avança também para permitir a renderização do Angular depois dos eventos de teclado.
- SHA256: 74 arquivos verificados sem divergência. Build: 62 arquivos fotográficos disponíveis. Busca por rótulos públicos vedados na nova feature e inspeção do texto do shell no navegador: nenhuma ocorrência visível.
- `git diff --check`: aprovado.

O sandbox bloqueou processos auxiliares de build/Vitest com `spawn EPERM`; os comandos necessários foram repetidos com permissão fora do sandbox. Não foram executadas as suítes completas de regressão nem o tour financeiro de ponta a ponta.

## Readequação visual aos mockups — revisão de 24/10/2026

Esta revisão substitui a composição inicial de foto e texto lado a lado.

- Os seis mockups foram inspecionados. A Operação completa agora apresenta as seis jornadas em cards fotográficos, com ícones, resumo e acesso ao tour real.
- Os cinco perfis têm fotografia de fundo, texto HTML sobreposto, degradê de leitura, título e chamada em branco/ciano no tema escuro, tipografia de sistema Inter/Segoe UI, botão ciano e painel translúcido lateral. O tema claro usa os tokens claros do SEP.
- Correspondente, Subcorrespondente, Cliente e Backoffice possuem painéis com quatro destaques. O Financiador tem gráfico, distribuição e situação da carteira em HTML/SVG/CSS, identificados como ilustração, sem projeção financeira.
- Cada perfil exibe cinco cards inferiores com fotografia, número, título, descrição e botão para iniciar o capítulo existente. As etapas também aparecem no slide ativo da galeria.
- O temporizador segue o widget da home: setas, indicadores, pausa/retomada e barra de progresso com `INTERVALO_BANNER_MS` compartilhado. A barra acompanha as mesmas condições de pausa do timer e reinicia com a seleção manual.
- A apresentação reage à altura disponível pelo container `sep-conteudo`, mantendo cabeçalho e rodapé. A área visual respeita a preferência entre largura ajustada (meia tela) e expandida; tablets e celulares usam composição com rolagem natural.

### Escala inicial

O aplicativo abre com escala CSS equivalente a 70% em desktop (janela a partir de 1080 px). A preferência nativa de zoom do navegador não é alterada: páginas não têm permissão para impor essa configuração do navegador. Em tablets/celulares, a escala permanece em 100% para preservar a leitura e os controles de toque.

O `router-outlet` está dentro de `.sep-viewport`; o overlay do tour permanece fora desse quadro. As alturas de shell, home, login e site público usam a altura compensada `--sep-altura-janela`. Os deslocamentos de rolagem do tour/lista de propostas e a tarja de leitura em áudio compensam a escala com `escalaDoLayout`. A medição inicial do modo responsivo usa `clientWidth`, compatível com a largura de layout recebida pelo ResizeObserver.

Arquivos adicionais desta revisão: `app.html`, `app.scss`, `core/layout/escala-layout.ts` e seu teste, `core/layout/sep-layout-mode.directive.ts`, estilos dos shells/home/login, componente de leitura em áudio, lista de propostas e `demonstracao-apresentacao.ts` com os textos e os destaques derivados das referências.

### Validação desta revisão

- 81 testes Vitest direcionados aprovados: escala, modo responsivo, tour, vínculos dos perfis, shell público, leitura em áudio e lista de propostas.
- Testes Playwright de temporização, teclado, movimento reduzido, aba invisível e alinhamento do tour com o alvo a 70% aprovados.
- Tablet 768×900 e celular 390×844: seis perfis nos temas claro/escuro aprovados, sem overflow horizontal ou imagens quebradas.
- Desktop 1366×768: seis perfis nos temas claro/escuro aprovados, sem rolagem vertical do documento ou overflow interno/cortes nos painéis e cards. Full HD (1920×1080) e ultrawide (2560×1080) também aprovados para os seis perfis e os dois temas. Os oito cenários Playwright passaram nas execuções finais.
- Capturas de revisão são geradas em `test-results/visual-<perfil>-<largura>-<tema>.png` (artefatos locais, não publicados).
- Lint Angular, Stylelint, Prettier e `git diff --check` aprovados. Build de produção aprovado, sem alteração de dependências.

### Correção do botão de meia tela e retirada da faixa superior

Removida a regra `.site-page.site-apresentacao { max-width: none; }`, que anulava a preferência de largura na demonstração. A página voltou a respeitar `data-largura`: ajustada fica centralizada com o limite existente de 1716 px de layout; expandida ocupa a janela. A preferência continua persistida em `SEP_LARGURA_CONTEUDO`.

A faixa superior com o aviso e o link “Saiba como se proteger” foi retirada da apresentação de demonstração. O grid do shell passou a ter três faixas nesse modo (cabeçalho, conteúdo e rodapé), aproveitando a altura liberada.

Teste de regressão em `e2e/demonstracao.spec.ts`: alternância de largura em 2560×1080, centralização, persistência após recarga, seis perfis sem cortes/overflow em meia tela e ausência da faixa superior.

O acesso “Área do Financiador”, com ícone de carteira e destino `/login`, fica abaixo de “Entrar”, alinhado à direita, conforme a home. O teste de regressão também confere a posição relativa dos dois acessos e o destino do link.

### Restauração da escala original da home

A escala de 70% passou a ser exclusiva das rotas `/demonstracao` e `/demonstracao/:perfil`, por uma classe no quadro de conteúdo atualizada nos eventos `NavigationEnd`. Home, login e demais áreas voltaram a abrir em escala 100%, inclusive ao sair da demonstração sem recarregar a página. A escala compacta não é mais aplicada globalmente à abertura do sistema.

Removido o atalho “Ver uma operação completa — demonstração assistida nas telas do sistema” da home e seus estilos/método sem uso. O acesso permanece no menu Demonstração. Ajustados apenas os espaçamentos entre itens do menu para os nove links caberem em uma linha em meia janela, preservando o tamanho da fonte. O teste da jornada completa passou a iniciar pelo menu e pela galeria.

Quatro testes Playwright aprovados em `e2e/escala-inicial.spec.ts`: home em 100% nas larguras 1280, 1366 e 1920; texto do parágrafo principal com pelo menos 16 px efetivos; ausência de corte horizontal e do atalho duplicado; menu em uma linha; troca de escala ao navegar entre home, demonstração e login.
## Tipografia e painel de jornadas — revisão de 24/10/2026

A demonstração passou a usar escala CSS 100%, igual à home, respeitando o zoom escolhido no navegador. A redução adicional de 70% foi retirada. Logo, menu e títulos mantêm os tamanhos da home; a altura acompanha o conteúdo para preservar a leitura em janelas menores.

Na galeria inicial, três cartões largos ficam visíveis em desktop, dois em tablet e um em celular. O trilho desloca o conjunto da direita para a esquerda em 2,5 segundos e pausa por quatro segundos a cada alinhamento. A repetição usa cópias visuais para manter a continuidade. Há navegação manual, pausa, teclado e toque; foco, mouse sobre o painel, aba oculta e preferência por movimento reduzido suspendem a reprodução automática. A galeria permanece aberta durante esse ciclo.

Foi criada uma fotografia exclusiva para Operação completa, pois os arquivos originais dessa jornada e de Subcorrespondente eram idênticos. Os originais foram preservados. Arquivos novos: `image/demonstracao/assets/operacao_completa/01_operacao_completa_exclusiva.png` e `.webp`.

Geração pelo modo integrado ImageGen. Prompt: fotografia editorial corporativa realista de empresário e profissional financeira concluindo reunião com aperto de mãos; escritório moderno, iluminação natural, composição horizontal com rostos e mãos no centro, sem textos, marcas ou interfaces. WebP derivado apenas para otimização de formato.

Validação: build de produção, ESLint e Stylelint aprovados. Testes no Chromium verificaram igualdade do tamanho das fontes de logo e menu entre home e demonstração, cinco larguras de tela, temas claro/escuro, meia tela e persistência da preferência, animação real com retorno ao início, navegação manual, pausa explícita, movimento reduzido e alinhamento do tour. Três testes unitários de vínculos e escala aprovados. Em janelas de pouca altura, o conteúdo pode exigir rolagem vertical para preservar o tamanho das letras.

## Painel em arco — avanço em pares

A galeria destaca dois cartões em tamanho natural no centro e deixa os vizinhos menores, inclinados em perspectiva e um pouco abaixo, formando um arco. O deslocamento avança dois cartões de cada vez, com crescimento na entrada e redução na saída, em 2,5 segundos; mantém a pausa de quatro segundos. A versão de celular apresenta um cartão central por vez para preservar a leitura. As fotos passaram a preencher o fundo, com degradê escuro protegendo os textos. Cópias antes e depois da sequência mantêm o ciclo contínuo.

Os controles manuais também usam a transição. Os testes no Chromium verificam três avanços consecutivos (0→2→4→0), os dois cartões centrais com a mesma transformação, a perspectiva distinta nos vizinhos, a navegação manual e a pausa, além dos layouts de tablet e celular nos dois temas.

## Retomada pelo Play

O comando Play inicia imediatamente o próximo deslocamento quando o painel está parado ou retoma do ponto em que a animação foi pausada. O mouse e o foco no próprio botão deixam de impedir essa retomada. Os ciclos seguintes mantêm o intervalo automático de quatro segundos; interagir com um cartão volta a respeitar a pausa por mouse/foco. Ambos os controles de reprodução compartilham o mesmo comportamento. A pausa explícita também congela deslocamentos iniciados manualmente.

## Seleção abre a prévia antes do tour

A imagem, o link e a seta de cada cartão abrem o banner da respectiva jornada. Nenhum desses acessos inicia o tour diretamente; a execução fica no botão de assistir da prévia. A rota `/demonstracao/operacao_completa` passou a ter banner próprio, foto exclusiva, painel de perfis conectados e botão para iniciar o tour completo. A galeria em arco permanece na entrada `/demonstracao`.

Na galeria, o indicador inferior destaca o par corrente, e a barra acompanha a espera de quatro segundos e o deslocamento de 2,5 segundos. As setas inferiores movimentam os pares; os pontos permitem selecionar as prévias dos demais perfis. O Play continua retomando imediatamente.

## Aproveitamento da altura e auditoria das seis demonstrações

O banner principal dos perfis passa a absorver a altura livre entre o conteúdo e o rodapé, mantendo o tamanho das fontes e a seção de etapas. O ajuste usa linhas flexíveis de grid em desktop; telas menores continuam com altura natural. Na janela equivalente à referência (1706 × 1258 pixels CSS, correspondente ao navegador em 75%), os seis perfis cabem sem rolagem vertical e deixam no máximo 16 pixels entre a nota final e o rodapé.

Operação completa era a única prévia sem “Como funciona”. Foram acrescentadas cinco etapas: originação e cadastro, proposta e análise, participação do financiador, formalização e liberação, acompanhamento e quitação. As imagens são reaproveitadas dos respectivos perfis do mesmo cenário, preservando os arquivos originais do pacote.

A auditoria em `e2e/demonstracao-auditoria.spec.ts` verifica as seis prévias, carregamento de imagens, cinco etapas por perfil, retorno à galeria, destinos do menu/rodapé/login e abertura dos tours pelos 36 botões. Também confere os 18 acessos por imagem, seta e link dos cartões. A validação dos tours cobre a abertura e o encerramento em ambiente simulado; não é uma execução integral de todas as etapas financeiras do roteiro.

## Remoção dos painéis laterais e retorno à posição da galeria

Os painéis da direita foram removidos de todos os banners, incluindo os gráficos do financiador, e seus estilos exclusivos foram retirados. Permanecem foto principal, textos, botão de assistir e as cinco etapas.

`DemonstracaoGaleriaService`, com duração da sessão da aplicação, guarda a posição corrente e o estado de pausa da galeria. Ao abrir uma prévia e retornar por “Voltar à galeria” ou pelo histórico do navegador, o mesmo par reaparece e a preferência de pausa é mantida. A posição sobrevive à troca entre os componentes das duas rotas, sem acrescentar parâmetros à URL.

## Ajuda, artigos dos cenários e padronização de Financiador

Novo tour público `publico-demonstracao`, no grupo Demonstração do menu Ajuda: apresenta os seis cenários, o selo Todos os perfis, a passagem em arco, a pausa e o Play, as cinco etapas e a volta ao mesmo ponto da galeria. O tour visita as seis prévias sem iniciar outro roteiro nem criar dados. Durante ele, os deslocamentos solicitados pelos controles continuam animados; a rotação automática permanece suspensa. A preferência por movimento reduzido é respeitada.

Foram criados seis artigos, com fotos dos próprios cenários, textos específicos, relacionados e botão que leva à prévia: operação completa, correspondente, subcorrespondente, cliente, backoffice e financiador. Os textos existentes e o filtro do blog usam Para financiadores.

Os rótulos visíveis do site, da conta escrow do financiador, da gestão de cadastros, das ilustrações, do glossário e das narrações dos tours foram revisados. Chamadas como Quero financiar, Apta a financiar e operações disponíveis para financiamento acompanham a terminologia. Permanecem os termos regulatórios investidor qualificado e termo de investidor qualificado nos seus contextos, além de identificadores internos e URLs antigas para manter compatibilidade.

Validação desta revisão: 99 testes unitários direcionados aprovados (blog, páginas públicas, catálogo de Ajuda e telas de financiadores/backoffice), além da execução integral do novo tour no Chromium em duas condições iniciais: galeria normal e prévia aberta com a galeria pausada no último par. A animação foi observada durante o roteiro, e as seis prévias foram visitadas. Os seis artigos carregaram suas fotos e abriram o cenário correto. A busca textual das páginas públicas preservou apenas a categoria regulatória. Build de produção aprovado dentro do limite de tamanho inicial; ESLint, Stylelint e formatação aprovados.

## Tours operacionais restritos ao cenário escolhido

As prévias dos cinco perfis passaram a iniciar roteiros próprios (`jornada-cenario-*`), em vez de saltar para um ponto do roteiro completo e continuar nos capítulos seguintes. Somente Operação completa inicia `jornada-real`.

Cada roteiro contém uma orientação breve sobre o contexto anterior, a entrada na conta necessária ao cenário, a faixa completa daquele capítulo e um encerramento que apenas informa o que viria depois. Os dados anteriores são preparados no mock por `prepararAte`, sem executar os outros perfis na tela. O subcorrespondente inclui também os passos que não tinham a propriedade `secao` explícita e para antes do backoffice.

Os tours individuais expõem somente uma seção, inclusive ao repetir, e retornam à prévia do mesmo perfil após concluir (`rotaFinal`). O botão principal diz Assistir cenário; Operação completa mantém sua chamada própria. O catálogo de Ajuda disponibiliza as cinco opções isoladas junto do roteiro completo.

Validação: os cinco cenários foram executados até a conclusão no Chromium, sem avançar para outro capítulo, com retorno automático à respectiva prévia. Os 61 testes unitários direcionados passaram, incluindo os limites das faixas, os passos sem seção explícita do subcorrespondente, o preparo do mock e a preservação da jornada completa.

