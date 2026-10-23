import { DOCUMENT } from '@angular/common';
import {
  afterRenderEffect,
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-drawer',
  styleUrl: './app-drawer.component.css',
  templateUrl: './app-drawer.component.html',
})
export class AppDrawerComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly eyebrow = input('');
  readonly close = output<void>();
  private readonly document = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private anterior: HTMLElement | null = null;
  private panelActual: HTMLElement | null = null;

  constructor() {
    afterRenderEffect(() => {
      const panel = this.panel()?.nativeElement ?? null;
      if (panel === this.panelActual) return;
      if (panel) {
        this.anterior = this.document.activeElement as HTMLElement | null;
        panel.querySelector<HTMLElement>('button')?.focus();
      } else if (this.anterior?.isConnected) {
        this.anterior.focus();
      }
      this.panelActual = panel;
    });
  }

  protected teclado(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cerrar();
      return;
    }
    if (event.key !== 'Tab') return;
    const panel = this.panel()?.nativeElement;
    const controles = Array.from(
      panel?.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href], [tabindex]',
      ) ?? [],
    ).filter(
      (el) => el.tabIndex >= 0 && !el.hasAttribute('disabled') && el.getClientRects().length > 0,
    );
    const primero = controles[0];
    const ultimo = controles.at(-1);
    if (event.shiftKey && this.document.activeElement === primero) {
      event.preventDefault();
      ultimo?.focus();
    } else if (!event.shiftKey && this.document.activeElement === ultimo) {
      event.preventDefault();
      primero?.focus();
    }
  }

  protected cerrar(): void {
    this.close.emit();
  }
}
