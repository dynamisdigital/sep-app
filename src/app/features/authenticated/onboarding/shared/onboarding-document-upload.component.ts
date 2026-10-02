import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { TipoDocumento } from '../../../../core/api/api.models';

const EXTENSOES_PERMITIDAS = ['.pdf', '.jpg', '.jpeg', '.png'];
const EXTENSOES_PERIGOSAS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.svg',
  '.html',
  '.htm',
  '.js',
  '.vbs',
  '.msi',
  '.ps1',
  '.jar',
];
const MIMES_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];
const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

// Bloco reutilizavel de envio de documento: selecao de tipo, escolha de arquivo
// com limite visual de 10MB e botao de envio. Nao chama a API nem retem o arquivo
// alem do necessario: emite (tipo, arquivo) e a pagina orquestra o upload HTTP.
@Component({
  selector: 'sep-onboarding-document-upload',
  imports: [],
  templateUrl: './onboarding-document-upload.component.html',
  styleUrl: './onboarding-document-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingDocumentUploadComponent {
  readonly tipos = input.required<TipoDocumento[]>();
  readonly enviando = input(false);
  readonly enviar = output<{ tipo: TipoDocumento; arquivo: File }>();

  // Default acompanha a lista recebida, mas o usuario pode trocar.
  protected readonly tipoSelecionado = linkedSignal<TipoDocumento>(() => this.tipos()[0]);
  protected readonly arquivo = signal<File | null>(null);
  protected readonly erro = signal<string | null>(null);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  selecionarTipo(tipo: TipoDocumento): void {
    this.tipoSelecionado.set(tipo);
  }

  selecionarArquivo(event: Event): void {
    this.erro.set(null);
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    if (!arquivo) {
      this.arquivo.set(null);
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      this.erro.set('Arquivo excede o limite de 10MB.');
      this.arquivo.set(null);
      input.value = ''; // permite reselecionar o mesmo arquivo apos corrigir
      return;
    }

    // Hardening defensivo de upload no frontend (SEC-06 / OWASP File Upload)
    const nomeMinusculo = arquivo.name.toLowerCase();
    const indicePonto = nomeMinusculo.lastIndexOf('.');
    if (indicePonto === -1) {
      this.erro.set('Arquivo sem extensão. Formatos aceitos: PDF, JPEG ou PNG.');
      this.arquivo.set(null);
      input.value = '';
      return;
    }

    const extensao = nomeMinusculo.slice(indicePonto);
    if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
      this.erro.set('Formato não permitido. Envie documentos em PDF, JPEG ou PNG.');
      this.arquivo.set(null);
      input.value = '';
      return;
    }

    // Bloqueio de dupla extensão ou executáveis camuflados (ex: doc.exe.pdf, doc.svg.png)
    const partes = nomeMinusculo.split('.');
    if (partes.length > 2) {
      const extensaoSecundaria = `.${partes[partes.length - 2]}`;
      if (EXTENSOES_PERIGOSAS.includes(extensaoSecundaria)) {
        this.erro.set('Nome de arquivo inválido ou suspeito detectado.');
        this.arquivo.set(null);
        input.value = '';
        return;
      }
    }

    // Verificação defensiva de MIME type quando informado pelo navegador
    if (arquivo.type && !MIMES_PERMITIDOS.includes(arquivo.type)) {
      this.erro.set('Tipo de arquivo não permitido. Apenas PDF, JPEG e PNG são aceitos.');
      this.arquivo.set(null);
      input.value = '';
      return;
    }

    this.arquivo.set(arquivo);
  }

  emitir(): void {
    const arquivo = this.arquivo();
    if (!arquivo) {
      this.erro.set('Selecione um arquivo antes de enviar.');
      return;
    }
    this.enviar.emit({ tipo: this.tipoSelecionado(), arquivo });
  }

  // Chamado pela pagina apos upload bem-sucedido para limpar o formulario.
  limpar(): void {
    this.arquivo.set(null);
    const ref = this.fileInput();
    if (ref) {
      ref.nativeElement.value = '';
    }
  }
}
