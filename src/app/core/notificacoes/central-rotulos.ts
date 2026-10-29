import { ContagemNaoLidas } from './notificacoes-nao-lidas.store';

// Rotulo acessivel do acesso a central: o numero sozinho nao diz do que e (criterio 4 da spec 127).
export function rotuloDaCentral(contagem: ContagemNaoLidas | null): string {
  switch (contagem?.situacao) {
    case 'conhecida':
      if (contagem.naoLidas === 0) {
        return 'Notificações, nenhuma não lida';
      }
      return contagem.naoLidas === 1
        ? 'Notificações, 1 não lida'
        : `Notificações, ${contagem.naoLidas} não lidas`;
    case 'indisponivel':
      return 'Notificações, contagem de não lidas indisponível';
    default:
      return 'Notificações, carregando contagem de não lidas';
  }
}

// Marcador visual, escondido do leitor de tela (o rotulo ja diz tudo). Zero e carregando nao marcam;
// indisponivel marca `?` para nao parecer zero.
export function marcadorDaCentral(contagem: ContagemNaoLidas | null): string | null {
  if (contagem?.situacao === 'indisponivel') {
    return '?';
  }
  if (contagem?.situacao !== 'conhecida' || contagem.naoLidas === 0) {
    return null;
  }
  return contagem.naoLidas > 99 ? '99+' : String(contagem.naoLidas);
}
