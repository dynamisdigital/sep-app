import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { PublicShellComponent } from '../shared/public-shell.component';
import { SepMaskDirective } from '../../../shared/forms/sep-mask.directive';
import { CONTATO_SEP, MAPA_EMBED, MAPA_LINK } from '../shared/site-conteudo';

/** Assuntos do canal, os mesmos do site institucional do grupo. */
const ASSUNTOS = ['Comercial', 'Suporte', 'Privacidade', 'Outros'] as const;
type Assunto = (typeof ASSUNTOS)[number];

@Component({
  selector: 'sep-contato-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    PublicShellComponent,
    SepMaskDirective,
  ],
  templateUrl: './contato.component.html',
  styleUrl: './contato.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContatoComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  protected readonly contato = CONTATO_SEP;
  protected readonly mapaEmbed = MAPA_EMBED;
  protected readonly mapaLink = MAPA_LINK;
  protected readonly assuntos = ASSUNTOS;

  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);

  /**
   * O mapa só entra no DOM quando entra na tela. É o que evita uma requisição ao Google para quem
   * nunca rola até ele, e mantém o carregamento inicial da página independente de um recurso
   * externo.
   */
  protected readonly mapaVisivel = signal(false);
  /** O navegador não observa interseção: o mapa passa a depender de um clique. */
  protected readonly mapaSemObservador = signal(false);
  private readonly alvoMapa = viewChild<ElementRef<HTMLElement>>('alvoMapa');
  private observador: IntersectionObserver | null = null;

  constructor() {
    // `?assunto=Suporte` vem dos links de ajuda do app e do "Esqueceu sua senha?" do login.
    const assunto = this.route.snapshot.queryParamMap.get('assunto');
    if (ASSUNTOS.includes(assunto as Assunto)) {
      this.form.controls.assunto.setValue(assunto as Assunto);
    }

    effect(() => {
      const alvo = this.alvoMapa()?.nativeElement;
      if (!alvo || this.mapaVisivel() || this.observador) return;
      // Onde a API não existe ou é apenas um esqueleto, o mapa não entra sozinho: fica o
      // marcador com o botão "Carregar mapa", e quem quiser ver decide.
      try {
        const observador = new IntersectionObserver((entradas) => {
          if (entradas.some((e) => e.isIntersecting)) {
            this.mapaVisivel.set(true);
            this.observador?.disconnect();
            this.observador = null;
          }
        });
        observador.observe(alvo);
        this.observador = observador;
      } catch {
        this.mapaSemObservador.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }

  protected carregarMapa(): void {
    this.mapaVisivel.set(true);
  }

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    // A máscara guarda só os dígitos; o telefone é opcional, mas se vier tem de estar completo.
    telefone: ['', [Validators.pattern(/^\d{10,11}$/)]],
    assunto: ['Comercial' as Assunto, [Validators.required]],
    mensagem: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
    consentimento: [false, [Validators.requiredTrue]],
  });

  /**
   * Não há endpoint de contato no backend: o formulário valida tudo, mas o envio ainda não sai
   * daqui. Declarar isso é melhor do que simular um "mensagem enviada" que ninguém recebeu.
   */
  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    window.setTimeout(() => {
      this.enviando.set(false);
      this.enviado.set(true);
    }, 400);
  }

  protected novaMensagem(): void {
    this.enviado.set(false);
    this.form.reset({ assunto: 'Comercial', consentimento: false });
  }

  /** Abre o cliente de e-mail com assunto e corpo já preenchidos pelo que foi digitado. */
  protected get mailto(): string {
    const { nome, email, telefone, assunto, mensagem } = this.form.getRawValue();
    const corpo = [
      `Nome: ${nome}`,
      `E-mail: ${email}`,
      telefone ? `Telefone: ${telefone}` : null,
      '',
      mensagem,
    ]
      .filter((linha) => linha !== null)
      .join('\n');
    return `mailto:${CONTATO_SEP.email}?subject=${encodeURIComponent(
      `[SEP] ${assunto}`,
    )}&body=${encodeURIComponent(corpo)}`;
  }
}
