/**
 * Fotos de fundo que entram por `background: url()` no CSS de componentes carregados sob demanda:
 * o navegador só as pede depois de abrir a rota e aplicar o estilo, e por isso apareciam com atraso.
 * Pedi-las em segundo plano, assim que o app sobe, deixa o arquivo no cache quando a tela abre.
 */
export const IMAGENS_PRECARREGADAS: readonly string[] = [
  '/image/fundos/painel.jpg',
  '/image/fundos/contato.jpg',
  '/image/fundos/como-funciona.jpg',
  '/image/fundos/seguranca.jpg',
  '/image/fundos/sobre.jpg',
  '/image/fundos/transparencia.jpg',
];

export function precarregarImagens(urls: readonly string[] = IMAGENS_PRECARREGADAS): void {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;

  const carregar = (): void => {
    for (const url of urls) {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    }
  };

  // Espera o navegador ficar ocioso para não competir com o carregamento da tela inicial.
  const ocioso = (window as { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback;
  if (ocioso) ocioso.call(window, carregar);
  else window.setTimeout(carregar, 200);
}
