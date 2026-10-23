import { DOCUMENT, afterNextRender, inject, Injector, Service } from '@angular/core';

@Service()
export class FocoService {
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  llevar(id: string): void {
    afterNextRender(() => this.document.getElementById(id)?.focus(), { injector: this.injector });
  }
}
