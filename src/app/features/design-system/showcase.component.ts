import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { ThemeService } from '../../core/theme/theme.service';

interface SwatchToken {
  readonly token: string;
  readonly label: string;
  readonly hex: string;
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
    { token: '--background', label: 'Background', hex: '#f2f6fa' },
    { token: '--foreground', label: 'Foreground', hex: '#2e3b4e' },
    { token: '--card', label: 'Card', hex: '#ffffff' },
    { token: '--primary', label: 'Primary', hex: '#2d6cad' },
    { token: '--secondary', label: 'Secondary', hex: '#40bf73' },
    { token: '--success', label: 'Success', hex: '#40bf73' },
    { token: '--warning', label: 'Warning', hex: '#f59e0b' },
    { token: '--destructive', label: 'Destructive', hex: '#dc2626' },
    { token: '--devolutiva', label: 'Devolutiva', hex: '#49a070' },
    { token: '--muted', label: 'Muted', hex: '#eceff3' },
    { token: '--accent', label: 'Accent', hex: '#e0f2e8' },
    { token: '--border', label: 'Border', hex: '#dadfe6' },
  ];
}
