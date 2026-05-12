import { describe, expect, it, beforeEach } from 'vitest';
import { HttpHandlerFn, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { clientChannelInterceptor } from './client-channel.interceptor';

describe('clientChannelInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
  });

  function captureNext() {
    const state: { lastReq: HttpRequest<unknown> | null } = { lastReq: null };
    const handler: HttpHandlerFn = (req) => {
      state.lastReq = req;
      return of(new HttpResponse({ status: 200 }));
    };
    return { state, handler };
  }

  it('anexa X-Client-Channel=WEB e withCredentials em chamadas para a API', () => {
    const req = new HttpRequest('POST', `${environment.apiBaseUrl}/auth/refresh`, {});
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      clientChannelInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Client-Channel')).toBe('WEB');
    expect(state.lastReq?.withCredentials).toBe(true);
  });

  it('ignora URLs fora da API (CDNs, analytics, etc.)', () => {
    const req = new HttpRequest('GET', 'https://outro-host.example.com/coisa');
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      clientChannelInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Client-Channel')).toBe(false);
    expect(state.lastReq?.withCredentials).toBe(false);
  });
});
