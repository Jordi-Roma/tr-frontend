import { DOCUMENT } from '@angular/common';
import { afterRenderEffect, Component, ElementRef, inject, input, OnDestroy, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-modal',
  styleUrl: './app-modal.component.css',
  templateUrl: './app-modal.component.html',
})
export class AppModalComponent implements OnDestroy {
  readonly open = input(false);
  readonly title = input('');
  readonly eyebrow = input('');
  readonly close = output<void>();
  private readonly document = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private returnFocus: HTMLElement | null = null;

  constructor() {
    afterRenderEffect(() => {
      const panel = this.panel()?.nativeElement;
      if (this.open() && panel) {
        if (!this.returnFocus) {
          this.returnFocus = this.document.activeElement as HTMLElement | null;
          (panel.querySelector<HTMLElement>('input, select, textarea, button') ?? panel).focus();
        }
      } else {
        this.restoreFocus();
      }
    });
  }

  protected teclado(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cerrar();
    } else if (event.key === 'Tab') {
      const elements = Array.from(this.panel()?.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
      ) ?? []).filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && this.document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && this.document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  ngOnDestroy(): void {
    this.restoreFocus();
  }

  private restoreFocus(): void {
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  protected cerrar(): void {
    this.close.emit();
  }
}
