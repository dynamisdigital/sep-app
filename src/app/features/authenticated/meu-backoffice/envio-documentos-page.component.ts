import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  EnvioDocumentosResponse,
  VinculoResponse,
} from '../../../core/correspondentes/correspondentes.models';
import { CorrespondentesService } from '../../../core/correspondentes/correspondentes.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import { formatarData, ROTULO_ENVIO, TOM_ENVIO } from '../correspondentes/correspondentes.format';

const TIPOS_DOCUMENTO = [
  'Documento de identidade',
  'Comprovante de residência',
  'Comprovante de renda',
  'Contrato social',
  'Outro',
];

// Envio de documentos (CORRESPONDENTE): o correspondente envia os documentos do cliente e atesta
// que conferem com os originais. O envio nasce "em validacao" e entra na fila do backoffice, que
// decide. O correspondente nao valida nem decide credito. Nesta fase o arquivo nao trafega: so o
// nome e o tipo, porque o upload real depende do contrato de armazenamento do backend.
@Component({
  selector: 'sep-envio-documentos-page',
  imports: [OperationalShellComponent, RouterLink, FormsModule],
  templateUrl: './envio-documentos-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvioDocumentosPageComponent implements OnInit {
  private readonly service = inject(CorrespondentesService);

  protected readonly envios = signal<EnvioDocumentosResponse[]>([]);
  protected readonly clientes = signal<VinculoResponse[]>([]);
  protected readonly carregando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly tipos = TIPOS_DOCUMENTO;
  protected readonly rotulo = ROTULO_ENVIO;
  protected readonly tom = TOM_ENVIO;
  protected readonly data = formatarData;

  protected clienteNome = '';
  protected tipo = TIPOS_DOCUMENTO[0];
  protected nomeArquivo = '';
  protected atesto = false;

  ngOnInit(): void {
    this.carregar();
    this.service.listarMinhaBase().subscribe({
      next: (b) => this.clientes.set(b.filter((v) => v.status === 'VIGENTE')),
    });
  }

  private carregar(): void {
    this.service.listarMeusEnvios().subscribe({
      next: (e) => {
        this.envios.set(e);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar os seus envios.');
        this.carregando.set(false);
      },
    });
  }

  protected escolherArquivo(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0];
    this.nomeArquivo = arquivo?.name ?? '';
  }

  protected get podeEnviar(): boolean {
    return !!this.clienteNome && !!this.nomeArquivo && this.atesto && !this.enviando();
  }

  protected enviar(): void {
    if (!this.podeEnviar) return;
    this.enviando.set(true);
    this.erro.set(null);
    this.aviso.set(null);
    this.service
      .enviarDocumentos({
        clienteNome: this.clienteNome,
        documentos: [{ tipo: this.tipo, nomeArquivo: this.nomeArquivo }],
        atestoConferencia: this.atesto,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.aviso.set(
            'Documentos enviados e sinalizados como formalizados. Entraram na fila do backoffice.',
          );
          this.nomeArquivo = '';
          this.atesto = false;
          this.carregar();
        },
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          this.erro.set(e.error?.message ?? 'Não foi possível enviar os documentos.');
        },
      });
  }
}
