# Imagens do site Dynamis SEP: pedidos prontos para gerar as fotos

**Data:** 09/10/2026
**Para quê:** trocar as ilustrações dos três banners da página inicial e dos textos do blog por fotos de
pessoas reais no trabalho (quem toma crédito) e de quem financia (investidores).

## O que já está pronto no sistema

O site está preparado para receber as fotos. Enquanto elas não existem, ele mostra a ilustração vetorial da
cena, e **nunca faz pedido de arquivo que não existe**. Para colocar uma foto no ar:

1. Salve o arquivo na pasta indicada, com o nome exato (JPG).
2. Inclua o nome na lista do código, em um só lugar:
   - banners: `FOTOS_DOS_BANNERS` em `src/app/features/public/landing/banners-hero.ts`;
   - blog: `FOTOS_DO_BLOG` em `src/app/features/public/shared/site-blog.ts`.
3. Pronto: a foto aparece no lugar da ilustração, com o rótulo "Imagem ilustrativa" nos banners.

| Onde | Pasta | Nome do arquivo | Tamanho |
|---|---|---|---|
| Banner da página inicial | `image/banners/` | `plataforma.jpg`, `investidores.jpg`, `empresas.jpg`, `pessoas-fisicas.jpg` | 1800 x 1200 (3:2) |
| Texto do blog | `image/blog/` | `<endereço do texto>.jpg (ver tabela do blog)` | 1600 x 900 (16:9) |

**Composição:** deixe as pessoas no centro e uma margem de ~10% em volta, porque a moldura corta as bordas
conforme a largura da janela. Sem texto, logotipo, marca ou rosto cortado na imagem. Peso final: até 400 KB
por foto (comprimir em JPG qualidade 80).

## Estilo único para todas as fotos

> Fotografia documental brasileira, luz natural de manhã ou fim de tarde, cores quentes e naturais, foco
> suave no fundo, profundidade de campo rasa, pessoas reais em situação de trabalho (não posadas para
> a câmera), enquadramento na altura dos olhos, 35 mm, sem filtro exagerado, sem aparência de banco de
> imagens genérico.

**Prompt negativo (acrescentar a todos):** texto, letras, logotipo, marca, nota de dinheiro em pilhas,
dinheiro voando, sinal de cifrão, gráfico de alta com seta, mãos deformadas, dedos extras, rosto deformado,
terno e gravata caricatos, aperto de mão posado, aparência de ilustração 3D, crianças.

## Banners da página inicial

### 1. `plataforma.jpg`: empreendedora e investidor se encontrando pela plataforma
> Dona de uma padaria de bairro, mulher de cerca de 45 anos com avental, e um investidor de cerca de 50
> anos em camisa social sem gravata, conversando com um tablet sobre o balcão de uma padaria cheia de
> pães frescos, os dois sorrindo discretamente, expressão de confiança. Padaria brasileira simples e
> acolhedora, luz da manhã entrando pela vitrine. [estilo único]

### 2. `investidores.jpg`: quem financia analisando o risco
> Mulher brasileira de cerca de 40 anos, investidora, sentada em um home office organizado, lendo com
> atenção a tela de um notebook (a tela fora de foco, sem texto legível), caderno de anotações ao lado,
> xícara de café, luz natural da janela. Expressão concentrada e tranquila, de quem decide com calma.
> [estilo único]

### 3. `empresas.jpg`: dono de comércio acompanhando as parcelas
> Homem brasileiro de cerca de 50 anos, dono de uma pequena padaria, atrás do balcão, de avental, com
> farinha nas mãos, olhando para o celular que segura com a outra mão, sorrindo aliviado. Ao fundo, o forno
> e prateleiras de pães desfocados. Cena do cotidiano de um pequeno negócio. [estilo único]

### 4. `pessoas-fisicas.jpg`: pessoa física pedindo crédito
> Mulher brasileira de cerca de 35 anos, trabalhadora autônoma (manicure ou costureira), em seu espaço de
> trabalho em casa, olhando o celular com expressão tranquila enquanto organiza as contas do mês em um
> caderno, luz natural de uma janela. Ambiente simples e organizado. [estilo único]

**Rótulo:** foto gerada por IA com pessoas deve ir com "Imagem ilustrativa" (o componente já mostra). Nunca
legendar como cliente real, depoimento ou "caso de sucesso".

## Textos do blog (16:9)

Cada pedido usa o [estilo único] e o prompt negativo acima. O nome do arquivo é o endereço do texto.

| Arquivo | Cena a gerar |
|---|---|
| `o-que-e-uma-sep.jpg` | Dois pequenos empresários (uma lojista e um dono de oficina) conversando com um consultor em uma mesa simples, com notebook e papéis, ambiente de escritório de bairro |
| `como-funciona-a-sep-passo-a-passo.jpg` | Empresária em uma loja de roupas, tablet na mão, acompanhando o pedido de crédito, manequins desfocados ao fundo |
| `sep-nao-e-banco-nem-investimento-garantido.jpg` | Homem de 55 anos em casa, na sala, lendo atentamente documentos e a tela do celular, expressão cuidadosa, sem sorrir |
| `recursos-segregados-onde-fica-o-dinheiro.jpg` | Mulher em um escritório contábil conferindo extratos em duas telas, luz fria de escritório, organização e atenção |
| `quem-pode-financiar-numa-sep-e-o-limite-por-tomador.jpg` | Grupo diverso de três pessoas (uma jovem, um senhor, uma mulher de meia-idade) em volta de uma mesa, olhando um notebook, em uma sala de coworking |
| `score-explicado-analise-de-credito-em-uma-sep.jpg` | Analista de crédito mulher, de 35 anos, revendo indicadores em duas telas em um escritório moderno, expressão analítica |
| `classificacao-de-risco-a-a-e-como-ler.jpg` | Investidor de 45 anos em uma cafeteria, notebook aberto, comparando informações com uma caneta na mão |
| `diversificar-em-emprestimo-entre-pessoas.jpg` | Mãos de uma pessoa organizando pequenas pilhas de papel e cartões de cores diferentes sobre uma mesa de madeira, vista de cima (sem dinheiro) |
| `como-preparar-a-empresa-para-pedir-capital-de-giro.jpg` | Dono de uma pequena oficina mecânica organizando pastas e notas fiscais em uma bancada, oficina ao fundo |
| `custo-efetivo-total-como-comparar-uma-proposta.jpg` | Casal de comerciantes na loja, comparando duas propostas impressas e uma calculadora sobre o balcão |
| `pix-automatico-nas-parcelas-o-que-muda.jpg` | Mulher de 38 anos, dona de um salão de beleza, aprovando algo no celular entre uma cliente e outra, espelho e cadeiras ao fundo |
| `inadimplencia-o-que-e-e-como-a-sep-cobra.jpg` | Equipe de atendimento (duas pessoas) em um escritório, uma delas ao telefone com tom cordial, a outra olhando um painel (sem texto legível) |
| `kyc-kyb-e-pld-por-que-pedimos-tantos-dados.jpg` | Mulher segurando o documento de identidade ao lado do rosto diante do celular, em um ambiente doméstico, fazendo a verificação |
| `golpe-do-emprestimo-com-pagamento-antecipado.jpg` | Homem de meia-idade desconfiado ao atender uma ligação, olhando para o celular com o cenho franzido, em uma cozinha simples |
| `lgpd-e-credito-seus-direitos.jpg` | Pessoa jovem lendo as configurações de privacidade no celular, sentada em um sofá, luz suave de fim de tarde |

## Cuidados com imagens geradas por IA

1. **Rótulo de imagem ilustrativa** em toda foto de pessoa, nunca apresentada como cliente ou depoimento.
2. **Sem rosto de pessoa real ou famosa:** não usar nomes de pessoas nos pedidos nem fotos de referência.
3. **Sem marcas e logotipos** de bancos, bureaus, redes de padaria ou meios de pagamento.
4. **Sem promessa visual:** nada de dinheiro em pilhas, setas de alta ou imagens que sugiram enriquecimento
   rápido, porque o aviso de risco do texto não resiste a uma imagem que diga o contrário.
5. **Conferir cada imagem** antes de publicar: mãos, dedos, texto ilegível em telas e crachás, rostos.
6. **Guardar o pedido** (prompt e ferramenta usada) junto do arquivo, para repetir a imagem se for preciso.
7. **Direitos de uso:** conferir os termos da ferramenta de geração para uso comercial antes de publicar.
8. **Acessibilidade:** o texto alternativo de cada imagem já está no código e descreve a cena.
