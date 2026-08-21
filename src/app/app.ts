import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AvisoCookiesComponent } from './layout/aviso-cookies/aviso-cookies.component';

@Component({
  selector: 'sep-root',
  imports: [RouterOutlet, AvisoCookiesComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('sep-app');
}
