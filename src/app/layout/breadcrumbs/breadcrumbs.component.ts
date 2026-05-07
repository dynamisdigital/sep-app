import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

interface Crumb {
  label: string;
  url: string | null;
}

@Component({
  selector: 'sep-breadcrumbs',
  imports: [RouterLink],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly crumbs = computed<Crumb[]>(() => {
    // Re-roda quando URL muda
    this.currentUrl();

    const trail: Crumb[] = [{ label: 'Inicio', url: '/app/dashboard' }];
    let current = this.route.firstChild;
    let path = '';

    while (current) {
      const segment = current.snapshot.url.map((u) => u.path).join('/');
      if (segment) {
        path += `/${segment}`;
      }
      const breadcrumb = current.snapshot.data['breadcrumb'];
      if (breadcrumb) {
        trail.push({ label: breadcrumb, url: path || null });
      }
      current = current.firstChild;
    }

    return trail;
  });
}
