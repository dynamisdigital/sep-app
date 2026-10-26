# PROMPT MESTRE — MÖLLMANN Studio IDE + CODEX | Dynamis SEP

## MISSÃO

Implemente **diretamente no projeto existente** da Dynamis SEP uma nova experiência de **Demonstração** em Angular, usando os ativos fotográficos e os seis mockups de referência fornecidos neste pacote. Faça análise do repositório, plano conciso, alterações reais de código, testes e relatório final. Não encerre apenas com sugestões ou snippets: conclua a implementação quando os arquivos locais estiverem acessíveis.

## LOCALIZAÇÃO EXATA

- **ZIP recebido em:** `C:\Users\fabio\Downloads\Dynamis_SEP_Demonstracao_Completa.zip`
- **Raiz do projeto SEP:** `C:\Pastas\PROJETOS\Projeto Dynamis SEP\sep-app 16062026`
- **Destino exigido para extração:** `C:\Pastas\PROJETOS\Projeto Dynamis SEP\sep-app 16062026\image\demonstracao`
- **Manifesto dos slides:** `<destino>\manifesto_demonstracao.json`
- **Fotos:** `<destino>\assets\<perfil>\*.webp` (e `*.png` de fallback)
- **Mockups de referência:** `<destino>\mockups\*.png`

### ETAPA 0 — EXTRair e CHECAR, SEM DESTRUIR NADA

1. Confirme a existência da raiz do projeto e do ZIP; se o ZIP não existir, registre a ausência e interrompa a extração em vez de inventar arquivos.
2. Verifique `git status` e identifique alterações existentes; preserve TODO trabalho prévio. Não reverta arquivos sem autorização.
3. Se ainda não extraído, descompacte **o conteúdo interno** do ZIP diretamente na pasta de destino acima. Crie a pasta se necessário. Não crie uma subpasta adicional de pacote. Não delete recursos pré-existentes.
4. Leia `LEIA-ME_PRIMEIRO.txt`, `manifesto_demonstracao.json` e `documentacao/CRITERIOS_DE_ACEITE.md`. Confira que existem 6 mockups e assets PNG + WebP para todas as jornadas.
5. Verifique o build real do Angular (angular.json/project.json, package.json, tsconfig, configurações de assets) para determinar como disponibilizar as imagens do diretório `<raiz>\image\demonstracao` na URL pública. **O filesystem do projeto e a URL pública são conceitos diferentes.** Ajuste a seção `assets` do build ou estabeleça uma cópia mapeada no local que a aplicação já utiliza, preservando o diretório de destino solicitado. Não presuma que `/image/demonstracao` já está sendo servido. Sem URLs quebradas em produção.

### ETAPA 1 — MAPEAR A BASE SEP E OS TOURS EXISTENTES

Inspecione o código de verdade: `src/app`, rotas atuais, componentes, módulo/área de demonstração, serviço de tours, dados fictícios, testes, navegação pública, temas e o carrossel de banners já usado na página inicial. Faça buscas por termos como `demonstracao`, `demonstração`, `tour`, `guided`, `wizard`, `onboarding`, `mock`, `correspondente`, `subcorrespondente`, `tomador`, `credor`, `backoffice`. **Reaproveite o que já existe**; não crie fluxos concorrentes, simuladores paralelos, cópias de APIs ou tabelas desnecessárias.

- Localize e anote os **paths reais** dos tours para: operação completa, correspondente, subcorrespondente, cliente/tomador, backoffice, financiador/credor.
- O manifesto contém `existingTourRoute: null` de propósito: preencha o binding apenas depois de inspecionar o Router do projeto.
- Se uma jornada ainda não estiver implementada, preserve os cards e use estado acessível **Em breve** (não crie rota fantasma ou redirecione para uma jornada errada).
- O conteúdo do tour deve continuar usando dados **inteiramente fictícios**, sem criar registros reais ou chamar serviços externos, gateways ou endpoints produtivos.
- Identifique os tokens CSS/SCSS globais e as animações existentes antes de implementar novos estilos.

### ETAPA 2 — NOVO ITEM DO MENU PÚBLICO

Adicionar o item de navegação **Demonstração** sem duplicá-lo, seguindo a organização de rotas existente. O clique abre uma página dedicada à demonstração, com caminho definido em conjunto com o Router real do SEP (use `/demonstracao` apenas se estiver livre e compatível com o padrão do projeto). Preserve layout, logo, cabeçalho, autenticação, rodapé e os demais menus.

### ETAPA 3 — PÁGINA PRINCIPAL DE DEMONSTRAÇÃO COM CARROSSEL

Construir uma interface responsiva e limpa, semelhante aos mockups, com **seis slides/experiências** nesta ordem (referência: `manifesto_demonstracao.json`):

1. **Operação completa**: apresentação do fluxo da vinculação à quitação.
2. **Correspondente**: rede, cadastro, propostas e resultados.
3. **Subcorrespondente**: atendimento e carteira vinculada.
4. **Cliente**: solicitação de crédito e acompanhamento até a quitação.
5. **Backoffice**: controles e acompanhamento operacional.
6. **Financiador**: participação em operações de crédito, análise das condições e acompanhamento de recebimentos.

**Rotação AUTOMÁTICA exata a cada 15.000 ms** entre os slides ativos, assim como o carrossel já existente na home. Disponibilizar botões anterior/próximo, indicadores com estados ativo/inativo e seleção direta por indicador. Reiniciar o contador de 15 s após uma seleção manual, salvo convenção já estabelecida no carrossel da home. Quando o slide ativo receber `mouseenter` ou `focusin`, suspender rotação; retomar no `mouseleave`/`focusout` quando apropriado. Pausar em aba oculta/documento invisível; respeitar `prefers-reduced-motion` e permitir navegação por teclado e toque. Sem timers vazando ao navegar para outra rota ou destruir o componente.

Cada slide deve apresentar: fotografia principal (do diretório `assets/<perfil>`); título, subtítulo e descrição **como texto Angular/HTML, não embutido em imagem**; ação para o tour real e, conforme layout, prévia compacta de suas cinco etapas (quando disponíveis). Toda foto possui `alt` apropriado e dimensionamento responsivo sem distorção; no mobile cards podem virar lista/carrossel horizontal acessível.

A página deve usar **o cabeçalho existente do SEP**; os mockups são só referências de composição, nunca fotos de toda uma tela com menus novamente. Reutilize os recursos de `assets/` em WebP com fallback PNG, `object-fit: cover`, dimensionamento e recortes por breakpoint, evitando layout shift. Carregue prioritariamente a primeira foto, adie fotos fora de viewport/steps quando possível e evite downloads simultâneos desnecessários.

### ETAPA 4 — INTERAÇÃO E TRANSIÇÕES VISUAIS

Direção de arte: **premium dark fintech**, fundo azul-marinho profundo, ciano/azul-elétrico moderados, vidro translúcido discreto e fotografias corporativas realistas. A identidade do SEP e o mecanismo de tema claro/escuro existente têm prioridade; não force componentes escuros quando estiver no tema claro.

- **Entrada da página/slide:** fade-in + suave deslocamento vertical de 12–20 px, duração em torno de 350–650 ms; imagem com leve efeito de profundidade (sem excesso de brilho).
- **Troca entre banners:** crossfade fluido de 400–650 ms; evitar flash, salto de altura e travamento da interface.
- **Hover nos cards e imagens:** movimento discreto `translateY(-4px)` e `scale(1.01–1.025)` com halo ciano (`box-shadow`) de intensidade moderada; imagem recebe leve zoom interno sem ultrapassar contorno arredondado; teclado (`:focus-visible`) tem affordance equivalente.
- **Botões:** transições elegantes, contorno/foco visível, estados ativos e desativados, sem efeitos que prejudiquem leitura. Usar CSS transforms e opacity preferencialmente.
- **Acessibilidade:** `aria-label` para botões, sem autoplay de vídeo/áudio, bom contraste e respeito à preferência de redução de movimento. Não utilizar efeitos animados contínuos pesados (partículas permanentes, canvas ou loops de glow).

### ETAPA 5 — PÁGINAS/SEÇÕES INDIVIDUAIS POR PERFIL

Para cada perfil que tenha tour real, disponibilize um percurso a partir do banner: página ou seção dedicada com hero fotográfico, título, explicação objetiva, **cinco cartões/etapas ilustrados** e CTA de iniciar/continuar **o tour JÁ EXISTENTE**. Reutilize componentes e rotas disponíveis; não replique a própria UI do tour. As cinco fotos de etapa encontram-se no manifesto para cada perfil; para a Operação completa, reutilize o tour completo já criado e não invente uma lista de fotos inexistentes.

A animação de entrada dessas páginas pode usar stagger curto (80–120 ms entre os cards), somente durante a primeira apresentação; sem poluição visual. Preserve breadcrumb, retorno para a galeria, foco após navegação quando cabível e comportamento em telas estreitas/altas.

### ETAPA 6 — NOMENCLATURA E COMUNICAÇÃO (CRÍTICO)

Na experiência PÚBLICA do SEP, o perfil que fornece recursos deve ser chamado **exclusivamente de Financiador**. **NÃO exibir os termos `investidor`, `investidores`, `investimento`, `investimentos`** em menus, titles, labels, tooltips, CTAs, alt text ou banners desta demonstração. Para quem solicita o crédito, preferir `Cliente` (podendo esclarecer `solicitante`/`tomador` nos textos técnicos). `Correspondente`, `Subcorrespondente` e `Backoffice` permanecem.

Não usar linguagem de promessa de rentabilidade, ganhos garantidos, retorno assegurado, eliminação de riscos ou garantias regulatórias não verificadas. O texto deve explicar operações de crédito em cenário didático e comunicar riscos/condições de maneira neutra. A nomenclatura segue diretriz do proprietário e não substitui revisão jurídica/regulatória.

Se forem encontrados identificadores LEGADOS internos em rotas técnicas, persistência, tipos, schemas ou API, **não os renomeie automaticamente**: preserve compatibilidade, mapeie o rótulo público para `Financiador` e registre os pontos remanescentes para revisão posterior. Se houver rótulo público antigo no menu global (como uma área de acesso), proponha ou realize substituição de apresentação quando for seguro e semanticamente equivalente, sem comprometer permissões/autenticação.

### ETAPA 7 — ARQUITETURA E ROBUSTEZ

Seguir rigorosamente o padrão real encontrado (Angular standalone/módulos, RxJS/signals, SCSS, serviços, lazy-loading, organização de features). Considerar `ChangeDetectionStrategy.OnPush`, `DestroyRef`/`takeUntilDestroyed` e `RouterLink`, conforme convenções já existentes. Evitar dependências externas para carrossel/animação se o framework atual bastar. Não interferir no restante do layout, no login, em áreas privadas, nas rotas de produção, no backend ou em fluxos financeiros.

Manter o conteúdo do `manifesto_demonstracao.json` como referência; pode tipá-lo e copiar dados de apresentação para TS/JSON de assets em local apropriado, desde que os caminhos e rótulos sejam consistentes. Não resolver as rotas dos tours pelo nome sugerido no manifesto, mas pelo código concreto localizado.

### ETAPA 8 — TESTAR E ENTREGAR

1. Faça busca por rótulos vedados nas partes **PÚBLICAS editadas** (pesquisa textual e inspeção do navegador; não confundir nomes legados de API com texto de UI).
2. Execute lint/build/test conforme scripts de `package.json`, reportando comandos e resultados; não altere dependências ou configurações de build sem justificativa.
3. Validar as seis imagens de banner, cartões, temas dark/light, viewport desktop/tablet/mobile, foco teclado, `prefers-reduced-motion` e rotação real a cada **15 segundos**.
4. Confirme que cada CTA navega ao **tour existente correto**; se indisponível, documente `Em breve` e a peça pendente.
5. Verifique que os arquivos estáticos sobrevivem ao build e funcionam por suas URLs públicas, com WebP/fallback e sem 404.
6. Evite chamadas reais em demonstração, preserve autenticação/autorização do projeto, não invente dados de produção.
7. Entregue relatório final com: (a) arquivos adicionados/alterados, (b) rotas de demonstração e caminhos reais de tours, (c) assets consumidos, (d) testes executados e resultados, (e) pontos ainda pendentes e motivo. Se houver erros que não puder corrigir, não declare conclusão total.

**IMPORTANTE:** o objetivo é uma implementação funcional **dentro do SEP já existente**, e não um projeto web separado. O local indicado para extração é imutável; o tratamento de assets no Angular deve respeitar sua estrutura de build. Faça a mudança de menor impacto que atinja os critérios.
