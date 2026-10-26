import { computed, Injectable, signal } from '@angular/core';
import { experienciasComFotos } from './demonstracao-apresentacao';
import { VersaoFotos } from './demonstracao-imagens';

const CHAVE = 'SEP_DEMONSTRACAO_FOTOS';

function preferencia(): VersaoFotos {
  try {
    return localStorage.getItem(CHAVE) === 'originais' ? 'originais' : 'telas-escuras';
  } catch {
    return 'telas-escuras';
  }
}

@Injectable({ providedIn: 'root' })
export class DemonstracaoFotosService {
  readonly versao = signal<VersaoFotos>(preferencia());
  readonly experiencias = computed(() => experienciasComFotos(this.versao()));
  readonly painel = computed(() => {
    const experiencias = this.experiencias();
    return [...experiencias, ...experiencias, ...experiencias];
  });

  mudar(valor: string): void {
    if (valor !== 'originais' && valor !== 'telas-escuras') return;
    this.versao.set(valor);
    try {
      localStorage.setItem(CHAVE, valor);
    } catch {
      // A comparação funciona também sem armazenamento disponível.
    }
  }
}
