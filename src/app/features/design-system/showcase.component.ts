import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { ThemeService } from '../../core/theme/theme.service';

interface SwatchToken {
  readonly token: string;
  readonly label: string;
}

@Component({
  selector: 'sep-design-system-showcase',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './showcase.component.html',
  styleUrl: './showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseComponent {
  private readonly theme = inject(ThemeService);

  protected readonly isDark = this.theme.isDark;

  toggleTheme(): void {
    this.theme.toggle();
  }

  protected readonly colors: readonly SwatchToken[] = [
    { token: '--background', label: 'Background' },
    { token: '--foreground', label: 'Foreground' },
    { token: '--card', label: 'Card' },
    { token: '--primary', label: 'Primary' },
    { token: '--secondary', label: 'Secondary' },
    { token: '--success', label: 'Success' },
    { token: '--warning', label: 'Warning' },
    { token: '--destructive', label: 'Destructive' },
    { token: '--devolutiva', label: 'Devolutiva' },
    { token: '--muted', label: 'Muted' },
    { token: '--accent', label: 'Accent' },
    { token: '--border', label: 'Border' },
  ];
}
