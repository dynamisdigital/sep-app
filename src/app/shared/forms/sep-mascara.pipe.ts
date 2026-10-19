import { Pipe, PipeTransform } from '@angular/core';

import { TipoMascara, aplicarMascara } from '../../core/format/br-format';

/**
 * Mascara de exibicao para os formatos brasileiros: `{{ cnpj | sepMascara: 'cnpj' }}`. A diretiva
 * `sepMask` cuida do campo digitavel; este pipe cuida do texto lido, para o dado canonico (so
 * digitos) que vem da API aparecer igual ao que o operador digitaria.
 *
 * Valor vazio sai vazio, e valor ja ocultado pelo backend ("***.123.456-**") passa intacto.
 */
@Pipe({ name: 'sepMascara' })
export class SepMascaraPipe implements PipeTransform {
  transform(valor: string | number | null | undefined, tipo: TipoMascara): string {
    if (valor === null || valor === undefined || valor === '') return '';
    const texto = String(valor);
    if (/[*•xX]/.test(texto)) return texto;
    return aplicarMascara(tipo, texto) || texto;
  }
}
