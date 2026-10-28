import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { importProvidersFrom, Provider, Type } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { CredoresEscrowService } from '../../../../core/credores/credores-escrow.service';
import { ContaEscrowResponse } from '../../../../core/credores/credores-escrow.models';

// Apoio dos testes das telas de escrow: renderiza o componente com o service substituido.

export const CONTA: ContaEscrowResponse = {
  credorId: 'credor-1',
  banco: 'Banco parceiro (BaaS)',
  agencia: '0001',
  conta: '123456-7',
  saldo: {
    disponivel: 1500,
    reservado: 4625,
    emOperacao: 6000,
    totalCustodiado: 6125,
    patrimonio: 12125,
  },
};

export function erroHttp(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { message: 'erro de teste' } });
}

export async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
  fixture.detectChanges();
}

export function renderizar<T>(
  componente: Type<T>,
  // Mock parcial: os fixtures usam literais que o TS alarga para `string`, entao o tipo do service
  // real nao e satisfeito e nem precisa ser.
  service: object,
  extras: Provider[] = [],
) {
  return render(componente, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: CredoresEscrowService, useValue: service },
      ...extras,
    ],
  });
}
