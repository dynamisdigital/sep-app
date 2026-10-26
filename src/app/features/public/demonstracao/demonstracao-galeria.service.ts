import { Injectable } from '@angular/core';

/** Mantém o ponto da galeria durante a navegação entre as prévias. */
@Injectable({ providedIn: 'root' })
export class DemonstracaoGaleriaService {
  estado = { posicao: 6, pausado: false };
}
