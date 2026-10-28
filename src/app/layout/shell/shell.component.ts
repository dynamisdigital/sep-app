import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

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
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly sidenavCollapsed = signal(false);
  protected readonly immersive = signal(false);

  constructor() {
    this.updateImmersiveMode();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.updateImmersiveMode();
    });
  }

  toggleSidenav(): void {
    this.sidenavCollapsed.update((v) => !v);
  }

  private updateImmersiveMode(): void {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.immersive.set(route.snapshot?.data?.['immersive'] === true);
  }
}
