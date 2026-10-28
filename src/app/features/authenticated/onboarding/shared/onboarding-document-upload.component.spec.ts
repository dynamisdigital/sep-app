import { fireEvent, render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';

import { OnboardingDocumentUploadComponent } from './onboarding-document-upload.component';

const TIPOS = ['RG', 'CNH'] as const;

function arquivoFalso(nome = 'doc.pdf'): File {
  return new File(['conteudo'], nome, { type: 'application/pdf' });
}

describe('OnboardingDocumentUploadComponent', () => {
  it('lista os tipos recebidos e mantem o botao desabilitado sem arquivo', async () => {
    await render(OnboardingDocumentUploadComponent, { inputs: { tipos: [...TIPOS] } });

    expect(screen.getByText('RG')).toBeTruthy();
    expect(screen.getByText('CNH')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar documento' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('emite (tipo, arquivo) ao enviar um arquivo valido', async () => {
    const enviar = vi.fn();
    const { fixture } = await render(OnboardingDocumentUploadComponent, {
      inputs: { tipos: [...TIPOS] },
    });
    fixture.componentInstance.enviar.subscribe(enviar);

    const arquivo = arquivoFalso();
    fireEvent.change(screen.getByLabelText(/Arquivo/), { target: { files: [arquivo] } });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar documento' }));

    expect(enviar).toHaveBeenCalledWith({ tipo: 'RG', arquivo });
  });

  it('rejeita arquivo acima de 10MB e nao emite', async () => {
    const enviar = vi.fn();
    const { fixture } = await render(OnboardingDocumentUploadComponent, {
      inputs: { tipos: [...TIPOS] },
    });
    fixture.componentInstance.enviar.subscribe(enviar);

    const grande = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(screen.getByLabelText(/Arquivo/), { target: { files: [grande] } });
    fixture.detectChanges();

    expect(screen.getByText('Arquivo excede o limite de 10MB.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar documento' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(enviar).not.toHaveBeenCalled();
  });

  it('rejeita extensao nao permitida como .exe ou .svg (SEC-06)', async () => {
    const { fixture } = await render(OnboardingDocumentUploadComponent, {
      inputs: { tipos: [...TIPOS] },
    });

    const executavel = new File(['echo evil'], 'malware.exe', { type: 'application/x-msdownload' });
    fireEvent.change(screen.getByLabelText(/Arquivo/), { target: { files: [executavel] } });
    fixture.detectChanges();

    expect(screen.getByText(/Formato não permitido/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar documento' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('rejeita arquivo com dupla extensao perigosa (ex: documento.exe.pdf) (SEC-06)', async () => {
    const { fixture } = await render(OnboardingDocumentUploadComponent, {
      inputs: { tipos: [...TIPOS] },
    });

    const camuflado = new File(['fake pdf'], 'relatorio.exe.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Arquivo/), { target: { files: [camuflado] } });
    fixture.detectChanges();

    expect(screen.getByText(/Nome de arquivo inválido ou suspeito detectado/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar documento' })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
