# Fotografias com telas do Dynamis SEP — 24/10/2026

11 fotografias receberam montagens com capturas reais do sistema no tema escuro e dados fictícios. Foram editadas somente fotografias com a face iluminada de monitores, notebooks ou celular visível. Fotos com documentos, pessoas ou aparelhos vistos por trás continuam originais.

## Comparar e reverter

No topo de `/demonstracao` e de cada prévia, use **Imagens → Fotos originais**. A escolha muda as imagens imediatamente e fica salva neste navegador, inclusive ao navegar entre cenários e recarregar a página. **Telas do sistema** reaplica as versões editadas. Nenhum arquivo original é sobrescrito.

- Originais: `image/demonstracao/assets/`.
- Versões novas: esta pasta, com os mesmos nomes relativos, em PNG e WebP.
- Troca por imagem: a lista `FOTOS_EDITADAS` em `src/app/features/public/demonstracao/demonstracao-imagens.ts` permite retirar uma fotografia da edição sem afetar as outras.
- As imagens compartilhadas pela Operação completa e pelo blog também usam o mapeamento central. A preferência visual do seletor se aplica às páginas de demonstração; o blog usa as versões editadas por padrão.

## Origem e preservação

- Ferramenta de edição: `image_gen` integrado, com uma edição individual por fotografia.
- Capturas reais: `output/imagegen/dynamis-telas/referencias/`, produzidas por `node scripts/demonstracao/capturar-telas-escuras.cjs`.
- Instruções exatas de edição: [prompts.json](prompts.json).
- Relação das 11 fotos e referências: [edicoes.json](edicoes.json).
- Integridade dos 64 arquivos originais PNG/WebP: [originais-sha256.json](originais-sha256.json).
- Empacotamento das novas versões: `node scripts/demonstracao/empacotar-imagens.cjs`. O script gera PNG/WebP e normaliza a proporção; remove apenas o letterbox branco introduzido pelo gerador no banner panorâmico do Backoffice. Ele não escreve em `assets/`.

As montagens são ilustrativas: a integração por geração de imagem pode alterar detalhes pequenos e letras muito reduzidas ou inclinadas. As capturas de referência permanecem disponíveis para conferência.

## Ajuste de 25/10/2026 — banner do Backoffice

As duas telas do banner foram refeitas (esquerda: Fila operacional; direita: Reprocessos do Backoffice) com capturas reais em 2x, encaixadas nas bordas físicas dos monitores, (`scripts/demonstracao/refazer-telas-backoffice.py`) e a planta que cobria o monitor da direita foi retirada. O banner agora parte da foto original com as telas claras (`assets/backoffice/`, intacta), com os vértices medidos na moldura de cada monitor, e tem 3860 px de largura (2x). As bordas brancas das demais fotos estão tratadas em `versoes/bordas-corrigidas/`.
