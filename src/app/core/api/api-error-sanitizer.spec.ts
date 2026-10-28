import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { extrairMensagemErroSegura } from './api-error-sanitizer';

describe('extrairMensagemErroSegura (SEC-07)', () => {
  it('retorna a mensagem de erro funcional da API quando amigavel (ex: 400, 404, 409)', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { message: 'Chave Pix inválida ou já utilizada.' },
    });
    expect(extrairMensagemErroSegura(err, 'Erro padrão')).toBe(
      'Chave Pix inválida ou já utilizada.',
    );
  });

  it('retorna o fallback padrao se a API nao devolver corpo com message', () => {
    const err = new HttpErrorResponse({ status: 500, error: null });
    expect(extrairMensagemErroSegura(err, 'Erro padrão de fallback')).toBe(
      'Erro padrão de fallback',
    );
  });

  it('bloqueia e substitui vazamento de stacktrace e SQL em erros 500', () => {
    const errSql = new HttpErrorResponse({
      status: 500,
      error: { message: 'org.postgresql.util.PSQLException: Connection refused' },
    });
    expect(extrairMensagemErroSegura(errSql, 'Não foi possível completar a operação.')).toBe(
      'Não foi possível completar a operação.',
    );

    const errStack = new HttpErrorResponse({
      status: 500,
      error: { message: 'NullPointerException at com.sep.service.PixService.execute(line 42)' },
    });
    expect(extrairMensagemErroSegura(errStack, 'Falha no servidor.')).toBe('Falha no servidor.');
  });

  it('permite mensagem amigavel mesmo em status 500 se nao contiver termos tecnicos sensiveis', () => {
    const errAmigavel = new HttpErrorResponse({
      status: 500,
      error: { message: 'Serviço temporariamente indisponível. Tente novamente mais tarde.' },
    });
    expect(extrairMensagemErroSegura(errAmigavel, 'Erro padrão')).toBe(
      'Serviço temporariamente indisponível. Tente novamente mais tarde.',
    );
  });
});
