import { Service, signal } from '@angular/core';
import { Subject } from 'rxjs';

/** Invalidates requests and in-memory data belonging to the previous session. */
@Service()
export class CambioContextoService {
  private readonly cambios = new Subject<void>();
  readonly cambio$ = this.cambios.asObservable();
  readonly generacion = signal(0);

  invalidar(): void {
    this.generacion.update((valor) => valor + 1);
    this.cambios.next();
  }
}
