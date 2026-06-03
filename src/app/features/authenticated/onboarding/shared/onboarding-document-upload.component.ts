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
    if (arquivo && arquivo.size > TAMANHO_MAXIMO_BYTES) {
      this.erro.set('Arquivo excede o limite de 10MB.');
      this.arquivo.set(null);
      input.value = ''; // permite reselecionar o mesmo arquivo apos corrigir
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
