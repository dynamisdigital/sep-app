import { describe, expect, it } from 'vitest';

import { tetos } from './data/correspondentes-rede.store';

// A operação completa da demonstração (tour "Operação completa nas telas do sistema") depende de o mock
// encadear os registros entre os perfis: o que um cria, o seguinte encontra. Este teste percorre a cadeia
// pelos mesmos endpoints que as telas chamam, na ordem da jornada.

const API = 'http://localhost:8080/api/v1';
const STEP_UP = { 'X-Step-Up-Token': 'token-de-teste' };

async function chamar(
  metodo: string,
  caminho: string,
  corpo?: unknown,
  cabecalhos: Record<string, string> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- corpo de resposta de teste
): Promise<{ status: number; json: any }> {
  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...cabecalhos },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  return { status: resposta.status, json: texto ? JSON.parse(texto) : null };
}

async function entrarComo(email: string): Promise<void> {
  const r = await chamar('POST', '/auth/login', { username: email, password: '123456' });
  expect(r.status, `login de ${email}`).toBe(200);
}

describe('operação completa da demonstração (mock)', () => {
  it('o sub criado pelo correspondente entra no sistema e a cadeia chega até o desembolso', async () => {
    expect((await chamar('POST', '/__demo/reset')).status).toBe(204);

    // 1. Correspondente cria o sub; o sub passa a poder entrar com a conta nova.
    await entrarComo('correspondente@empresa.com');
    const sub = await chamar('POST', '/correspondentes/me/rede/subs', {
      nome: 'Mariana Duarte',
      cpf: '000.000.000-00',
      email: 'mariana.exemplo@empresa.com',
      telefone: '(11) 90000-0000',
      percentuais: tetos().map((t) => ({ produto: t.produto, percentualSub: 0 })),
    });
    expect(sub.status).toBe(201);
    expect(sub.json.status).toBe('PENDENTE');
    await entrarComo('mariana.exemplo@empresa.com');

    // 2. Backoffice cadastra o tomador: o que foi digitado volta no acompanhamento.
    await entrarComo('backoffice@empresa.com');
    const empresa = await chamar('POST', '/onboarding/empresa', {
      cnpj: '11222333000181',
      razaoSocial: 'Padaria Boa Massa Ltda',
    });
    expect(empresa.status).toBe(201);
    const idEmpresa = empresa.json.id as string;
    const doc = new FormData();
    doc.append('tipo', 'CONTRATO_SOCIAL');
    doc.append('arquivo', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'contrato.pdf');
    expect(
      (
        await fetch(`${API}/onboarding/empresa/${idEmpresa}/documentos`, {
          method: 'POST',
          body: doc,
        })
      ).status,
    ).toBe(204);
    expect((await chamar('POST', `/onboarding/empresa/${idEmpresa}/verificar`)).status).toBe(202);
    const aprovada = await chamar('GET', `/onboarding/empresa/${idEmpresa}`);
    expect(aprovada.json.status).toBe('APROVADO_FINAL');
    expect(aprovada.json.dadosEmpresa.razaoSocial).toBe('Padaria Boa Massa Ltda');

    // 3. A proposta nasce desse onboarding e é a primeira da lista (não apaga as anteriores).
    const proposta = await chamar('POST', '/credito/propostas', {
      solicitacaoOnboardingId: idEmpresa,
      tipoOperacao: 'CAPITAL_GIRO',
      valorSolicitado: 6000,
      prazoMeses: 12,
    });
    expect(proposta.status).toBe(201);
    expect(proposta.json.empresaNome).toBe('Padaria Boa Massa Ltda');
    expect(proposta.json.status).toBe('EM_ANALISE');
    const segunda = await chamar('POST', '/credito/propostas', {
      solicitacaoOnboardingId: idEmpresa,
      tipoOperacao: 'CAPITAL_GIRO',
      valorSolicitado: 3000,
      prazoMeses: 6,
    });
    expect(segunda.json.id).not.toBe(proposta.json.id);
    const lista = await chamar('GET', '/credito/propostas');
    expect(lista.json.content[0].id).toBe(segunda.json.id);
    expect(lista.json.content.map((p: { id: string }) => p.id)).toContain(proposta.json.id);

    // 4. O parecer aprova a proposta e gera o contrato e a oportunidade do credor.
    const idProposta = proposta.json.id as string;
    expect(
      (
        await chamar('POST', `/credito/propostas/${idProposta}/analise`, {
          consentimentoTitular: true,
        })
      ).status,
    ).toBe(200);
    const parecer = await chamar('POST', `/credito/propostas/${idProposta}/analise/parecer`, {
      decisao: 'APROVAR',
      justificativa: 'Cadastro aprovado e capacidade de pagamento compatível com o valor pedido.',
    });
    expect(parecer.status).toBe(200);
    expect((await chamar('GET', `/credito/propostas/${idProposta}`)).json.status).toBe('APROVADA');
    const contrato = await chamar('GET', `/contratos/proposta/${idProposta}`);
    expect(contrato.status).toBe(200);
    expect(contrato.json.status).toBe('AGUARDANDO_ACEITE');
    const idContrato = contrato.json.id as string;

    // 5. Credor financia: a proposta aprovada é oferecida para alocação.
    await entrarComo('credora-pf@empresa.com');
    const oportunidades = await chamar('GET', '/credores/me/oportunidades');
    expect(oportunidades.json.map((o: { id: string }) => o.id)).toContain(idProposta);

    // 6. Desembolso Pix recusado com o contrato ainda não assinado; aceite e assinatura liberam.
    await entrarComo('admin@empresa.com');
    const pix = (contratoId: string, chave: string) =>
      chamar(
        'POST',
        '/pix/desembolsos',
        { contratoId, valor: 6000, chavePixDestino: '11222333000181' },
        { ...STEP_UP, 'Idempotency-Key': chave },
      );
    expect((await pix(idContrato, 'chave-antes-da-assinatura')).status).toBe(422);
    const aceite = await chamar('PATCH', `/contratos/${idContrato}/aceite`, undefined, STEP_UP);
    expect(aceite.json.status).toBe('EM_ASSINATURA');
    expect((await chamar('POST', '/__demo/assinatura-concluida')).status).toBe(204);
    expect((await chamar('GET', `/contratos/${idContrato}`)).json.status).toBe('ASSINADO');
    const desembolso = await pix(idContrato, 'chave-depois-da-assinatura');
    expect(desembolso.status).toBe(201);
    expect(desembolso.json.status).toBe('PROCESSANDO');

    // 7. O reinício devolve tudo ao ponto de partida.
    expect((await chamar('POST', '/__demo/reset')).status).toBe(204);
    expect((await chamar('GET', `/credito/propostas/${idProposta}`)).status).toBe(404);
    expect((await chamar('GET', `/contratos/${idContrato}`)).status).toBe(404);
  });
});
