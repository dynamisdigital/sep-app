import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BreadcrumbsComponent } from '../breadcrumbs/breadcrumbs.component';
import { HeaderComponent } from '../header/header.component';
import { SidenavComponent } from '../sidenav/sidenav.component';

@Component({
  selector: 'sep-shell',
  imports: [RouterOutlet, HeaderComponent, SidenavComponent, BreadcrumbsComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  protected readonly sidenavCollapsed = signal(false);

  toggleSidenav(): void {
    this.sidenavCollapsed.update((v) => !v);
  }
}
