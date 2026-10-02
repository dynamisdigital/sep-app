/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

import { Directive, ElementRef, forwardRef, inject, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import {
  TipoMascara,
  aplicarMascara,
  apenasDigitos,
  formatarNumero,
  paraDecimalCanonico,
} from '../../core/format/br-format';

/**
 * Mascara de digitacao para os formatos brasileiros. O input mostra o texto mascarado e o
 * FormControl guarda o valor **canonico** — digitos para documentos e telefone, decimal com
 * ponto para moeda e numero. E o unico jeito de a mascara nao vazar para o corpo da requisicao:
 * o contrato da API pede `^\d{11}$|^\d{14}$` em documento, e antes disso qualquer ponto digitado
 * pelo usuario reprovava no backend.
 *
 * Uso: `<input sepMask="cpf" formControlName="cpf" />`
 */
@Directive({
  selector: 'input[sepMask]',
  host: {
    '(input)': 'aoDigitar($event)',
    '(blur)': 'aoSair()',
    inputmode: 'numeric',
    autocomplete: 'off',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SepMaskDirective),
      multi: true,
    },
  ],
})
export class SepMaskDirective implements ControlValueAccessor {
  readonly sepMask = input.required<TipoMascara>();
  /** Casas decimais do valor canonico quando a mascara e monetaria. */
  readonly sepMaskCasas = input(2);

  private readonly elemento = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private aoMudar: (valor: string) => void = () => undefined;
  private aoTocar: () => void = () => undefined;

  writeValue(valor: string | number | null): void {
    this.elemento.nativeElement.value = this.paraExibicao(valor);
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.aoMudar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.aoTocar = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.elemento.nativeElement.disabled = desabilitado;
  }

  protected aoDigitar(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const mascarado = aplicarMascara(this.sepMask(), input.value);
    input.value = mascarado;
    // O cursor vai para o fim: a mascara reescreve a string inteira, e manter a posicao
    // original deslocaria o texto a cada separador inserido.
    input.setSelectionRange?.(mascarado.length, mascarado.length);
    this.aoMudar(this.paraCanonico(mascarado));
  }

  protected aoSair(): void {
    this.aoTocar();
  }

  /** Valor canonico -> texto mascarado que o usuario le. */
  private paraExibicao(valor: string | number | null): string {
    if (valor === null || valor === undefined || valor === '') return '';
    const tipo = this.sepMask();
    if (tipo === 'moeda') {
      const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
      return Number.isNaN(numero) ? String(valor) : formatarNumero(numero, this.sepMaskCasas());
    }
    if (tipo === 'numero') {
      const numero = typeof valor === 'number' ? valor : Number(valor);
      return Number.isNaN(numero) ? String(valor) : formatarNumero(numero);
    }
    return aplicarMascara(tipo, String(valor));
  }

  /** Texto mascarado -> valor canonico que o FormControl guarda. */
  private paraCanonico(mascarado: string): string {
    const tipo = this.sepMask();
    if (tipo === 'moeda')
      return mascarado ? paraDecimalCanonico(mascarado, this.sepMaskCasas()) : '';
    if (tipo === 'numero') return apenasDigitos(mascarado);
    return apenasDigitos(mascarado);
  }
}
