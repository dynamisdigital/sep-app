# Site público Dynamis SEP, marca e Pix — atualização de 09/10/2026

Data: 09/10/2026 · Situação: front implementado com dados de demonstração (MSW). Nada aqui depende de
backend novo. A proposta que originou o trabalho está em `docs/proposta-site/` (textos, páginas, blog) e a
lista de fotos em `docs/proposta-site/IMAGENS_DO_SITE.md`.

## 1. O que mudou, em uma tela

| Área | Mudança |
|---|---|
| Site público | Páginas novas: Investidores, Transparência, Perguntas frequentes, Antifraude, Blog e texto do blog. Cabeçalho de duas linhas, faixa antifraude no topo e **Área do investidor** (no sistema continua "credor"). |
| Página inicial | Quatro banners que se alternam a cada 15 s (plataforma, investidores, empresas com Pix Automático, pessoas físicas), sem mexer no resto da página. |
| Blog | 15 textos sobre a SEP, leitura em áudio sincronizada, diagramação em 1, 2 ou 3 colunas, volta guiada à lista. |
| Navegação | Seta redonda de voltar no topo centralizado; página nova abre no topo e o voltar retoma a posição. |
| Tours assistidos | Cinco roteiros novos e dois atualizados no módulo "Site institucional" (14 roteiros). |
| Pix | Marca oficial do Pix (verde-água) no lugar do ícone genérico, em todo lugar que cita o Pix com símbolo. |
| Marca | "SEP" virou **Dynamis SEP** no logo e nos nomes da marca em todo o sistema. |
| Dashboard | Subtítulos dos cartões de módulo maiores (12,5 → 14,5 px; títulos 14,5 → 15,5 px). |
| Análise de crédito | Pix Automático ativo soma **+30** ao score (parâmetro `bonusPixAutomatico`, 0 a 100), com a linha de ajuste visível na tela. |

## 2. Páginas públicas e rotas

| Rota | Página | Observação |
|---|---|---|
| `/` | Página inicial | Cabeçalho próprio (`landing-header`); sem seta de voltar. |
| `/credito-pj` | Empresas | Topo em duas colunas, com a foto do banner de empresas. |
| `/investidores` | Investidores | Foto do banner de investidores no topo; aviso de risco logo no início. |
| `/como-funciona`, `/seguranca`, `/sobre-o-sep`, `/contato` | Institucionais | Fotos de fundo (seção 8). |
| `/transparencia` | Transparência | Identificação, tarifas, inadimplência por faixa (com o gráfico A–E ao lado da tabela) e canais. |
| `/perguntas-frequentes` | FAQ | Busca e quatro grupos; dados em `site-faq.ts`. |
| `/antifraude` | Antifraude | Linkada pela faixa do topo ("Saiba como se proteger"). |
| `/blog`, `/blog/:slug` | Blog | 15 textos em `site-blog.ts`. |

**Regras de conteúdo que não podem mudar sem decisão da Diretoria/jurídico:**

- A **autorização do Banco Central** aparece como "Em atualização" (`AUTORIZACAO_BC.referencia = null`
  em `site-conteudo.ts`). O site não pode afirmar autorização antes de ela existir.
- Em tudo que fala de financiar: risco, ausência de garantia e de cobertura do FGC, e o teto de
  R$ 15.000,00 por credor por tomador para quem não é investidor qualificado.
- Pix Automático ≠ Pix Agendado. O texto diz que o Pix Automático reduz o risco de esquecer a parcela **e**
  melhora o score na análise de crédito, o que é verdade no sistema por causa do ajuste de +30.
- Imagens de pessoas levam o rótulo "Imagem ilustrativa": mostram o tipo de cliente, não pessoas reais
  nem depoimentos.

Arquivos: `src/app/features/public/` (uma pasta por página), dados em `shared/site-*.ts`, cabeçalho e
rodapé em `shared/public-shell.component.*`, tema e mixins em `shared/_site-tema.scss`.

## 3. Banners da página inicial

- Quatro banners em `landing/banners-hero.ts`, trocados a cada `INTERVALO_BANNER_MS` (15 s). A troca é
  lateral, no mesmo espaço, em 1,2 s (`DURACAO_TROCA_MS`); o que sai desaparece antes de o novo chegar.
- Os controles (setas, pontos, pausa) são translúcidos. A troca para sozinha com o mouse sobre o banner.
- Os títulos têm o mesmo tamanho nos quatro; só a imagem varia de altura.
- Cada banner mostra a foto de `image/banners/<id>.jpg` e, se o arquivo faltar, a ilustração vetorial da
  cena (`sep-ilustracao`). O componente é `landing/foto-banner.component.ts`.
- `prefers-reduced-motion` é respeitado.

## 4. Blog

### 4.1 Textos e fotos

- 15 textos em `shared/site-blog.ts`, organizados em quatro categorias (SEP na prática, Para empresas,
  Para investidores, Segurança). O primeiro da lista é o destaque; os demais entram em grade.
- Foto de cada texto em `image/blog/<slug>.jpg`, registrada em `FOTOS_DO_BLOG` (`fotoDe`). Sem foto, a
  ilustração da cena.

### 4.2 Leitura em áudio sincronizada

Componente `shared/ouvir-texto.component.*`, mesma ideia do leitor do projeto Ponte de Liquidez:

- usa a voz do aparelho (Web Speech API), feminina em pt-BR (`shared/voz-pt-br.ts`); **nunca começa
  sozinha**;
- lê o próprio texto da página (`shared/leitura-sincronizada.ts`), e não uma cópia: uma **tarja** cobre o
  bloco em leitura e um **destaque dourado** avança no ritmo da voz (CSS Custom Highlight API,
  `::highlight(sep-lido)`), com a página rolando junto. Onde a API não existe, fica só a tarja;
- o ritmo vem dos eventos de palavra da voz; sem eles, uma estimativa se recalibra a cada evento;
- em texto em colunas, a tarja cobre só o pedaço onde a voz está;
- pausar, continuar, parar e velocidade (0,9x a 1,3x).

### 4.3 Ao terminar a leitura

1. Três segundos depois do fim natural da leitura, a página volta à lista do blog (parar não conta).
2. A lista abre posicionada no texto lido: a borda dele **pisca em branco 4 vezes**.
3. O **próximo texto** ganha borda fina azul que pisca 4 vezes e a página posiciona nele.
4. Se ninguém clicar, rolar, tocar ou digitar em **10 segundos**, a página sobe ao cabeçalho.

O estado viaja pela navegação (`navigateByUrl('/blog', { state: { lido } })`), não pela URL.

### 4.4 Diagramação em colunas

- O texto corrido de cada artigo abre com uma diagramação padrão que **varia pela ordem da lista**: 1ª
  posição em 1 coluna, 2ª em 2, 3ª em 3, 4ª volta a 1, e assim por diante (o texto em destaque conta como
  o primeiro). Função `colunasPadrao` em `blog-artigo.component.ts`.
- Os botões "1 coluna / 2 colunas / 3 colunas" deixam o leitor trocar para o texto aberto. A escolha vale
  só para aquele texto: ao abrir outro, ou reabrir o mesmo, vale o padrão.
- Só o texto corrido muda; título, imagem, resumo e aviso ficam como estão. A página alarga em 2 e 3
  colunas. Abaixo de 1100 px o texto de 3 colunas cai para 2 e o botão de 3 some; abaixo de 760 px os botões
  somem e o texto fica em 1 coluna.

## 5. Navegação

- **Seta de voltar:** botão redondo, no topo e centralizado, nas páginas que usam o `public-shell`. Volta
  uma tela; se a pessoa chegou direto por link (sem tela anterior no app), vai para a página inicial. Em
  tela estreita ganha uma faixa própria abaixo do menu.
- **Rolagem:** `withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })` em `app.config.ts`.
  Página nova abre no topo (antes, abrir um texto lá embaixo na lista abria o texto no meio); o voltar do
  navegador retoma a posição.

## 6. Tours assistidos do site

Arquivo `src/app/core/tour/roteiros/publico.roteiro.ts` (módulo "Site institucional", 14 roteiros, módulo
completo ≈ 31 min). Novos: **Investidores** (11 passos), **Transparência** (9), **Blog e leitura em áudio**
(21), **Perguntas frequentes** (9) e **Antifraude** (7). Atualizados: **Página inicial** (faixa superior) e
**Crédito PJ** (seta de voltar e foto do topo).

Regras mantidas: parte da página inicial e chega pelo menu, pelo rodapé ou pela faixa do topo; não digita
nem grava nada (a busca do FAQ só é mostrada); no blog, o botão **Ouvir não é acionado** para a voz da página
não competir com a narração, e o clique nas colunas é só de interface. Os passos de 3 colunas são pulados
quando o botão está oculto (tela estreita).

Verificação feita no navegador, sem áudio, passo a passo, sem erros de console. O `verificar-tours.js` de
`docs/atualizacao-07102026/` roda os roteiros do sistema; para os públicos, abrir a Ajuda do site (`?` no
cabeçalho).

## 7. Pix e marca

- **Marca do Pix:** `src/app/shared/arte/pix-logo.ts` (contorno 512 × 512 e a cor `#32BCAD`). Usada como
  ícone Lucide `pix` (`core/icons/lucide-icons.ts`), na arte `sep-arte nome="pix"` (menu lateral e título do
  Pix operacional) e na cena de Pix da ilustração do site. Aparece no menu do Pix, no submenu Pix Automático
  de Crédito, no cartão do dashboard, no indicador do backoffice e no painel de Ajuda. O contorno foi
  desenhado à mão; se houver o arquivo do manual de marca do Banco Central, trocar em `pix-logo.ts`.
- **Dynamis SEP:** `shared/arte/sep-logo.component.ts` desenha o símbolo e o nome em duas linhas
  ("Dynamis" sobre "SEP"). Também mudaram o login, o cadastro, os comprovantes de Pix e o nome da parte
  contratante no contrato. **Pendente:** o contrato ainda usa o PNG antigo "SEP"
  (`image/sep_mockup_03_assets/logos/logo_sep_header_completo_claro.png`); precisa do logo "Dynamis SEP" em
  PNG para trocar. O logo no tema claro ainda não foi conferido.

## 8. Fotos de fundo

As páginas Como funciona, Segurança, Sobre, Contato e Transparência e o painel (dashboard) ganharam uma
foto de fundo, escura, só no tema escuro: mixin `fundo-foto` em `public/shared/_site-tema.scss` e bloco
próprio em `dashboard.component.scss`. Arquivos em `image/fundos/` (`como-funciona`, `contato`, `seguranca`,
`sobre`, `transparencia`, `painel`). Os cartões ficam mais translúcidos sobre a foto. Pedido de arquivo
inexistente quebra a imagem: a página só chama o mixin quando o JPG existe.

## 9. Análise de crédito: ajuste do Pix Automático

Em `core/credito/analise-credito.models.ts` (`AjusteScore`, `ajustes`, `bonusPixAutomatico`) e
`mocks/data/analise-credito.store.ts`. Com Pix Automático ativo na proposta, o score soma o bônus (padrão
+30, parâmetro de 0 a 100 editável pelo administrador); a tela mostra a linha do ajuste. Detalhes em
`docs/atualizacao-07102026/ANALISE_DE_CREDITO.md`.

## 10. Como conferir

```
npm start                                   # http://localhost:4200
npx vitest run                              # 881 testes
npx tsc --noEmit -p tsconfig.app.json
npx eslint src && npx stylelint "src/**/*.scss"
```

Roteiro rápido de olho: `/` (banners e faixa), `/blog` → abrir um texto → botões de colunas → seta de
voltar; `/investidores`, `/credito-pj` (foto no topo), `/transparencia` (gráfico ao lado da tabela de
inadimplência) e, logado, o menu **Pix** e o logo no canto superior esquerdo.

## 11. Decisões em aberto

1. Texto da autorização do Banco Central e do número da ouvidoria (Diretoria/jurídico).
2. Tarifas reais (a tabela mostra a estrutura; confirmar valores).
3. Se correspondentes e sub-correspondentes poderão captar credores (marketing), e como isso entra nas
   comissões.
4. Arquivo oficial da marca do Pix e logo Dynamis SEP em PNG para o contrato.
5. Revisão das fotos geradas por IA (rótulo "Imagem ilustrativa" já aplicado).
