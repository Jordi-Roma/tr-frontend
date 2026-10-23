import { computed, inject, Service, signal } from '@angular/core';
import { CambioContextoService } from './cambio-contexto.service';
import { EmpresaContextoService } from './empresa-contexto.service';

@Service()
export class EstadoPlanService {
  private readonly contexto = inject(EmpresaContextoService);
  private readonly vigente = signal<boolean | null>(null);
  private readonly aviso = signal('');
  readonly mensaje = this.aviso.asReadonly();
  readonly operacionesPermitidas = computed(
    () => this.vigente() ?? this.contexto.empresa()?.estado !== 'SUSPENDIDA',
  );

  constructor() {
    inject(CambioContextoService).cambio$.subscribe(() => {
      this.vigente.set(null);
      this.aviso.set('');
    });
  }

  aplicar(vigente: boolean): void {
    this.vigente.set(vigente);
  }
  restringir(): void {
    this.vigente.set(false);
  }
  notificar(mensaje: string): void {
    this.aviso.set(mensaje);
  }
  cerrarAviso(): void {
    this.aviso.set('');
  }
}
