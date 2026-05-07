import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

type DesignSystemFilter = 'all' | 'apple' | 'notion';

@Component({
  selector: 'sep-design-system-showcase',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './showcase.component.html',
  styleUrl: './showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseComponent {
  private readonly route = inject(ActivatedRoute);

  private readonly systemParam = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('system'))),
    { initialValue: null },
  );

  protected readonly activeSystem = computed<DesignSystemFilter>(() => {
    const value = this.systemParam();
    return value === 'apple' || value === 'notion' ? value : 'all';
  });

  protected readonly showApple = computed(
    () => this.activeSystem() === 'all' || this.activeSystem() === 'apple',
  );

  protected readonly showNotion = computed(
    () => this.activeSystem() === 'all' || this.activeSystem() === 'notion',
  );

  protected readonly appleColors = [
    { token: '--apple-color-primary', label: 'Action Blue', hex: '#0066cc' },
    { token: '--apple-color-primary-focus', label: 'Focus Blue', hex: '#0071e3' },
    { token: '--apple-color-primary-on-dark', label: 'Sky Link Blue', hex: '#2997ff' },
    { token: '--apple-color-ink', label: 'Near-Black Ink', hex: '#1d1d1f' },
    { token: '--apple-color-canvas', label: 'Pure White', hex: '#ffffff' },
    { token: '--apple-color-canvas-parchment', label: 'Parchment', hex: '#f5f5f7' },
    { token: '--apple-color-surface-tile-1', label: 'Tile 1', hex: '#272729' },
    { token: '--apple-color-surface-black', label: 'Pure Black', hex: '#000000' },
  ];

  protected readonly notionColors = [
    { token: '--notion-color-blue', label: 'Notion Blue', hex: '#0075de' },
    { token: '--notion-color-blue-active', label: 'Active Blue', hex: '#005bab' },
    { token: '--notion-color-blue-focus', label: 'Focus Blue', hex: '#097fe8' },
    { token: '--notion-color-canvas', label: 'Pure White', hex: '#ffffff' },
    { token: '--notion-color-warm-white', label: 'Warm White', hex: '#f6f5f4' },
    { token: '--notion-color-warm-dark', label: 'Warm Dark', hex: '#31302e' },
    { token: '--notion-color-text-muted', label: 'Warm Gray 500', hex: '#615d59' },
    { token: '--notion-color-text-subtle', label: 'Warm Gray 300', hex: '#a39e98' },
  ];
}
